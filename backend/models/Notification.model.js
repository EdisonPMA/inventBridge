/**
 * Notification model — table: notifications
 * In-app notification delivery and read-state management.
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function create({ user_id, title, message = null, type = "general" }) {
  const [result] = await db.execute(
    "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)",
    [user_id, title, message, type]
  );
  return findById(result.insertId);
}

/** Bulk-create: send the same notification to multiple users */
async function createBulk(user_ids, { title, message = null, type = "general" }) {
  if (!user_ids.length) return [];
  const placeholders = user_ids.map(() => "(?,?,?,?)").join(",");
  const values = user_ids.flatMap((uid) => [uid, title, message, type]);
  await db.execute(
    `INSERT INTO notifications (user_id, title, message, type) VALUES ${placeholders}`,
    values
  );
  return { sent: user_ids.length };
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM notifications WHERE id = ? LIMIT 1", [id]
  );
  if (!rows.length) throw new Error("Notification not found.");
  return rows[0];
}

async function findByUser(user_id, { is_read, type, limit = 30, offset = 0 } = {}) {
  const conditions = ["user_id = ?"];
  const params = [user_id];
  if (is_read !== undefined) { conditions.push("is_read = ?"); params.push(is_read); }
  if (type)                  { conditions.push("type = ?");    params.push(type); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  // Ensure integers — mysql2 on TiDB Cloud rejects string LIMIT/OFFSET
  const safeLimit  = Math.min(Math.max(parseInt(limit)  || 30, 1), 100);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  const [rows] = await db.execute(
    `SELECT * FROM notifications ${where}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM notifications ${where}`, params
  );
  const [[{ unread }]] = await db.execute(
    "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = FALSE",
    [user_id]
  );
  return { rows, total, unread };
}

/* ── UPDATE ──────────────────────────────────────── */
async function markRead(id) {
  await db.execute("UPDATE notifications SET is_read = TRUE WHERE id = ?", [id]);
  return findById(id);
}

async function markAllRead(user_id) {
  const [result] = await db.execute(
    "UPDATE notifications SET is_read = TRUE WHERE user_id = ? AND is_read = FALSE",
    [user_id]
  );
  return { updated: result.affectedRows };
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM notifications WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Notification not found.");
  return { message: "Notification deleted." };
}

async function clearAll(user_id) {
  const [result] = await db.execute(
    "DELETE FROM notifications WHERE user_id = ?", [user_id]
  );
  return { deleted: result.affectedRows };
}

module.exports = {
  create, createBulk,
  findById, findByUser,
  markRead, markAllRead,
  remove, clearAll,
};
