/**
 * VerificationRequest model â€” table: verification_requests
 * Handles user and startup identity verification workflows.
 * Statuses: pending | under_review | approved | rejected
 */
const db = require("../config/database");

const WITH_RELATIONS = `
  vr.*,
  p.first_name, p.last_name, p.profile_photo,
  u.email, u.role,
  s.name AS startup_name, s.slug AS startup_slug,
  ap.first_name AS admin_first, ap.last_name AS admin_last
`;

const JOIN_RELATIONS = `
  JOIN users u ON u.id = vr.user_id
  LEFT JOIN profiles p ON p.user_id = vr.user_id
  LEFT JOIN startups s ON s.id = vr.startup_id
  LEFT JOIN profiles ap ON ap.user_id = vr.verified_by
`;

/* â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function create({
  user_id, startup_id = null, verification_type, document_url = null,
}) {
  // Block duplicate pending/under_review request for same scope
  const [existing] = await db.execute(
    `SELECT id FROM verification_requests
     WHERE user_id = ?
       AND (startup_id = ? OR (startup_id IS NULL AND ? IS NULL))
       AND verification_type = ?
       AND status IN ('pending','under_review')`,
    [user_id, startup_id, startup_id, verification_type]
  );
  if (existing.length)
    throw new Error("A verification request of this type is already pending.");

  const [result] = await db.execute(
    `INSERT INTO verification_requests
       (user_id, startup_id, verification_type, document_url)
     VALUES (?, ?, ?, ?)`,
    [user_id, startup_id, verification_type, document_url]
  );
  return findById(result.insertId);
}

/* â”€â”€ READ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM verification_requests vr ${JOIN_RELATIONS}
     WHERE vr.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Verification request not found.");
  return rows[0];
}

async function findAll({ status, user_id, startup_id, verification_type, limit = 30, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  if (status)            { conditions.push("vr.status = ?");            params.push(status); }
  if (user_id)           { conditions.push("vr.user_id = ?");           params.push(user_id); }
  if (startup_id)        { conditions.push("vr.startup_id = ?");        params.push(startup_id); }
  if (verification_type) { conditions.push("vr.verification_type = ?"); params.push(verification_type); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const safeLimit  = Math.max(1, Math.min(parseInt(limit,  10) || 30, 100));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);

  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM verification_requests vr ${JOIN_RELATIONS}
     ${where} ORDER BY vr.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`, params
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM verification_requests vr ${where}`, params
  );
  return { rows, total };
}

async function findByUser(user_id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM verification_requests vr ${JOIN_RELATIONS}
     WHERE vr.user_id = ? ORDER BY vr.created_at DESC`,
    [user_id]
  );
  return rows;
}

async function countPending() {
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM verification_requests WHERE status = 'pending'"
  );
  return total;
}

/* â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function startReview(id, admin_id) {
  await db.execute(
    "UPDATE verification_requests SET status = 'under_review', verified_by = ? WHERE id = ?",
    [admin_id, id]
  );
  return findById(id);
}

async function approve(id, admin_id, remarks = null) {
  await db.execute(
    `UPDATE verification_requests
     SET status = 'approved', verified_by = ?, remarks = ?, verified_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [admin_id, remarks, id]
  );
  return findById(id);
}

async function reject(id, admin_id, remarks) {
  if (!remarks) throw new Error("A rejection reason (remarks) is required.");
  await db.execute(
    `UPDATE verification_requests
     SET status = 'rejected', verified_by = ?, remarks = ?, verified_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [admin_id, remarks, id]
  );
  return findById(id);
}

async function uploadDocument(id, document_url) {
  await db.execute(
    "UPDATE verification_requests SET document_url = ? WHERE id = ?",
    [document_url, id]
  );
  return findById(id);
}

/* â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function remove(id) {
  const [result] = await db.execute(
    "DELETE FROM verification_requests WHERE id = ?", [id]
  );
  if (!result.affectedRows) throw new Error("Verification request not found.");
  return { message: "Request deleted." };
}

module.exports = {
  create, findById, findAll, findByUser,
  countPending, startReview, approve, reject, uploadDocument, remove,
};


