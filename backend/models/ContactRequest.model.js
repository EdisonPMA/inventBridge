/**
 * ContactRequest model — approve-before-message workflow.
 * Investors must request contact; founders approve before DM can start.
 */
const db = require("../config/database");

async function create({ sender_id, receiver_id, startup_id = null, message = null }) {
  // Check for existing request
  const [existing] = await db.execute(
    "SELECT id, status FROM contact_requests WHERE sender_id = ? AND receiver_id = ?",
    [sender_id, receiver_id]
  );
  if (existing.length) {
    if (existing[0].status === "accepted") throw new Error("You are already connected.");
    if (existing[0].status === "pending")  throw new Error("A contact request is already pending.");
    // declined → allow re-request by deleting old one
    await db.execute("DELETE FROM contact_requests WHERE id = ?", [existing[0].id]);
  }

  const [result] = await db.execute(
    `INSERT INTO contact_requests (sender_id, receiver_id, startup_id, message)
     VALUES (?, ?, ?, ?)`,
    [sender_id, receiver_id, startup_id || null, message || null]
  );
  return findById(result.insertId);
}

async function findById(id) {
  const [rows] = await db.execute(
    `SELECT cr.*,
            sp.first_name AS sender_first, sp.last_name AS sender_last,
            sp.profile_photo AS sender_photo, su.role AS sender_role,
            s.name AS startup_name
     FROM contact_requests cr
     LEFT JOIN profiles sp ON sp.user_id = cr.sender_id
     LEFT JOIN users su ON su.id = cr.sender_id
     LEFT JOIN startups s ON s.id = cr.startup_id
     WHERE cr.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Contact request not found.");
  return rows[0];
}

async function findPendingForUser(receiver_id) {
  const [rows] = await db.execute(
    `SELECT cr.*,
            sp.first_name AS sender_first, sp.last_name AS sender_last,
            sp.profile_photo AS sender_photo, su.role AS sender_role,
            p.verification_level AS sender_verification,
            s.name AS startup_name
     FROM contact_requests cr
     LEFT JOIN profiles sp ON sp.user_id = cr.sender_id
     LEFT JOIN users su ON su.id = cr.sender_id
     LEFT JOIN profiles p ON p.user_id = cr.sender_id
     LEFT JOIN startups s ON s.id = cr.startup_id
     WHERE cr.receiver_id = ? AND cr.status = 'pending'
     ORDER BY cr.created_at DESC`,
    [receiver_id]
  );
  return rows;
}

async function findBetween(sender_id, receiver_id) {
  const [rows] = await db.execute(
    "SELECT * FROM contact_requests WHERE sender_id = ? AND receiver_id = ? LIMIT 1",
    [sender_id, receiver_id]
  );
  return rows[0] || null;
}

async function respond(id, status) {
  await db.execute(
    "UPDATE contact_requests SET status = ?, responded_at = NOW() WHERE id = ?",
    [status, id]
  );
  return findById(id);
}

module.exports = { create, findById, findPendingForUser, findBetween, respond };
