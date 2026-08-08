/**
 * Dashboard aggregator controller
 * Each handler runs parallel queries and returns a single response
 * shaped exactly as the frontend dashboards expect.
 */
const db = require("../config/database");
const StartupView = require("../models/StartupView.model");

/* ── helpers ─────────────────────────────────────── */
async function q(sql, params = []) {
  const [rows] = await db.execute(sql, params);
  return rows;
}
async function one(sql, params = []) {
  const [[row]] = await db.execute(sql, params);
  return row;
}

/* ════════════════════════════════════════════════
   GET /api/dashboard/inventor
   ════════════════════════════════════════════════ */
async function inventorDashboard(req, res) {
  try {
    const userId = req.user.id;

    const [
      myStartups,
      investmentInterests,
      connectionCount,
      recentInvestors,
      pendingTasks,
    ] = await Promise.all([
      // All my startups — with offer count and follower count
      q(
        `SELECT s.id, s.name, s.slug, s.industry, s.stage,
                s.funding_required, s.country, s.verification_status,
                s.status, s.ai_score, s.description,
                c.name AS category_name,
                (SELECT sf.cloud_url FROM startup_files sf
                 WHERE sf.startup_id = s.id AND sf.file_type = 'logo' LIMIT 1) AS logo,
                (SELECT COUNT(*) FROM investments i
                 WHERE i.startup_id = s.id AND i.status NOT IN ('cancelled','rejected')) AS offer_count,
                (SELECT COUNT(*) FROM startup_followers sf2
                 WHERE sf2.startup_id = s.id) AS follower_count
         FROM startups s
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.owner_id = ?
         ORDER BY s.created_at DESC`,
        [userId]
      ),
      // Investment interests (pending offers on my startups)
      q(
        `SELECT i.id, i.offered_amount, i.equity_percentage, i.status,
                i.created_at, s.name AS startup_name,
                p.first_name AS investor_first, p.last_name AS investor_last,
                p.profile_photo AS investor_photo,
                pr.verification_level
         FROM investments i
         JOIN startups s ON s.id = i.startup_id
         JOIN users u ON u.id = i.investor_id
         LEFT JOIN profiles p ON p.user_id = i.investor_id
         LEFT JOIN profiles pr ON pr.user_id = i.investor_id
         WHERE s.owner_id = ?
         ORDER BY i.created_at DESC
         LIMIT 10`,
        [userId]
      ),
      // Connection count
      one(
        `SELECT COUNT(*) AS total FROM connections
         WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
        [userId, userId]
      ),
      // Recent investors who viewed (using connections as proxy)
      q(
        `SELECT DISTINCT u.id, p.first_name, p.last_name, p.profile_photo,
                u.role, p.headline, p.verification_level
         FROM connections c
         JOIN users u ON u.id = CASE WHEN c.sender_id = ? THEN c.receiver_id ELSE c.sender_id END
         LEFT JOIN profiles p ON p.user_id = u.id
         WHERE (c.sender_id = ? OR c.receiver_id = ?)
           AND u.role = 'investor'
         LIMIT 5`,
        [userId, userId, userId]
      ),
      // Pending tasks
      q(
        `SELECT vr.id, vr.verification_type, vr.status, vr.created_at
         FROM verification_requests vr
         WHERE vr.user_id = ?
         ORDER BY vr.created_at DESC
         LIMIT 5`,
        [userId]
      ),
    ]);

    // Stats — real views from startup_views table
    const startupIds = myStartups.map((s) => s.id);
    const [totalViews, viewsChart] = await Promise.all([
      StartupView.totalViewsForOwner(startupIds),
      StartupView.weeklyChart(startupIds),
    ]);

    const startup = myStartups[0] || null;
    const totalFunded = startup
      ? (await one(
          `SELECT COALESCE(SUM(offered_amount),0) AS total
           FROM investments WHERE startup_id = ? AND status='completed'`,
          [startup.id]
        ))
      : { total: 0 };
    const goalAmount = startup ? Number(startup.funding_required) : 0;
    const funded = Number(totalFunded.total);
    const fundingProgress = goalAmount > 0 ? Math.min(100, Math.round((funded / goalAmount) * 100)) : 0;

    // Views this week for the chart label
    const viewsThisWeek = viewsChart.reduce((s, d) => s + d.views, 0);

    return res.json({
      stats: {
        views:           totalViews,
        viewsThisWeek,
        interests:       investmentInterests.length,
        fundingProgress,
        connections:     connectionCount.total,
      },
      viewsChart,
      startup: startup
        ? {
            id: startup.id,
            name: startup.name,
            slug: startup.slug,
            industry: startup.industry || startup.category_name,
            stage: startup.stage,
            fundingRequired: Number(startup.funding_required),
            country: startup.country,
            verificationStatus: startup.verification_status,
            description: startup.description,
            logo: startup.logo,
          }
        : null,
      investorActivity: recentInvestors.map((u) => ({
        id: u.id,
        name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Investor",
        role: u.headline || "Investor",
        action: "Connected with you",
        time: "recently",
        avatar: `${(u.first_name || "I").charAt(0)}${(u.last_name || "").charAt(0)}`.toUpperCase(),
        verified: u.verification_level === "verified",
        photo: u.profile_photo,
      })),
      investmentInterests: investmentInterests.map((i) => ({
        id: i.id,
        investorName: `${i.investor_first || ""} ${i.investor_last || ""}`.trim() || "Investor",
        photo: i.investor_photo,
        offeredAmount: Number(i.offered_amount),
        equity: Number(i.equity_percentage),
        status: i.status,
        startupName: i.startup_name,
        date: i.created_at,
      })),
      myStartups,
      pendingTasks,
    });
  } catch (err) {
    console.error("inventorDashboard error:", err);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════
   GET /api/dashboard/investor
   ════════════════════════════════════════════════ */
async function investorDashboard(req, res) {
  try {
    const userId = req.user.id;

    // ── Step 1: Discover investor's industry preferences ──────────────────
    // Pull category_ids and industries from: saved startups + followed startups + past investments
    // Use these to BOOST matching startups in recommendations
    const interestRows = await q(
      `SELECT s.category_id, s.industry
       FROM startups s
       WHERE s.id IN (
         SELECT startup_id FROM saved_startups  WHERE user_id = ?
         UNION
         SELECT startup_id FROM startup_followers WHERE user_id = ?
         UNION
         SELECT startup_id FROM investments WHERE investor_id = ?
       )
       AND s.category_id IS NOT NULL`,
      [userId, userId, userId]
    );

    // Build preferred category_ids and industries (deduplicated)
    const preferredCategories = [...new Set(interestRows.map(r => r.category_id).filter(Boolean))];
    const preferredIndustries = [...new Set(interestRows.map(r => r.industry).filter(Boolean))];

    // ── Step 2: Parallel queries ──────────────────────────────────────────
    const [
      savedCount,
      myInvestments,
      connectionCount,
      followingCount,
      unreadNotifications,
      unreadMessages,
      pendingRequests,
      categories,
    ] = await Promise.all([
      one("SELECT COUNT(*) AS total FROM saved_startups WHERE user_id = ?",   [userId]),
      q(
        `SELECT i.id, i.offered_amount, i.equity_percentage, i.status,
                i.created_at, i.updated_at,
                s.name AS startup_name, s.slug, s.industry, s.stage
         FROM investments i
         JOIN startups s ON s.id = i.startup_id
         WHERE i.investor_id = ?
         ORDER BY i.updated_at DESC`,
        [userId]
      ),
      one(
        `SELECT COUNT(*) AS total FROM connections
         WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
        [userId, userId]
      ),
      one("SELECT COUNT(*) AS total FROM startup_followers WHERE user_id = ?", [userId]),
      one("SELECT COUNT(*) AS total FROM notifications WHERE user_id = ? AND is_read = FALSE", [userId]),
      one(
        `SELECT COUNT(*) AS total FROM messages m
         JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
         WHERE cp.user_id = ? AND m.sender_id != ? AND m.is_read = FALSE`,
        [userId, userId]
      ),
      one(
        `SELECT COUNT(*) AS total FROM connections WHERE receiver_id = ? AND status = 'pending'`,
        [userId]
      ),
      // Active categories from DB — drives the filter chips on the frontend
      q("SELECT id, name, icon FROM categories WHERE status = 'active' ORDER BY name ASC"),
    ]);

    // ── Step 3: Personalized recommendations ─────────────────────────────
    // LEFT JOIN IS NULL replaces NOT IN for performance on large tables.
    // Personalization: startups matching preferred categories/industries
    // float to the top via a CASE score column.
    const catPlaceholders = preferredCategories.length
      ? preferredCategories.map(() => "?").join(",")
      : "NULL";
    const indPlaceholders = preferredIndustries.length
      ? preferredIndustries.map(() => "?").join(",")
      : "NULL";

    const recParams = [
      ...preferredCategories,    // for CASE category_id IN (...)
      ...preferredIndustries,    // for CASE industry IN (...)
      userId,                    // LEFT JOIN exclusion
    ];

    const recommendedStartups = await q(
      `SELECT s.id, s.name, s.slug, s.industry, s.stage,
              s.funding_required, s.equity_offered, s.country,
              s.verification_status, s.description, s.owner_id,
              s.logo_url, s.ai_score,
              c.name AS category_name,
              (SELECT sf.cloud_url FROM startup_files sf
               WHERE sf.startup_id = s.id AND sf.file_type = 'logo' LIMIT 1) AS logo_file_url,
              p.first_name AS owner_first, p.last_name AS owner_last,
              p.profile_photo AS owner_photo,
              -- Personalization boost: 3 pts category match, 2 pts industry match
              (
                CASE WHEN s.category_id IN (${catPlaceholders}) THEN 3 ELSE 0 END +
                CASE WHEN s.industry    IN (${indPlaceholders}) THEN 2 ELSE 0 END
              ) AS interest_score
       FROM startups s
       LEFT JOIN categories c ON c.id = s.category_id
       LEFT JOIN profiles p ON p.user_id = s.owner_id
       -- Exclude startups already invested in (LEFT JOIN IS NULL — much faster than NOT IN)
       LEFT JOIN investments inv_excl
         ON inv_excl.startup_id = s.id AND inv_excl.investor_id = ?
       WHERE s.status = 'published'
         AND inv_excl.id IS NULL
       ORDER BY
         interest_score DESC,
         s.verification_status = 'verified' DESC,
         s.ai_score DESC,
         s.created_at DESC
       LIMIT 16`,
      recParams
    );

    // ── Step 4: Assemble response ─────────────────────────────────────────
    const activeInvestments = myInvestments.filter(i => ["accepted","negotiating"].includes(i.status));
    const pendingOffers     = myInvestments.filter(i => i.status === "pending");

    const portfolioRows = await q(
      `SELECT DATE_FORMAT(created_at, '%b') AS label,
              SUM(offered_amount) AS value
       FROM investments
       WHERE investor_id = ? AND status IN ('accepted','completed')
       GROUP BY MONTH(created_at), label
       ORDER BY MONTH(created_at) ASC
       LIMIT 12`,
      [userId]
    );

    return res.json({
      stats: {
        savedStartups:       savedCount.total,
        activeInvestments:   activeInvestments.length,
        pendingOffers:       pendingOffers.length,
        connections:         connectionCount.total,
        following:           followingCount.total,
        unreadNotifications: unreadNotifications.total,
        unreadMessages:      unreadMessages.total,
        pendingRequests:     pendingRequests.total,
      },
      // categories: active list from DB for filter chips
      categories: categories.map(c => ({ id: c.id, name: c.name, icon: c.icon })),
      recommended: recommendedStartups.map(s => ({
        id:                 s.id,
        name:               s.name,
        slug:               s.slug,
        industry:           s.industry || s.category_name,
        category_name:      s.category_name,
        stage:              s.stage,
        fundingRequired:    Number(s.funding_required),
        equityOffered:      Number(s.equity_offered),
        country:            s.country,
        verificationStatus: s.verification_status,
        description:        s.description,
        logo:               s.logo_file_url || s.logo_url,
        owner_id:           s.owner_id,
        founderName:        `${s.owner_first || ""} ${s.owner_last || ""}`.trim() || null,
        founderPhoto:       s.owner_photo || null,
        aiScore:            Number(s.ai_score),
        isPersonalized:     Number(s.interest_score) > 0,
      })),
      investments: myInvestments.map(i => ({
        id:      i.id,
        startup: i.startup_name,
        slug:    i.slug,
        amount:  Number(i.offered_amount),
        equity:  Number(i.equity_percentage),
        status:  i.status,
        date:    i.created_at,
      })),
      portfolioData: portfolioRows.map(r => ({
        label: r.label,
        value: Number(r.value),
      })),
    });
  } catch (err) {
    console.error("investorDashboard error:", err);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════
   GET /api/dashboard/organization
   ════════════════════════════════════════════════ */
async function organizationDashboard(req, res) {
  try {
    const userId = req.user.id;

    const [
      verReqs,
      connectionCount,
      recentStartups,
    ] = await Promise.all([
      q(
        `SELECT vr.id, vr.verification_type, vr.status, vr.created_at,
                p.first_name, p.last_name, u.email,
                s.name AS startup_name, s.industry, s.stage
         FROM verification_requests vr
         JOIN users u ON u.id = vr.user_id
         LEFT JOIN profiles p ON p.user_id = vr.user_id
         LEFT JOIN startups s ON s.id = vr.startup_id
         ORDER BY vr.created_at DESC
         LIMIT 20`,
        []
      ),
      one(
        `SELECT COUNT(*) AS total FROM connections
         WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
        [userId, userId]
      ),
      q(
        `SELECT s.id, s.name, s.slug, s.industry, s.stage,
                s.verification_status, s.status, s.created_at,
                c.name AS category_name
         FROM startups s
         LEFT JOIN categories c ON c.id = s.category_id
         WHERE s.status = 'published'
         ORDER BY s.created_at DESC
         LIMIT 10`,
        []
      ),
    ]);

    const approved  = verReqs.filter((v) => v.status === "approved");
    const pending   = verReqs.filter((v) => v.status === "pending");
    const totalStartups = await one("SELECT COUNT(*) AS total FROM startups WHERE status = 'published'");
    const totalFunded   = await one("SELECT COALESCE(SUM(offered_amount),0) AS total FROM investments WHERE status = 'completed'");

    // Quarter growth data
    const qData = await q(
      `SELECT QUARTER(created_at) AS q, COUNT(*) AS value
       FROM startups
       WHERE YEAR(created_at) = YEAR(CURDATE()) AND status != 'draft'
       GROUP BY q
       ORDER BY q ASC`
    );

    const qLabels = ["Q1", "Q2", "Q3", "Q4"];
    const impactData = qLabels.map((label, i) => {
      const row = qData.find((r) => Number(r.q) === i + 1);
      return { label, value: row ? Number(row.value) : 0 };
    });

    return res.json({
      stats: {
        programs: 0,            // no programs table yet — placeholder
        applications: pending.length,
        approved: approved.length,
        mentorshipRequests: connectionCount.total,
      },
      applications: verReqs.slice(0, 10).map((v) => ({
        id: v.id,
        name: v.startup_name || `${v.first_name || ""} ${v.last_name || ""}`.trim(),
        industry: v.industry || v.verification_type,
        applied: new Date(v.created_at).toLocaleDateString(),
        status: v.status,
      })),
      recentStartups: recentStartups.map((s) => ({
        id: s.id,
        name: s.name,
        slug: s.slug,
        industry: s.industry || s.category_name,
        stage: s.stage,
        verificationStatus: s.verification_status,
      })),
      impactData,
      reports: {
        startupsInAcceleration: totalStartups.total,
        jobsCreated: 0,
        totalFundingFacilitated: Number(totalFunded.total),
      },
    });
  } catch (err) {
    console.error("organizationDashboard error:", err);
    return res.status(500).json({ message: err.message });
  }
}

/* ════════════════════════════════════════════════
   GET /api/dashboard/admin
   ════════════════════════════════════════════════ */
async function adminDashboard(req, res) {
  try {
    const [
      totalUsers,
      totalStartups,
      verifiedInvestors,
      pendingVerifications,
      verifications,
      users,
      growthData,
    ] = await Promise.all([
      one("SELECT COUNT(*) AS total FROM users WHERE status = 'active'"),
      one("SELECT COUNT(*) AS total FROM startups WHERE status != 'draft'"),
      one(
        `SELECT COUNT(*) AS total FROM users u
         JOIN profiles p ON p.user_id = u.id
         WHERE u.role = 'investor' AND p.verification_level = 'verified'`
      ),
      one("SELECT COUNT(*) AS total FROM verification_requests WHERE status = 'pending'"),
      // Pending verification requests with user/startup info
      q(
        `SELECT vr.id, vr.verification_type AS type, vr.status, vr.created_at AS submitted,
                COALESCE(s.name, CONCAT(p.first_name,' ',p.last_name)) AS name,
                u.role AS user_role
         FROM verification_requests vr
         JOIN users u ON u.id = vr.user_id
         LEFT JOIN profiles p ON p.user_id = vr.user_id
         LEFT JOIN startups s ON s.id = vr.startup_id
         WHERE vr.status IN ('pending','under_review')
         ORDER BY vr.created_at DESC
         LIMIT 15`
      ),
      // Recent users
      q(
        `SELECT u.id, u.email, u.role, u.status, u.created_at AS joined,
                p.first_name, p.last_name
         FROM users u
         LEFT JOIN profiles p ON p.user_id = u.id
         ORDER BY u.created_at DESC
         LIMIT 20`
      ),
      // Monthly startup registrations for growth chart
      q(
        `SELECT DATE_FORMAT(created_at, '%b') AS label, COUNT(*) AS value
         FROM startups
         WHERE YEAR(created_at) = YEAR(CURDATE())
         GROUP BY MONTH(created_at), label
         ORDER BY MONTH(created_at) ASC`
      ),
    ]);

    return res.json({
      stats: {
        totalUsers: totalUsers.total,
        startups: totalStartups.total,
        verifiedInvestors: verifiedInvestors.total,
        pendingVerification: pendingVerifications.total,
      },
      verifications: verifications.map((v) => ({
        id: v.id,
        name: (v.name || "").trim() || "Unknown",
        type: v.user_role
          ? v.user_role.charAt(0).toUpperCase() + v.user_role.slice(1)
          : v.type,
        submitted: new Date(v.submitted).toISOString().split("T")[0],
        status: v.status,
      })),
      users: users.map((u) => ({
        id: u.id,
        name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
        email: u.email,
        role: u.role,
        status: u.status,
        joined: new Date(u.joined).toISOString().split("T")[0],
      })),
      growthData: growthData.map((r) => ({
        label: r.label,
        value: Number(r.value),
      })),
    });
  } catch (err) {
    console.error("adminDashboard error:", err);
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  inventorDashboard,
  investorDashboard,
  organizationDashboard,
  adminDashboard,
};
