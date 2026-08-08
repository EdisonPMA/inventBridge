/**
 * Startup model — table: startups
 * Core entity of the platform. Rich filtering for discovery.
 */
const db = require("../config/database");

/* ── helpers ─────────────────────────────────────── */
function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function uniqueSlug(name, excludeId = null) {
  let base = slugify(name);
  let slug = base;
  let n = 1;
  while (true) {
    const [rows] = await db.execute(
      "SELECT id FROM startups WHERE slug = ? AND id != ?",
      [slug, excludeId ?? 0]
    );
    if (!rows.length) return slug;
    slug = `${base}-${n++}`;
  }
}

const JOIN_PROFILE =
  `LEFT JOIN users u ON u.id = s.owner_id
   LEFT JOIN profiles p ON p.user_id = u.id
   LEFT JOIN categories c ON c.id = s.category_id`;

const PUBLIC_FIELDS = `
  s.*, c.name AS category_name,
  p.first_name AS owner_first_name, p.last_name AS owner_last_name,
  p.profile_photo AS owner_photo, p.verification_level AS owner_verification
`;

/* ── CREATE ──────────────────────────────────────── */
async function create({
  owner_id, category_id, name, description, problem, solution,
  mission, vision, business_model, revenue_model, industry, stage,
  funding_required = 0, equity_offered = 0,
  country, province, district,
  registration_type = "early_stage", registration_number,
  registration_certificate_url, registration_certificate_public_id,
  logo_url, logo_public_id,
}) {
  const slug = await uniqueSlug(name);

  const [result] = await db.execute(
    `INSERT INTO startups
       (owner_id, category_id, name, slug, description, problem, solution,
        mission, vision, business_model, revenue_model, industry, stage,
        funding_required, equity_offered, country, province, district,
        registration_type, registration_number, registration_certificate_url,
        registration_certificate_public_id, logo_url, logo_public_id)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [owner_id, category_id, name, slug, description ?? null, problem ?? null,
     solution ?? null, mission ?? null, vision ?? null, business_model ?? null,
     revenue_model ?? null, industry ?? null, stage ?? null,
     funding_required, equity_offered, country ?? null, province ?? null,
     district ?? null, registration_type, registration_number ?? null,
     registration_certificate_url ?? null, registration_certificate_public_id ?? null,
     logo_url ?? null, logo_public_id ?? null]
  );
  const created = await findById(result.insertId);
  refreshAiScore(created.id); // fire-and-forget
  return created;
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS} FROM startups s ${JOIN_PROFILE} WHERE s.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Startup not found.");
  return rows[0];
}

async function findBySlug(slug) {
  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS} FROM startups s ${JOIN_PROFILE} WHERE s.slug = ? LIMIT 1`,
    [slug]
  );
  if (!rows.length) throw new Error("Startup not found.");
  return rows[0];
}

async function findByOwner(owner_id) {
  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS} FROM startups s ${JOIN_PROFILE}
     WHERE s.owner_id = ? ORDER BY s.created_at DESC`,
    [owner_id]
  );
  return rows;
}

async function findAll({
  category_id, industry, stage, status, verification_status,
  country, search, limit = 20, offset = 0,
} = {}) {
  const conditions = [];
  const params = [];

  if (category_id)         { conditions.push("s.category_id = ?");         params.push(category_id); }
  if (industry)            { conditions.push("s.industry = ?");             params.push(industry); }
  if (stage)               { conditions.push("s.stage = ?");                params.push(stage); }
  if (status)              { conditions.push("s.status = ?");               params.push(status); }
  if (verification_status) { conditions.push("s.verification_status = ?"); params.push(verification_status); }
  if (country)             { conditions.push("s.country = ?");              params.push(country); }
  if (search) {
    conditions.push("(s.name LIKE ? OR s.description LIKE ? OR s.industry LIKE ?)");
    const q = `%${search}%`;
    params.push(q, q, q);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS} FROM startups s ${JOIN_PROFILE}
     ${where} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM startups s ${where}`, params
  );

  return { rows, total };
}

/* ── UPDATE ──────────────────────────────────────── */
async function update(id, fields = {}) {
  const allowed = [
    "category_id", "name", "description", "problem", "solution",
    "mission", "vision", "business_model", "revenue_model",
    "industry", "stage", "funding_required", "equity_offered",
    "country", "province", "district", "registration_type",
    "registration_number", "registration_certificate_url",
    "registration_certificate_public_id", "logo_url", "logo_public_id",
  ];

  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) throw new Error("No valid fields to update.");

  // Regenerate slug if name changed
  if (fields.name) {
    const current = await findById(id);
    if (fields.name !== current.name) {
      updates.push(["slug", await uniqueSlug(fields.name, id)]);
    }
  }

  const set = updates.map(([k]) => `${k} = ?`).join(", ");
  const values = updates.map(([, v]) => v ?? null);

  await db.execute(`UPDATE startups SET ${set} WHERE id = ?`, [...values, id]);
  const updated = await findById(id);
  refreshAiScore(id); // fire-and-forget
  return updated;
}

async function updateStatus(id, status) {
  await db.execute("UPDATE startups SET status = ? WHERE id = ?", [status, id]);
  return findById(id);
}

async function updateVerification(id, verification_status) {
  await db.execute(
    "UPDATE startups SET verification_status = ? WHERE id = ?",
    [verification_status, id]
  );
  return findById(id);
}

async function updateAiScore(id, ai_score) {
  await db.execute("UPDATE startups SET ai_score = ? WHERE id = ?", [ai_score, id]);
}

/**
 * Compute and persist ai_score for a startup.
 * Score (0–100) based on profile completeness, social signals, and funding clarity.
 * Called fire-and-forget after create/update — never blocks a response.
 *
 * Breakdown (total 100 pts):
 *   Profile fields  — 40 pts  (description, problem, solution, mission, vision, business_model, revenue_model)
 *   Media / files   — 20 pts  (logo, registration cert)
 *   Funding clarity — 15 pts  (funding_required > 0, equity_offered > 0)
 *   Social signals  — 15 pts  (followers, saves — capped at 10 each)
 *   Verification    — 10 pts  (verified = 10, pending = 5)
 */
async function refreshAiScore(id) {
  try {
    const [[s]] = await db.execute(
      `SELECT s.description, s.problem, s.solution, s.mission, s.vision,
              s.business_model, s.revenue_model, s.funding_required,
              s.equity_offered, s.verification_status, s.logo_url,
              s.registration_certificate_url,
              (SELECT COUNT(*) FROM startup_followers sf WHERE sf.startup_id = s.id) AS followers,
              (SELECT COUNT(*) FROM saved_startups ss WHERE ss.startup_id = s.id)   AS saves,
              (SELECT COUNT(*) FROM startup_files sf2
               WHERE sf2.startup_id = s.id AND sf2.file_type = 'logo') AS has_logo_file
       FROM startups s WHERE s.id = ?`,
      [id]
    );
    if (!s) return;

    // Profile completeness (up to 40 pts, ~5.7 pts each field rounded)
    const profileFields = [s.description, s.problem, s.solution, s.mission, s.vision, s.business_model, s.revenue_model];
    const profileScore = Math.round((profileFields.filter(Boolean).length / profileFields.length) * 40);

    // Media (up to 20 pts)
    const hasLogo = !!(s.logo_url || s.has_logo_file > 0);
    const hasCert = !!s.registration_certificate_url;
    const mediaScore = (hasLogo ? 12 : 0) + (hasCert ? 8 : 0);

    // Funding clarity (up to 15 pts)
    const fundingScore = (Number(s.funding_required) > 0 ? 8 : 0) + (Number(s.equity_offered) > 0 ? 7 : 0);

    // Social signals (up to 15 pts, log scale to avoid gaming)
    const followerScore = Math.min(10, Math.floor(Math.log2((Number(s.followers) || 0) + 1) * 2));
    const saveScore     = Math.min(5,  Math.floor(Math.log2((Number(s.saves)     || 0) + 1)));
    const socialScore   = followerScore + saveScore;

    // Verification (up to 10 pts)
    const verifScore = s.verification_status === "verified" ? 10
      : s.verification_status === "pending"  ?  5
      : 0;

    const total = Math.min(100, profileScore + mediaScore + fundingScore + socialScore + verifScore);
    await db.execute("UPDATE startups SET ai_score = ? WHERE id = ?", [total, id]);
  } catch { /* never block */ }
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM startups WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Startup not found.");
  return { message: "Startup deleted." };
}

/* ── DISCOVER (investor-facing, published + verified first) ─────── */
async function discover({
  q, category_id, industry, stage,
  country, province, district,
  minFunding, maxFunding, verificationStatus,
  orderBy = "s.created_at DESC",
  limit = 12, offset = 0,
} = {}) {
  // Always restrict to published startups for discovery
  const conditions = ["s.status = 'published'"];
  const params = [];

  if (q && q.length <= 200) {
    conditions.push(
      "(s.name LIKE ? OR s.description LIKE ? OR s.industry LIKE ? OR s.problem LIKE ? OR s.solution LIKE ? OR s.mission LIKE ? OR s.vision LIKE ? OR s.business_model LIKE ?)"
    );
    const pct = `%${q}%`;
    params.push(pct, pct, pct, pct, pct, pct, pct, pct);
  }
  if (category_id) { conditions.push("s.category_id = ?");         params.push(category_id); }
  if (industry)    { conditions.push("s.industry = ?");             params.push(industry); }
  if (stage)       { conditions.push("s.stage = ?");                params.push(stage); }
  if (country)     { conditions.push("s.country = ?");              params.push(country); }
  if (province)    { conditions.push("s.province = ?");             params.push(province); }
  if (district)    { conditions.push("s.district = ?");             params.push(district); }
  if (verificationStatus) { conditions.push("s.verification_status = ?"); params.push(verificationStatus); }
  if (minFunding != null && minFunding !== "") { conditions.push("s.funding_required >= ?"); params.push(parseFloat(minFunding)); }
  if (maxFunding != null && maxFunding !== "") { conditions.push("s.funding_required <= ?"); params.push(parseFloat(maxFunding)); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const LOGO_SUB = `(SELECT sf2.cloud_url FROM startup_files sf2 WHERE sf2.startup_id = s.id AND sf2.file_type = 'logo' LIMIT 1)`;

  const [rows] = await db.execute(
    `SELECT s.id, s.name, s.slug, s.description, s.industry, s.stage,
            s.funding_required, s.equity_offered, s.country, s.province,
            s.verification_status, s.status, s.created_at, s.ai_score,
            c.name AS category_name, c.id AS category_id,
            p.first_name AS owner_first_name, p.last_name AS owner_last_name,
            p.profile_photo AS owner_photo,
            s.logo_url,
            ${LOGO_SUB} AS logo_file_url,
            (SELECT COUNT(*) FROM startup_followers sf WHERE sf.startup_id = s.id) AS follower_count,
            (SELECT COUNT(*) FROM saved_startups ss WHERE ss.startup_id = s.id) AS save_count
     FROM startups s
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN users u ON u.id = s.owner_id
     LEFT JOIN profiles p ON p.user_id = s.owner_id
     ${where}
     ORDER BY ${orderBy}
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM startups s ${where}`, params
  );

  return { rows, total };
}

module.exports = {
  create, findById, findBySlug, findByOwner,
  findAll, discover, update, updateStatus, updateVerification,
  updateAiScore, refreshAiScore, remove,
};
