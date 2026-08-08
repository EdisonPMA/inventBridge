/**
 * StartupView model — table: startup_views
 * Tracks real page views of startup detail pages.
 *
 * Deduplication strategy: one row per viewer per startup per calendar day.
 * Owners and admins are never counted (excluded in the controller before calling record()).
 * Anonymous (unauthenticated) views are stored with viewer_id = NULL.
 */
const db = require("../config/database");

/**
 * Record a view. Deduplicates: skips if this viewer already viewed today.
 * Fire-and-forget safe — never throws.
 * @param {number}      startupId
 * @param {number|null} viewerId   - null for unauthenticated visitors
 */
async function record(startupId, viewerId = null) {
  try {
    if (viewerId !== null) {
      // Authenticated: one view per viewer per startup per day
      const [[existing]] = await db.execute(
        `SELECT id FROM startup_views
         WHERE startup_id = ? AND viewer_id = ? AND DATE(viewed_at) = CURDATE()
         LIMIT 1`,
        [startupId, viewerId]
      );
      if (existing) return; // already counted today
    }
    await db.execute(
      "INSERT INTO startup_views (startup_id, viewer_id) VALUES (?, ?)",
      [startupId, viewerId ?? null]
    );
  } catch { /* never block */ }
}

/**
 * Total all-time view count for a startup.
 * @param {number} startupId
 * @returns {Promise<number>}
 */
async function totalViews(startupId) {
  try {
    const [[{ total }]] = await db.execute(
      "SELECT COUNT(*) AS total FROM startup_views WHERE startup_id = ?",
      [startupId]
    );
    return Number(total);
  } catch { return 0; }
}

/**
 * Total views for ALL startups owned by a founder.
 * @param {number[]} startupIds
 * @returns {Promise<number>}
 */
async function totalViewsForOwner(startupIds) {
  if (!startupIds.length) return 0;
  try {
    const placeholders = startupIds.map(() => "?").join(",");
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM startup_views WHERE startup_id IN (${placeholders})`,
      startupIds
    );
    return Number(total);
  } catch { return 0; }
}

/**
 * Views in the last 7 days — one row per day — for a set of startup IDs.
 * Returns an array of { date: "YYYY-MM-DD", views: number } for the last 7 days,
 * filling zero for days with no views.
 * @param {number[]} startupIds
 * @returns {Promise<Array<{ date: string, label: string, views: number }>>}
 */
async function weeklyChart(startupIds) {
  if (!startupIds.length) return buildEmptyWeek();
  try {
    const placeholders = startupIds.map(() => "?").join(",");
    const [rows] = await db.execute(
      `SELECT DATE(viewed_at) AS date, COUNT(*) AS views
       FROM startup_views
       WHERE startup_id IN (${placeholders})
         AND viewed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       GROUP BY DATE(viewed_at)
       ORDER BY date ASC`,
      startupIds
    );

    // Fill all 7 days including days with zero views
    const map = new Map(rows.map((r) => [r.date.toISOString().slice(0, 10), Number(r.views)]));
    return buildEmptyWeek().map((day) => ({
      ...day,
      views: map.get(day.date) ?? 0,
    }));
  } catch { return buildEmptyWeek(); }
}

/** Builds a 7-day skeleton (today − 6 days → today) with 0 views. */
function buildEmptyWeek() {
  const days = [];
  const SHORT_DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, label: SHORT_DAYS[d.getDay()], views: 0 });
  }
  return days;
}

module.exports = { record, totalViews, totalViewsForOwner, weeklyChart };
