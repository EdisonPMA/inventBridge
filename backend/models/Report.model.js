/**
 * Report model — table: reports
 * Centralized user reporting system for startups, investors, posts, investments.
 */
const db = require("../config/database");

const ALLOWED_TARGET_TYPES = ["startup", "user", "post", "investment"];
const ALLOWED_REASONS      = [
  "fake_startup", "fake_investor", "scam",
  "inappropriate_content", "fraudulent_investment",
];
const ALLOWED_STATUSES = ["pending", "under_review", "resolved", "dismissed"];

/* ── CREATE TABLE (called from schema init) ──────── */
async function ensureTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS reports (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      reporter_id  INT NOT NULL,
      target_type  VARCHAR(30) NOT NULL,
      target_id    INT NOT NULL,
      reason       VARCHAR(50) NOT NULL,
      description  TEXT,
      status       VARCHAR(30) DEFAULT 'pending',
      reviewed_by  INT NULL,
      reviewed_at  TIMESTAMP NULL,
      resolution   TEXT NULL,
      created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_report_reporter FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_report_reviewer FOREIGN KEY(reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
      INDEX idx_report_reporter(reporter_id),
      INDEX idx_report_target(target_type, target_id),
      INDEX idx_report_status(status),
      INDEX idx_report_created(created_at)
    )
  `);
}

/* ── CREATE ──────────────────────────────────────── */
async function create({ reporter_id, target_type, target_id, reason, description }) {
  if (!ALLOWED_TARGET_TYPES.includes(target_type))
    throw new Error(`Invalid target_type. Allowed: ${ALLOWED_TARGET_TYPES.join(", ")}`);
  if (!ALLOWED_REASONS.includes(reason))
    throw new Error(`Invalid reason. Allowed: ${ALLOWED_REASONS.join(", ")}`);

  // Prevent duplicate pending report from same reporter against same target+reason
  const [existing] = await db.execute(
    `SELECT id FROM reports
     WHERE reporter_id = ? AND target_type = ? AND target_id = ?
       AND reason = ? AND status = 'pending'`,
    [reporter_id, target_type, target_id, reason]
  );
  if (existing.length)
    throw new Error("You have already submitted a pending report for this item with the same reason.");

  const [result] = await db.execute(
    `INSERT INTO reports (reporter_id, target_type, target_id, reason, description)
     VALUES (?, ?, ?, ?, ?)`,
    [reporter_id, target_type, target_id, reason, description?.trim() || null]
  );
  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT r.*,
            rp.first_name AS reporter_first, rp.last_name AS reporter_last,
            ru.email AS reporter_email,
            rvp.first_name AS reviewer_first, rvp.last_name AS reviewer_last
     FROM reports r
     JOIN users ru ON ru.id = r.reporter_id
     LEFT JOIN profiles rp ON rp.user_id = r.reporter_id
     LEFT JOIN profiles rvp ON rvp.user_id = r.reviewed_by
     WHERE r.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Report not found.");
  return rows[0];
}

async function findAll({
  status, target_type, reason, page = 1, limit = 20,
} = {}) {
  const conditions = [];
  const params     = [];
  if (status)      { conditions.push("r.status = ?");      params.push(status); }
  if (target_type) { conditions.push("r.target_type = ?"); params.push(target_type); }
  if (reason)      { conditions.push("r.reason = ?");      params.push(reason); }

  const where    = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
  const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

  const [rows] = await db.execute(
    `SELECT r.*,
            rp.first_name AS reporter_first, rp.last_name AS reporter_last,
            ru.email AS reporter_email
     FROM reports r
     JOIN users ru ON ru.id = r.reporter_id
     LEFT JOIN profiles rp ON rp.user_id = r.reporter_id
     ${where}
     ORDER BY r.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM reports r ${where}`, params
  );
  return {
    rows, total,
    page: Math.max(parseInt(page) || 1, 1),
    limit: safeLimit,
    totalPages: Math.ceil(total / safeLimit),
  };
}

/* ── UPDATE (admin only) ─────────────────────────── */
async function updateStatus(id, { status, reviewed_by, resolution }) {
  if (!ALLOWED_STATUSES.includes(status))
    throw new Error(`Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}`);

  await db.execute(
    `UPDATE reports
     SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP,
         resolution = ?
     WHERE id = ?`,
    [status, reviewed_by, resolution?.trim() || null, id]
  );
  return findById(id);
}

module.exports = {
  ensureTable,
  create,
  findById,
  findAll,
  updateStatus,
  ALLOWED_TARGET_TYPES,
  ALLOWED_REASONS,
  ALLOWED_STATUSES,
};
