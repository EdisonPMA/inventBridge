/**
 * PostComment model â€” table: post_comments
 */
const db = require("../config/database");

/* â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function create({ post_id, user_id, comment }) {
  const [result] = await db.execute(
    "INSERT INTO post_comments (post_id, user_id, comment) VALUES (?, ?, ?)",
    [post_id, user_id, comment]
  );
  return findById(result.insertId);
}

/* â”€â”€ READ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT pc.*, p.first_name, p.last_name, p.profile_photo, u.role
     FROM post_comments pc
     JOIN users u ON u.id = pc.user_id
     LEFT JOIN profiles p ON p.user_id = pc.user_id
     WHERE pc.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Comment not found.");
  return rows[0];
}

async function findByPost(post_id, { limit = 50, offset = 0 } = {}) {
  const [rows] = await db.execute(
    `SELECT pc.*, p.first_name, p.last_name, p.profile_photo, u.role
     FROM post_comments pc
     JOIN users u ON u.id = pc.user_id
     LEFT JOIN profiles p ON p.user_id = pc.user_id
     WHERE pc.post_id = ?
     ORDER BY pc.created_at ASC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [post_id, limit, offset]
  );

  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM post_comments WHERE post_id = ?", [post_id]
  );
  return { rows, total };
}

/* â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function update(id, comment) {
  await db.execute("UPDATE post_comments SET comment = ? WHERE id = ?", [comment, id]);
  return findById(id);
}

/* â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM post_comments WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Comment not found.");
  return { message: "Comment deleted." };
}

module.exports = { create, findById, findByPost, update, remove };
