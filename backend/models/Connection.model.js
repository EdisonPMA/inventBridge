/**
 * Connection model — table: connections
 * LinkedIn-style connection requests between users.
 * Statuses: pending | accepted | rejected | blocked
 */
const db = require("../config/database");

const WITH_PROFILES = `
  c.*,
  sp.first_name AS sender_first, sp.last_name AS sender_last,
  sp.profile_photo AS sender_photo, su.role AS sender_role,
  rp.first_name AS receiver_first, rp.last_name AS receiver_last,
  rp.profile_photo AS receiver_photo, ru.role AS receiver_role
`;

/* ── CREATE ──────────────────────────────────────── */
async function send(sender_id, receiver_id) {
  if (sender_id === receiver_id)
    throw new Error("Cannot connect to yourself.");

  // Check for any existing connection in either direction
  const [existing] = await db.execute(
    `SELECT id, status FROM connections
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)`,
    [sender_id, receiver_id, receiver_id, sender_id]
  );
  if (existing.length) {
    const s = existing[0].status;
    if (s === "accepted") throw new Error("Already connected.");
    if (s === "pending")  throw new Error("Connection request already pending.");
    if (s === "blocked")  throw new Error("Cannot connect — blocked.");
  }

  const [result] = await db.execute(
    "INSERT INTO connections (sender_id, receiver_id) VALUES (?, ?)",
    [sender_id, receiver_id]
  );
  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_PROFILES}
     FROM connections c
     JOIN users su ON su.id = c.sender_id
     LEFT JOIN profiles sp ON sp.user_id = c.sender_id
     JOIN users ru ON ru.id = c.receiver_id
     LEFT JOIN profiles rp ON rp.user_id = c.receiver_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Connection not found.");
  return rows[0];
}

async function findBetween(user_a, user_b) {
  const [rows] = await db.execute(
    `SELECT * FROM connections
     WHERE (sender_id = ? AND receiver_id = ?)
        OR (sender_id = ? AND receiver_id = ?)
     LIMIT 1`,
    [user_a, user_b, user_b, user_a]
  );
  return rows[0] || null;
}

async function findByUser(user_id, status = "accepted") {
  const [rows] = await db.execute(
    `SELECT ${WITH_PROFILES}
     FROM connections c
     JOIN users su ON su.id = c.sender_id
     LEFT JOIN profiles sp ON sp.user_id = c.sender_id
     JOIN users ru ON ru.id = c.receiver_id
     LEFT JOIN profiles rp ON rp.user_id = c.receiver_id
     WHERE (c.sender_id = ? OR c.receiver_id = ?) AND c.status = ?
     ORDER BY c.created_at DESC`,
    [user_id, user_id, status]
  );
  return rows;
}

async function pendingReceived(user_id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_PROFILES}
     FROM connections c
     JOIN users su ON su.id = c.sender_id
     LEFT JOIN profiles sp ON sp.user_id = c.sender_id
     JOIN users ru ON ru.id = c.receiver_id
     LEFT JOIN profiles rp ON rp.user_id = c.receiver_id
     WHERE c.receiver_id = ? AND c.status = 'pending'
     ORDER BY c.created_at DESC`,
    [user_id]
  );
  return rows;
}

async function pendingSent(user_id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_PROFILES}
     FROM connections c
     JOIN users su ON su.id = c.sender_id
     LEFT JOIN profiles sp ON sp.user_id = c.sender_id
     JOIN users ru ON ru.id = c.receiver_id
     LEFT JOIN profiles rp ON rp.user_id = c.receiver_id
     WHERE c.sender_id = ? AND c.status = 'pending'
     ORDER BY c.created_at DESC`,
    [user_id]
  );
  return rows;
}

async function countConnections(user_id) {
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM connections
     WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
    [user_id, user_id]
  );
  return total;
}

/* ── UPDATE ──────────────────────────────────────── */
async function updateStatus(id, status) {
  const valid = ["accepted", "rejected", "blocked"];
  if (!valid.includes(status))
    throw new Error(`Invalid status. Must be: ${valid.join(", ")}`);

  await db.execute("UPDATE connections SET status = ? WHERE id = ?", [status, id]);
  return findById(id);
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM connections WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Connection not found.");
  return { message: "Connection removed." };
}

module.exports = {
  send, findById, findBetween, findByUser,
  pendingReceived, pendingSent, countConnections, updateStatus, remove,
};
