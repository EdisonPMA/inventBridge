/**
 * AI.controller.js — OpenAI-powered endpoints for InventBridge.
 *
 * Endpoints (all require auth):
 *
 *  POST /api/ai/startup-recommendations
 *    Investor → ranked list of startups best matching their profile/history
 *
 *  POST /api/ai/investor-matches
 *    Startup owner → ranked list of investors likely to be interested
 *
 *  POST /api/ai/startup-analysis
 *    Analyse a startup's profile: strengths, weaknesses, risk score
 *
 *  POST /api/ai/explain-recommendation
 *    Explain why a specific startup is recommended to a specific investor
 *
 *  POST /api/ai/profile-suggestions
 *    Actionable suggestions to improve a startup or investor profile
 *
 *  POST /api/ai/startup-insights
 *    Platform-level ecosystem insights (admin/org) or startup-specific insights (inventor)
 *
 * Security:
 *  - requireAuth on every route
 *  - Role guards prevent cross-role abuse (e.g. inventor can't call investor endpoints)
 *  - All DB queries use parameterised statements
 *  - API key never leaves the server
 *  - Errors are sanitised before reaching the client
 */

const db       = require("../config/database");
const ai       = require("../services/aiService");

/* ── helpers ─────────────────────────────────────── */
async function q(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}
async function one(sql, params = []) {
  const [[row]] = await db.execute(sql, params);
  return row || null;
}

/** Fetch full startup row with relations */
async function getStartup(id) {
  return one(
    `SELECT s.*, c.name AS category_name,
            p.first_name AS owner_first_name, p.last_name AS owner_last_name
     FROM startups s
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN users u ON u.id = s.owner_id
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE s.id = ? LIMIT 1`,
    [id]
  );
}

/** Fetch investor profile with investment history */
async function getInvestorContext(userId) {
  const [profile, investments, saved] = await Promise.all([
    one("SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [userId]),
    q(`SELECT i.offered_amount, s.industry, s.stage, s.name AS startup_name
       FROM investments i
       JOIN startups s ON s.id = i.startup_id
       WHERE i.investor_id = ?
       ORDER BY i.created_at DESC LIMIT 20`, [userId]),
    q(`SELECT s.industry, s.name FROM saved_startups ss
       JOIN startups s ON s.id = ss.startup_id
       WHERE ss.user_id = ? LIMIT 20`, [userId]),
  ]);
  return { profile, investments, saved };
}

/** Discover published startups (max 20) for ranking prompts */
async function discoverStartups({ exclude_id, limit = 20 } = {}) {
  const cond = exclude_id ? "WHERE s.status = 'published' AND s.id != ?" : "WHERE s.status = 'published'";
  const params = exclude_id ? [exclude_id, limit] : [limit];
  return q(
    `SELECT s.id, s.name, s.slug, s.industry, s.stage,
            s.funding_required, s.equity_offered, s.country,
            s.description, s.verification_status, s.ai_score,
            c.name AS category_name
     FROM startups s
     LEFT JOIN categories c ON c.id = s.category_id
     ${cond}
     ORDER BY s.verification_status = 'verified' DESC, s.ai_score DESC
     LIMIT ?`,
    params
  );
}

/* ════════════════════════════════════════════════════
   1. POST /api/ai/startup-recommendations
   Investor → ranked startup recommendations
   ════════════════════════════════════════════════════ */
async function startupRecommendations(req, res) {
  try {
    if (req.user.role !== "investor") {
      return res.status(403).json({ message: "Only investors can request startup recommendations." });
    }

    const { limit = 5, exclude_ids = [] } = req.body;
    const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);

    const { profile, investments, saved } = await getInvestorContext(req.user.id);
    const startups = await discoverStartups({ limit: 20 });

    if (!startups.length) {
      return res.json({ recommendations: [], message: "No published startups available yet." });
    }

    const investorCtx = ai.investorContext({}, profile, investments, saved);
    const startupList = ai.startupListContext(startups);

    const systemPrompt = ai.SYSTEM.recommender;
    const userPrompt = `
INVESTOR PROFILE:
${investorCtx}

AVAILABLE STARTUPS (${startups.length} total):
${startupList}

TASK:
Rank the top ${safeLimit} startups for this investor. Respond ONLY with valid JSON matching this exact structure:
{
  "recommendations": [
    {
      "rank": 1,
      "startup_index": <1-based index from the list above>,
      "match_score": <0-100 integer>,
      "match_reason": "<2-3 sentence explanation>",
      "key_strengths": ["<strength 1>", "<strength 2>"],
      "potential_concerns": ["<concern 1>"]
    }
  ]
}`;

    const raw = await ai.chat(systemPrompt, userPrompt, { json: true, maxTokens: 1200 });
    const parsed = JSON.parse(raw);

    // Enrich with actual startup data from DB
    const recommendations = (parsed.recommendations || []).map(rec => {
      const idx = (rec.startup_index || 1) - 1;
      const s = startups[idx] || startups[0];
      return {
        rank:               rec.rank,
        match_score:        rec.match_score,
        match_reason:       rec.match_reason,
        key_strengths:      rec.key_strengths || [],
        potential_concerns: rec.potential_concerns || [],
        startup: {
          id:                  s.id,
          name:                s.name,
          slug:                s.slug,
          industry:            s.industry,
          stage:               s.stage,
          country:             s.country,
          funding_required:    Number(s.funding_required),
          equity_offered:      Number(s.equity_offered),
          verification_status: s.verification_status,
          ai_score:            s.ai_score,
          category_name:       s.category_name,
        },
      };
    });

    return res.json({ recommendations });
  } catch (err) {
    console.error("[AI] startupRecommendations:", err.message);
    return res.status(err.message.includes("not configured") ? 503 : 500)
      .json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════════
   2. POST /api/ai/investor-matches
   Startup owner → ranked investor matches
   ════════════════════════════════════════════════════ */
async function investorMatches(req, res) {
  try {
    if (!["inventor", "admin"].includes(req.user.role)) {
      return res.status(403).json({ message: "Only startup founders can request investor matches." });
    }

    const { startup_id, limit = 5 } = req.body;
    if (!startup_id) return res.status(400).json({ message: "startup_id is required." });

    const startup = await getStartup(startup_id);
    if (!startup) return res.status(404).json({ message: "Startup not found." });
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized to analyse this startup." });
    }

    const safeLimit = Math.min(Math.max(parseInt(limit) || 5, 1), 10);

    // Fetch active investors + their investment history
    const investors = await q(
      `SELECT u.id, p.first_name, p.last_name, p.headline, p.bio, p.country,
              p.verification_level,
              COUNT(i.id) AS investment_count,
              GROUP_CONCAT(DISTINCT s2.industry ORDER BY s2.industry SEPARATOR ', ') AS industries_invested
       FROM users u
       LEFT JOIN profiles p ON p.user_id = u.id
       LEFT JOIN investments i ON i.investor_id = u.id AND i.status NOT IN ('cancelled','rejected')
       LEFT JOIN startups s2 ON s2.id = i.startup_id
       WHERE u.role = 'investor' AND u.status = 'active'
       GROUP BY u.id
       ORDER BY investment_count DESC
       LIMIT 20`
    );

    if (!investors.length) {
      return res.json({ matches: [], message: "No active investors found." });
    }

    const startupCtx  = ai.startupContext(startup);
    const investorList = investors.map((inv, i) => {
      const name = `${inv.first_name || ""} ${inv.last_name || ""}`.trim() || "Investor";
      return `[${i + 1}] ${name} | ${inv.country || "?"} | ${inv.headline || "Investor"} | ` +
        `Investments: ${inv.investment_count || 0} | Industries: ${inv.industries_invested || "N/A"}`;
    }).join("\n");

    const systemPrompt = ai.SYSTEM.recommender;
    const userPrompt = `
STARTUP PROFILE:
${startupCtx}

AVAILABLE INVESTORS (${investors.length} total):
${investorList}

TASK:
Rank the top ${safeLimit} investors most likely to be interested in this startup. Respond ONLY with valid JSON:
{
  "matches": [
    {
      "rank": 1,
      "investor_index": <1-based index>,
      "match_score": <0-100 integer>,
      "match_reason": "<2-3 sentence explanation>",
      "suggested_approach": "<how the founder should approach this investor>"
    }
  ]
}`;

    const raw = await ai.chat(systemPrompt, userPrompt, { json: true, maxTokens: 1200 });
    const parsed = JSON.parse(raw);

    const matches = (parsed.matches || []).map(m => {
      const idx = (m.investor_index || 1) - 1;
      const inv = investors[idx] || investors[0];
      return {
        rank:               m.rank,
        match_score:        m.match_score,
        match_reason:       m.match_reason,
        suggested_approach: m.suggested_approach,
        investor: {
          id:                 inv.id,
          name:               `${inv.first_name || ""} ${inv.last_name || ""}`.trim(),
          country:            inv.country,
          headline:           inv.headline,
          verification_level: inv.verification_level,
          investment_count:   Number(inv.investment_count),
        },
      };
    });

    return res.json({ matches });
  } catch (err) {
    console.error("[AI] investorMatches:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════════
   3. POST /api/ai/startup-analysis
   Deep analysis of a startup profile
   ════════════════════════════════════════════════════ */
async function startupAnalysis(req, res) {
  try {
    const { startup_id } = req.body;
    if (!startup_id) return res.status(400).json({ message: "startup_id is required." });

    const startup = await getStartup(startup_id);
    if (!startup) return res.status(404).json({ message: "Startup not found." });

    // Anyone can analyse a published startup; unpublished = owner or admin only
    if (startup.status !== "published") {
      if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized to analyse this startup." });
      }
    }

    // Fetch additional signals
    const [investCount, followerCount, saveCount] = await Promise.all([
      one("SELECT COUNT(*) AS c FROM investments WHERE startup_id = ? AND status NOT IN ('cancelled','rejected')", [startup_id]),
      one("SELECT COUNT(*) AS c FROM startup_followers WHERE startup_id = ?", [startup_id]),
      one("SELECT COUNT(*) AS c FROM saved_startups WHERE startup_id = ?", [startup_id]),
    ]);

    const startupCtx = ai.startupContext(startup);

    const systemPrompt = ai.SYSTEM.analyst;
    const userPrompt = `
STARTUP PROFILE:
${startupCtx}

PLATFORM SIGNALS:
- Investment offers received: ${investCount?.c || 0}
- Followers: ${followerCount?.c || 0}
- Saves by investors: ${saveCount?.c || 0}

TASK:
Analyse this startup thoroughly. Respond ONLY with valid JSON:
{
  "overall_score": <0-100 integer>,
  "investment_readiness": <0-100 integer>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>"],
  "opportunities": ["<opportunity 1>", "<opportunity 2>"],
  "risks": ["<risk 1>", "<risk 2>"],
  "verdict": "<2-3 sentence overall assessment>",
  "recommended_next_steps": ["<step 1>", "<step 2>", "<step 3>"]
}`;

    const raw    = await ai.chat(systemPrompt, userPrompt, { json: true, maxTokens: 1000 });
    const analysis = JSON.parse(raw);

    return res.json({
      startup_id: Number(startup_id),
      startup_name: startup.name,
      analysis,
    });
  } catch (err) {
    console.error("[AI] startupAnalysis:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════════
   4. POST /api/ai/explain-recommendation
   Why is THIS startup recommended to THIS investor?
   ════════════════════════════════════════════════════ */
async function explainRecommendation(req, res) {
  try {
    const { startup_id, investor_id } = req.body;
    if (!startup_id) return res.status(400).json({ message: "startup_id is required." });

    // caller can be the investor themselves or an admin
    const targetInvestorId = investor_id || req.user.id;
    if (req.user.role !== "admin" && req.user.id !== targetInvestorId) {
      return res.status(403).json({ message: "Not authorized." });
    }

    const [startup, { profile, investments, saved }] = await Promise.all([
      getStartup(startup_id),
      getInvestorContext(targetInvestorId),
    ]);

    if (!startup) return res.status(404).json({ message: "Startup not found." });

    const startupCtx  = ai.startupContext(startup);
    const investorCtx = ai.investorContext({}, profile, investments, saved);

    const systemPrompt = ai.SYSTEM.recommender;
    const userPrompt = `
INVESTOR PROFILE:
${investorCtx}

STARTUP PROFILE:
${startupCtx}

TASK:
Explain in detail why this startup is (or isn't) a good match for this investor. Respond ONLY with valid JSON:
{
  "match_score": <0-100 integer>,
  "headline": "<one-line match summary>",
  "why_good_fit": ["<reason 1>", "<reason 2>", "<reason 3>"],
  "potential_concerns": ["<concern 1>", "<concern 2>"],
  "alignment_breakdown": {
    "industry": <0-10>,
    "stage": <0-10>,
    "funding_size": <0-10>,
    "geography": <0-10>,
    "business_model": <0-10>
  },
  "recommendation": "invest" | "watch" | "pass"
}`;

    const raw  = await ai.chat(systemPrompt, userPrompt, { json: true, maxTokens: 900 });
    const explanation = JSON.parse(raw);

    return res.json({
      startup_id:  Number(startup_id),
      investor_id: targetInvestorId,
      startup_name: startup.name,
      explanation,
    });
  } catch (err) {
    console.error("[AI] explainRecommendation:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════════
   5. POST /api/ai/profile-suggestions
   Actionable improvements for a startup or investor profile
   ════════════════════════════════════════════════════ */
async function profileSuggestions(req, res) {
  try {
    const { startup_id } = req.body;

    let contextStr, subjectType, subjectName;

    if (startup_id) {
      // Startup profile improvement
      const startup = await getStartup(startup_id);
      if (!startup) return res.status(404).json({ message: "Startup not found." });
      if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ message: "Not authorized." });
      }
      contextStr  = ai.startupContext(startup);
      subjectType = "startup";
      subjectName = startup.name;
    } else {
      // Investor / user profile improvement
      const { profile, investments, saved } = await getInvestorContext(req.user.id);
      contextStr  = ai.investorContext({}, profile, investments, saved);
      subjectType = req.user.role;
      subjectName = profile ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() : "User";
    }

    const systemPrompt = ai.SYSTEM.analyst;
    const userPrompt = `
${subjectType.toUpperCase()} PROFILE:
${contextStr}

TASK:
Identify specific gaps and provide actionable improvement suggestions to make this ${subjectType} profile more attractive on the InventBridge platform.
Respond ONLY with valid JSON:
{
  "profile_completeness": <0-100 integer>,
  "priority_improvements": [
    {
      "field": "<field name>",
      "issue": "<what's missing or weak>",
      "suggestion": "<specific action to take>",
      "impact": "high" | "medium" | "low"
    }
  ],
  "quick_wins": ["<quick action 1>", "<quick action 2>"],
  "estimated_score_increase": <0-30 integer estimate>
}`;

    const raw = await ai.chat(systemPrompt, userPrompt, { json: true, maxTokens: 900 });
    const suggestions = JSON.parse(raw);

    return res.json({
      subject_type: subjectType,
      subject_name: subjectName,
      suggestions,
    });
  } catch (err) {
    console.error("[AI] profileSuggestions:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════════
   6. POST /api/ai/startup-insights
   Ecosystem insights (admin/org) or single-startup insights (inventor)
   ════════════════════════════════════════════════════ */
async function startupInsights(req, res) {
  try {
    const { startup_id } = req.body;
    const role = req.user.role;

    let contextStr, insightScope;

    if (startup_id) {
      // Single startup insights — owner or admin
      const startup = await getStartup(startup_id);
      if (!startup) return res.status(404).json({ message: "Startup not found." });
      if (startup.owner_id !== req.user.id && !["admin", "organization"].includes(role)) {
        return res.status(403).json({ message: "Not authorized." });
      }

      const [invOffers, followers, views] = await Promise.all([
        one("SELECT COUNT(*) AS c FROM investments WHERE startup_id = ?", [startup_id]),
        one("SELECT COUNT(*) AS c FROM startup_followers WHERE startup_id = ?", [startup_id]),
        one("SELECT COALESCE(SUM(view_count), 0) AS c FROM startup_views WHERE startup_id = ?", [startup_id]).catch(() => ({ c: 0 })),
      ]);

      contextStr = `${ai.startupContext(startup)}\n\nPlatform data:\n- Investment offers: ${invOffers?.c || 0}\n- Followers: ${followers?.c || 0}\n- Total views: ${views?.c || 0}`;
      insightScope = "startup";

    } else if (["admin", "organization"].includes(role)) {
      // Platform-level ecosystem insights
      const [totals, topIndustries, stageBreakdown, recentActivity] = await Promise.all([
        one(`SELECT
          (SELECT COUNT(*) FROM startups WHERE status='published') AS published_startups,
          (SELECT COUNT(*) FROM investments WHERE status NOT IN ('cancelled','rejected')) AS active_investments,
          (SELECT COUNT(*) FROM users WHERE role='investor' AND status='active') AS active_investors,
          (SELECT COALESCE(SUM(offered_amount),0) FROM investments WHERE status IN ('accepted','finalized','completed')) AS total_funded`),
        q(`SELECT industry, COUNT(*) AS count FROM startups WHERE status='published' AND industry IS NOT NULL
           GROUP BY industry ORDER BY count DESC LIMIT 5`),
        q(`SELECT stage, COUNT(*) AS count FROM startups WHERE status='published' AND stage IS NOT NULL
           GROUP BY stage ORDER BY count DESC`),
        q(`SELECT DATE_FORMAT(created_at,'%Y-%m') AS month, COUNT(*) AS startups
           FROM startups WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
           GROUP BY month ORDER BY month ASC`),
      ]);

      contextStr = `
PLATFORM OVERVIEW:
- Published startups: ${totals?.published_startups || 0}
- Active investment offers: ${totals?.active_investments || 0}
- Active investors: ${totals?.active_investors || 0}
- Total funding facilitated: $${Number(totals?.total_funded || 0).toLocaleString()}

TOP INDUSTRIES: ${topIndustries.map(r => `${r.industry}(${r.count})`).join(", ")}
STAGE BREAKDOWN: ${stageBreakdown.map(r => `${r.stage}:${r.count}`).join(", ")}
RECENT GROWTH (last 6 months): ${recentActivity.map(r => `${r.month}:${r.startups}`).join(", ")}`;
      insightScope = "platform";
    } else {
      return res.status(403).json({ message: "Provide a startup_id to get startup-specific insights." });
    }

    const systemPrompt = ai.SYSTEM.insights;
    const userPrompt = `
DATA:
${contextStr}

TASK:
Generate ${insightScope === "platform" ? "ecosystem-level" : "actionable"} insights. Respond ONLY with valid JSON:
{
  "summary": "<2-3 sentence high-level insight>",
  "key_findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "trends": ["<trend 1>", "<trend 2>"],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
  "risk_flags": ["<flag 1>"] 
}`;

    const raw = await ai.chat(systemPrompt, userPrompt, { json: true, maxTokens: 900 });
    const insights = JSON.parse(raw);

    return res.json({ scope: insightScope, insights });
  } catch (err) {
    console.error("[AI] startupInsights:", err.message);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  startupRecommendations,
  investorMatches,
  startupAnalysis,
  explainRecommendation,
  profileSuggestions,
  startupInsights,
};
