/**
 * AuditLog model â€” table: audit_logs
 * Records sensitive admin actions for accountability.
 * Never stores passwords, JWT tokens, or secrets.
 */
const db = require("../config/database");

/* â”€â”€ CREATE TABLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function ensureTable(connection) {
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INT AUTO_INCREMENT PRIMARY KEY,
      admin_id    INT NOT NULL,
      action      VARCHAR(100) NOT NULL,
      target_type VARCHAR(50),
      target_id   INT,
      details     TEXT,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_audit_admin FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_audit_admin(admin_id),
      INDEX idx_audit_action(action),
      INDEX idx_audit_target(target_type, target_id),
      INDEX idx_audit_created(created_at)
    )
  `);
}

/* â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function log({ admin_id, action, target_type = null, target_id = null, details = null }) {
  await db.execute(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, details)
     VALUES (?, ?, ?, ?, ?)`,
    [admin_id, action, target_type, target_id,
     details ? JSON.stringify(details).slice(0, 2000) : null]
  ).catch(() => {}); // never block the main response
}

/* â”€â”€ READ (admin only) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function findAll({ admin_id, action, target_type, page = 1, limit = 30 } = {}) {
  const conditions = [];
  const params     = [];
  if (admin_id)    { conditions.push("al.admin_id = ?");    params.push(admin_id); }
  if (action)      { conditions.push("al.action = ?");      params.push(action); }
  if (target_type) { conditions.push("al.target_type = ?"); params.push(target_type); }

  const where      = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeLimit  = (Math.min(Math.max(parseInt(limit) || 30, 1), 100)) | 0;
  const safeOffset = ((Math.max(parseInt(page) || 1, 1) - 1) * safeLimit) | 0;

  const [rows] = await db.execute(
    `SELECT al.*, p.first_name, p.last_name
     FROM audit_logs al
     LEFT JOIN profiles p ON p.user_id = al.admin_id
     ${where}
     ORDER BY al.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    params
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM audit_logs al ${where}`, params
  );
  return { rows, total, page: Math.max(parseInt(page) || 1, 1), limit: safeLimit };
}

module.exports = { ensureTable, log, findAll };




