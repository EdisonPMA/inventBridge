/**
 * SavedStartup model â€” table: saved_startups
 * Investor bookmarks / saved startup list.
 */
const db = require("../config/database");

/* â”€â”€ TOGGLE (save if not saved, unsave if saved) â”€â”€â”€ */
async function toggle(user_id, startup_id) {
  const [existing] = await db.execute(
    "SELECT id FROM saved_startups WHERE user_id = ? AND startup_id = ?",
    [user_id, startup_id]
  );
  if (existing.length) {
    await db.execute(
      "DELETE FROM saved_startups WHERE user_id = ? AND startup_id = ?",
      [user_id, startup_id]
    );
    return { saved: false };
  }
  await db.execute(
    "INSERT INTO saved_startups (user_id, startup_id) VALUES (?, ?)",
    [user_id, startup_id]
  );
  return { saved: true };
}

/* â”€â”€ READ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function isSaved(user_id, startup_id) {
  const [rows] = await db.execute(
    "SELECT id FROM saved_startups WHERE user_id = ? AND startup_id = ? LIMIT 1",
    [user_id, startup_id]
  );
  return rows.length > 0;
}

async function findByUser(user_id, { limit = 20, offset = 0 } = {}) {
  const safeLimit  = Math.max(1, Math.min(parseInt(limit,  10) || 20, 100));
  const safeOffset = Math.max(0, parseInt(offset, 10) || 0);
  const [rows] = await db.execute(
    `SELECT ss.*, s.name, s.slug, s.industry, s.stage,
            s.funding_required, s.verification_status, s.status AS startup_status,
            s.country, c.name AS category_name,
            p.first_name AS owner_first, p.last_name AS owner_last, p.profile_photo AS owner_photo
     FROM saved_startups ss
     JOIN startups s ON s.id = ss.startup_id
     LEFT JOIN categories c ON c.id = s.category_id
     LEFT JOIN profiles p ON p.user_id = s.owner_id
     WHERE ss.user_id = ?
     ORDER BY ss.created_at DESC
     LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [user_id]
  );
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM saved_startups WHERE user_id = ?", [user_id]
  );
  return { rows, total };
}

async function countSaves(startup_id) {
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM saved_startups WHERE startup_id = ?", [startup_id]
  );
  return total;
}

/* â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function remove(user_id, startup_id) {
  await db.execute(
    "DELETE FROM saved_startups WHERE user_id = ? AND startup_id = ?",
    [user_id, startup_id]
  );
  return { message: "Startup removed from saved list." };
}

module.exports = { toggle, isSaved, findByUser, countSaves, remove };

