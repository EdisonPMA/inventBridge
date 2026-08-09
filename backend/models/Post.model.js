/**
 * Post model — table: posts + post_tags
 * Social feed posts, optionally linked to a startup.
 * Supports tagging specific users (post_tags table).
 */
const db = require("../config/database");

const WITH_AUTHOR = `
  po.*,
  p.first_name, p.last_name, p.profile_photo,
  u.role AS author_role,
  s.name AS startup_name, s.slug AS startup_slug,
  (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = po.id)  AS like_count,
  (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = po.id) AS comment_count
`;

/* ── helpers ─────────────────────────────────────── */

/** Fetch tagged users for a list of post IDs. Returns map: post_id → [...] */
async function fetchTags(postIds) {
  if (!postIds.length) return {};
  try {
    const placeholders = postIds.map(() => "?").join(",");
    const [rows] = await db.execute(
      `SELECT pt.post_id, pt.user_id, p.first_name, p.last_name, p.profile_photo
       FROM post_tags pt
       LEFT JOIN profiles p ON p.user_id = pt.user_id
       WHERE pt.post_id IN (${placeholders})`,
      postIds
    );
    const map = {};
    for (const row of rows) {
      if (!map[row.post_id]) map[row.post_id] = [];
      map[row.post_id].push({ user_id: row.user_id, first_name: row.first_name, last_name: row.last_name, profile_photo: row.profile_photo });
    }
    return map;
  } catch {
    // post_tags table may not exist yet — return empty map rather than crashing
    return {};
  }
}

/* ── CREATE ──────────────────────────────────────── */
async function create({
  user_id, startup_id = null, content,
  image_url = null, video_url = null, visibility = "public",
  tagged_users = [], // array of user IDs to tag
}) {
  const [result] = await db.execute(
    `INSERT INTO posts (user_id, startup_id, content, image_url, video_url, visibility)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [user_id, startup_id, content, image_url, video_url, visibility]
  );
  const postId = result.insertId;

  // Insert tags (ignore duplicates / self-tags)
  const validTags = [...new Set(tagged_users)].filter(id => id !== user_id);
  if (validTags.length) {
    const placeholders = validTags.map(() => "(?,?)").join(",");
    const vals = validTags.flatMap(uid => [postId, uid]);
    await db.execute(
      `INSERT IGNORE INTO post_tags (post_id, user_id) VALUES ${placeholders}`, vals
    );
  }

  const post = await findById(postId);
  post.tagged_users = validTags.length
    ? await fetchTags([postId]).then(m => m[postId] || [])
    : [];
  return post;
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_AUTHOR}
     FROM posts po
     JOIN users u ON u.id = po.user_id
     LEFT JOIN profiles p ON p.user_id = po.user_id
     LEFT JOIN startups s ON s.id = po.startup_id
     WHERE po.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Post not found.");
  const post = rows[0];
  const tagMap = await fetchTags([id]);
  post.tagged_users = tagMap[id] || [];
  return post;
}

async function findAll({ user_id, startup_id, visibility, search, limit = 20, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  if (user_id)    { conditions.push("po.user_id = ?");    params.push(user_id); }
  if (startup_id) { conditions.push("po.startup_id = ?"); params.push(startup_id); }
  if (visibility) { conditions.push("po.visibility = ?"); params.push(visibility); }
  if (search) {
    conditions.push("po.content LIKE ?");
    params.push(`%${search}%`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const safeLimit  = Math.min(Math.max(parseInt(limit)  || 20, 1), 100);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  const [rows] = await db.execute(
    `SELECT ${WITH_AUTHOR}
     FROM posts po
     JOIN users u ON u.id = po.user_id
     LEFT JOIN profiles p ON p.user_id = po.user_id
     LEFT JOIN startups s ON s.id = po.startup_id
     ${where}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, safeOffset]
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM posts po ${where}`, params
  );

  // Attach tags in one batch query
  const ids = rows.map(r => r.id);
  const tagMap = await fetchTags(ids);
  rows.forEach(r => { r.tagged_users = tagMap[r.id] || []; });

  return { rows, total };
}

/** Public feed: only public posts ordered by newest */
async function feed({ limit = 20, offset = 0 } = {}) {
  return findAll({ visibility: "public", limit, offset });
}

/**
 * Personalised feed for an authenticated viewer.
 */
async function personalFeed(viewer_id, { limit = 20, offset = 0 } = {}) {
  const safeLimit  = Math.min(Math.max(parseInt(limit)  || 20, 1), 50);
  const safeOffset = Math.max(parseInt(offset) || 0, 0);

  const feedWhere = `
    WHERE (
      po.visibility = 'public'
      OR (
        po.visibility = 'connections'
        AND po.user_id IN (
          SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END
          FROM connections
          WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'
        )
      )
      OR (
        po.startup_id IS NOT NULL
        AND po.startup_id IN (
          SELECT startup_id FROM startup_followers WHERE user_id = ?
        )
      )
    )`;

  // Fetch posts without the EXISTS subquery (TiDB compatibility)
  const [rows] = await db.execute(
    `SELECT ${WITH_AUTHOR}
     FROM posts po
     JOIN users u ON u.id = po.user_id
     LEFT JOIN profiles p ON p.user_id = po.user_id
     LEFT JOIN startups s ON s.id = po.startup_id
     ${feedWhere}
     ORDER BY po.created_at DESC
     LIMIT ? OFFSET ?`,
    [viewer_id, viewer_id, viewer_id, viewer_id, safeLimit, safeOffset]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM posts po ${feedWhere}`,
    [viewer_id, viewer_id, viewer_id, viewer_id]
  );

  // Fetch viewer_liked separately to avoid EXISTS in SELECT (TiDB compat)
  const ids = rows.map(r => r.id);
  if (ids.length) {
    const likedPlaceholders = ids.map(() => "?").join(",");
    const [likedRows] = await db.execute(
      `SELECT post_id FROM post_likes WHERE user_id = ? AND post_id IN (${likedPlaceholders})`,
      [viewer_id, ...ids]
    ).catch(() => [[]]);
    const likedSet = new Set(likedRows.map(r => r.post_id));
    rows.forEach(r => { r.viewer_liked = likedSet.has(r.id) ? 1 : 0; });
  }

  const tagMap = await fetchTags(ids);
  rows.forEach(r => { r.tagged_users = tagMap[r.id] || []; });

  return { rows, total };
}

/* ── UPDATE ──────────────────────────────────────── */
async function update(id, { content, image_url, video_url, visibility }) {
  const fields = [];
  const values = [];
  if (content    !== undefined) { fields.push("content = ?");    values.push(content); }
  if (image_url  !== undefined) { fields.push("image_url = ?");  values.push(image_url); }
  if (video_url  !== undefined) { fields.push("video_url = ?");  values.push(video_url); }
  if (visibility !== undefined) { fields.push("visibility = ?"); values.push(visibility); }
  if (!fields.length) throw new Error("No fields to update.");

  await db.execute(
    `UPDATE posts SET ${fields.join(", ")} WHERE id = ?`, [...values, id]
  );
  return findById(id);
}

/* ── archive (soft-delete) ───────────────────────── */
async function archive(id) {
  const [result] = await db.execute(
    "UPDATE posts SET visibility = 'archived' WHERE id = ?", [id]
  );
  if (!result.affectedRows) throw new Error("Post not found.");
  return { message: "Post archived." };
}

async function restore(id) {
  const [result] = await db.execute(
    "UPDATE posts SET visibility = 'public' WHERE id = ?", [id]
  );
  if (!result.affectedRows) throw new Error("Post not found.");
  return { message: "Post restored." };
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM posts WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Post not found.");
  return { message: "Post deleted." };
}

module.exports = { create, findById, findAll, feed, personalFeed, update, archive, restore, remove };
