/**
 * Global search â€” enhanced multi-strategy matching.
 *
 * Strategy:
 *  1â€“3 chars  â†’ pure LIKE %q% across key fields (MySQL ft_min_word_len default = 4,
 *               so FULLTEXT won't index short words â€” LIKE handles everything short)
 *  4+ chars   â†’ FULLTEXT prefix wildcard (boolean mode +word*) UNION LIKE %q% infix
 *               FULLTEXT hits ranked higher; LIKE catches mid-word matches
 *  Multi-word â†’ Each word becomes +term* boolean FULLTEXT AND; also LIKE on full phrase
 *
 * Examples:
 *   "a"         â†’ matches AgriTech, AI, Analystâ€¦
 *   "agr"       â†’ LIKE %agr% â†’ AgriTech, Agricultureâ€¦
 *   "agri"      â†’ FULLTEXT +agri* âˆª LIKE %agri%
 *   "gritech"   â†’ LIKE %gritech%
 *   "agri tech" â†’ FULLTEXT +agri* +tech* âˆª LIKE %agri tech%
 *
 * GET /api/search?q=&type=&stage=&country=&limit=
 */
const db = require("../config/database");

const SAFE_LIMIT = (v) => Math.min(Math.max(parseInt(v) || 8, 1), 30);

/** Build boolean mode query string: "agri tech" â†’ "+agri* +tech*" */
function buildBooleanQuery(q) {
  return q.trim().split(/\s+/).filter(Boolean).map(w => `+${w}*`).join(" ");
}

/** Merge arrays by id, first array wins (higher relevance) */
function mergeById(a, b) {
  const seen = new Set(a.map(r => r.id));
  return [...a, ...b.filter(r => !seen.has(r.id))];
}

/* â”€â”€ Startup search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function searchStartups(q, { stage, country, limit }) {
  const base   = ["s.status = 'published'"];
  const bParams = [];
  if (stage)   { base.push("s.stage = ?");   bParams.push(stage); }
  if (country) { base.push("s.country = ?"); bParams.push(country); }

  const pct    = `%${q}%`;
  const boolQ  = buildBooleanQuery(q);
  // Only use FULLTEXT for 4+ char words (MySQL default ft_min_word_len = 4)
  const useFT  = q.length >= 4 || q.split(/\s+/).some(w => w.length >= 4);

  const SEL = `SELECT s.id, s.name, s.slug, s.industry, s.stage,
         s.country, s.verification_status, s.funding_required, s.logo_url,
         c.name AS category_name,
         p.first_name AS owner_first_name, p.last_name AS owner_last_name`;

  const JN = `FROM startups s
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN users u ON u.id = s.owner_id
    LEFT JOIN profiles p ON p.user_id = u.id`;

  const WHERE_BASE = base.join(" AND ");

  // LIKE covers: name, industry, description, stage, country, mission, problem
  const LIKE_COND = `(s.name LIKE ? OR s.industry LIKE ? OR s.description LIKE ?
    OR s.stage LIKE ? OR s.country LIKE ? OR s.mission LIKE ? OR s.problem LIKE ?)`;
  const LIKE_PARAMS = [pct, pct, pct, pct, pct, pct, pct];

  let rows;

  if (useFT) {
    const FT_COL = `s.name, s.description, s.industry, s.problem, s.solution, s.mission, s.vision, s.business_model`;
    const [ftRows] = await db.execute(
      `${SEL}, MATCH(${FT_COL}) AGAINST(? IN BOOLEAN MODE) AS _score
       ${JN}
       WHERE ${WHERE_BASE}
         AND MATCH(${FT_COL}) AGAINST(? IN BOOLEAN MODE) > 0
       ORDER BY _score DESC, s.verification_status = 'verified' DESC
       LIMIT ?`,
      [boolQ, boolQ, ...bParams, limit]
    ).catch(() => [[]]);

    const [likeRows] = await db.execute(
      `${SEL}, 0 AS _score ${JN}
       WHERE ${WHERE_BASE} AND ${LIKE_COND}
       LIMIT ?`,
      [...bParams, ...LIKE_PARAMS, limit]
    ).catch(() => [[]]);

    rows = mergeById(ftRows, likeRows).slice(0, limit);
  } else {
    const [likeRows] = await db.execute(
      `${SEL}, 0 AS _score ${JN}
       WHERE ${WHERE_BASE} AND ${LIKE_COND}
       ORDER BY s.verification_status = 'verified' DESC
       LIMIT ?`,
      [...bParams, ...LIKE_PARAMS, limit]
    ).catch(() => [[]]);
    rows = likeRows;
  }

  return rows;
}

/* â”€â”€ People search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function searchPeople(q, { country, limit }) {
  const base   = ["u.status = 'active'", "u.role != 'admin'"];
  const bParams = [];
  if (country) { base.push("p.country = ?"); bParams.push(country); }

  const pct   = `%${q}%`;
  const boolQ = buildBooleanQuery(q);
  const useFT = q.length >= 4 || q.split(/\s+/).some(w => w.length >= 4);

  const SEL = `SELECT u.id, u.role,
       p.first_name, p.last_name, p.headline,
       p.profile_photo, p.verification_level, p.country`;

  const JN = `FROM users u LEFT JOIN profiles p ON p.user_id = u.id`;
  const WHERE_BASE = base.join(" AND ");

  const LIKE_COND = `(p.first_name LIKE ? OR p.last_name LIKE ? OR p.headline LIKE ? OR p.bio LIKE ? OR u.role LIKE ?)`;
  const LIKE_PARAMS = [pct, pct, pct, pct, pct];

  let rows;

  if (useFT) {
    const [ftRows] = await db.execute(
      `${SEL}, MATCH(p.first_name, p.last_name, p.headline, p.bio) AGAINST(? IN BOOLEAN MODE) AS _score
       ${JN}
       WHERE ${WHERE_BASE}
         AND MATCH(p.first_name, p.last_name, p.headline, p.bio) AGAINST(? IN BOOLEAN MODE) > 0
       ORDER BY _score DESC, CASE p.verification_level WHEN 'verified' THEN 0 ELSE 1 END
       LIMIT ?`,
      [boolQ, boolQ, ...bParams, limit]
    ).catch(() => [[]]);

    const [likeRows] = await db.execute(
      `${SEL}, 0 AS _score ${JN}
       WHERE ${WHERE_BASE} AND ${LIKE_COND}
       LIMIT ?`,
      [...bParams, ...LIKE_PARAMS, limit]
    ).catch(() => [[]]);

    rows = mergeById(ftRows, likeRows).slice(0, limit);
  } else {
    const [likeRows] = await db.execute(
      `${SEL}, 0 AS _score ${JN}
       WHERE ${WHERE_BASE} AND ${LIKE_COND}
       ORDER BY CASE p.verification_level WHEN 'verified' THEN 0 ELSE 1 END
       LIMIT ?`,
      [...bParams, ...LIKE_PARAMS, limit]
    ).catch(() => [[]]);
    rows = likeRows;
  }

  return rows;
}

/* â”€â”€ Posts search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function searchPosts(q, { limit }) {
  const pct   = `%${q}%`;
  const boolQ = buildBooleanQuery(q);
  const useFT = q.length >= 4 || q.split(/\s+/).some(w => w.length >= 4);

  const SEL = `SELECT po.id, po.content, po.created_at,
       p.first_name, p.last_name, p.profile_photo`;

  const JN = `FROM posts po
    JOIN users u ON u.id = po.user_id
    LEFT JOIN profiles p ON p.user_id = po.user_id`;

  const BASE_COND = `po.visibility = 'public'`;

  let rows;

  if (useFT) {
    const [ftRows] = await db.execute(
      `${SEL}, MATCH(po.content) AGAINST(? IN BOOLEAN MODE) AS _score
       ${JN}
       WHERE ${BASE_COND}
         AND MATCH(po.content) AGAINST(? IN BOOLEAN MODE) > 0
       ORDER BY _score DESC, po.created_at DESC
       LIMIT ?`,
      [boolQ, boolQ, limit]
    ).catch(() => [[]]);

    const [likeRows] = await db.execute(
      `${SEL}, 0 AS _score ${JN}
       WHERE ${BASE_COND} AND po.content LIKE ?
       ORDER BY po.created_at DESC LIMIT ?`,
      [pct, limit]
    ).catch(() => [[]]);

    rows = mergeById(ftRows, likeRows).slice(0, limit);
  } else {
    const [likeRows] = await db.execute(
      `${SEL}, 0 AS _score ${JN}
       WHERE ${BASE_COND} AND po.content LIKE ?
       ORDER BY po.created_at DESC LIMIT ?`,
      [pct, limit]
    ).catch(() => [[]]);
    rows = likeRows;
  }

  return rows;
}

/* â”€â”€ GET /api/search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function globalSearch(req, res) {
  try {
    const { q, type = "all", stage, country, limit } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ startups: [], users: [], posts: [] });
    }

    const query   = q.trim().slice(0, 200);
    const cap     = SAFE_LIMIT(limit);
    const runType = (type || "all").toLowerCase();

    const [startupsResult, usersResult, postsResult] = await Promise.allSettled([
      runType === "all" || runType === "startups"
        ? searchStartups(query, { stage, country, limit: cap })
        : Promise.resolve([]),
      runType === "all" || runType === "people"
        ? searchPeople(query, { country, limit: cap })
        : Promise.resolve([]),
      runType === "all" || runType === "posts"
        ? searchPosts(query, { limit: cap })
        : Promise.resolve([]),
    ]);

    return res.json({
      startups: startupsResult.status === "fulfilled" ? startupsResult.value : [],
      users:    usersResult.status    === "fulfilled" ? usersResult.value    : [],
      posts:    postsResult.status    === "fulfilled" ? postsResult.value    : [],
    });
  } catch (err) {
    console.error("[Search] error:", err.message);
    return res.status(500).json({ message: "Search failed." });
  }
}

module.exports = { globalSearch };

