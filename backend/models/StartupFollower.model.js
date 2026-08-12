/**
 * StartupFollower model â€” table: startup_followers
 * Users follow startups to receive activity updates.
 */
const db = require("../config/database");

/* â”€â”€ TOGGLE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function toggle(startup_id, user_id) {
  const [existing] = await db.execute(
    "SELECT id FROM startup_followers WHERE startup_id = ? AND user_id = ?",
    [startup_id, user_id]
  );
  if (existing.length) {
    await db.execute(
      "DELETE FROM startup_followers WHERE startup_id = ? AND user_id = ?",
      [startup_id, user_id]
    );
    return { following: false, count: await countFollowers(startup_id) };
  }
  await db.execute(
    "INSERT INTO startup_followers (startup_id, user_id) VALUES (?, ?)",
    [startup_id, user_id]
  );
  return { following: true, count: await countFollowers(startup_id) };
}

/* â”€â”€ READ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function isFollowing(startup_id, user_id) {
  const [rows] = await db.execute(
    "SELECT id FROM startup_followers WHERE startup_id = ? AND user_id = ? LIMIT 1",
    [startup_id, user_id]
  );
  return rows.length > 0;
}

async function countFollowers(startup_id) {
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM startup_followers WHERE startup_id = ?",
    [startup_id]
  );
  return total;
}

async function getFollowers(startup_id, { limit = 20, offset = 0 } = {}) {
  const safeLimit  = Math.max(1, Math.min(parseInt(limit,  10) || 20, 100));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await db.execute(
    `SELECT sf.*, p.first_name, p.last_name, p.profile_photo,
            u.role, u.status AS user_status
     FROM startup_followers sf
     JOIN users u ON u.id = sf.user_id
     LEFT JOIN profiles p ON p.user_id = sf.user_id
     WHERE sf.startup_id = ?
     ORDER BY sf.followed_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [startup_id]
  );
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM startup_followers WHERE startup_id = ?",
    [startup_id]
  );
  return { rows, total };
}

async function getFollowedStartups(user_id, { limit = 20, offset = 0 } = {}) {
  const safeLimit  = Math.max(1, Math.min(parseInt(limit,  10) || 20, 100));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await db.execute(
    `SELECT sf.followed_at, s.id, s.name, s.slug, s.industry, s.stage,
            s.verification_status, s.status AS startup_status, s.country,
            s.funding_required, c.name AS category_name,
            p.first_name AS owner_first, p.last_name AS owner_last
     FROM startup_followers sf
     JOIN startups s ON s.id = sf.startup_id
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN profiles p ON p.user_id = s.owner_id
     WHERE sf.user_id = ?
     ORDER BY sf.followed_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [user_id]
  );
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM startup_followers WHERE user_id = ?",
    [user_id]
  );
  return { rows, total };
}

/* â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function remove(startup_id, user_id) {
  await db.execute(
    "DELETE FROM startup_followers WHERE startup_id = ? AND user_id = ?",
    [startup_id, user_id]
  );
  return { message: "Unfollowed startup." };
}

module.exports = {
  toggle, isFollowing, countFollowers,
  getFollowers, getFollowedStartups, remove,
};

