/**
 * PostLike model â€” table: post_likes
 * Toggle-style likes (idempotent).
 */
const db = require("../config/database");

/** Toggle: like if not liked, unlike if already liked. Returns { liked, total } */
async function toggle(post_id, user_id) {
  const [existing] = await db.execute(
    "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ?",
    [post_id, user_id]
  );

  if (existing.length) {
    await db.execute("DELETE FROM post_likes WHERE post_id = ? AND user_id = ?", [post_id, user_id]);
  } else {
    await db.execute("INSERT INTO post_likes (post_id, user_id) VALUES (?, ?)", [post_id, user_id]);
  }

  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?", [post_id]
  );
  return { liked: !existing.length, total };
}

async function hasLiked(post_id, user_id) {
  const [rows] = await db.execute(
    "SELECT id FROM post_likes WHERE post_id = ? AND user_id = ? LIMIT 1",
    [post_id, user_id]
  );
  return rows.length > 0;
}

async function countByPost(post_id) {
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?", [post_id]
  );
  return total;
}

async function likersByPost(post_id, { limit = 20, offset = 0 } = {}) {
  const [rows] = await db.execute(
    `SELECT pl.*, p.first_name, p.last_name, p.profile_photo, u.role
     FROM post_likes pl
     JOIN users u ON u.id = pl.user_id
     LEFT JOIN profiles p ON p.user_id = pl.user_id
     WHERE pl.post_id = ?
     ORDER BY pl.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [post_id, limit, offset]
  );
  return rows;
}

module.exports = { toggle, hasLiked, isLiked: hasLiked, countByPost, likersByPost };
