/**
 * StartupFollower controller
 * Routes:
 *   POST   /api/startups/:startupId/follow       (toggle follow/unfollow)
 *   GET    /api/startups/:startupId/followers    (list followers)
 *   GET    /api/startups/:startupId/follow/status (am I following?)
 *   GET    /api/users/me/following               (startups I follow)
 */
const StartupFollower = require("../models/StartupFollower.model");

/* ── POST /api/startups/:startupId/follow ────────── */
async function toggleFollow(req, res) {
  try {
    const result = await StartupFollower.toggle(req.params.startupId, req.user.id);

    // Notify startup owner when someone follows
    if (result.following) {
      try {
        const Startup      = require("../models/Startup.model");
        const Notification = require("../models/Notification.model");
        const db           = require("../config/database");

        const startup = await Startup.findById(req.params.startupId);
        if (startup.owner_id !== req.user.id) {
          // Fetch the follower's name for a personalised notification
          const [[follower]] = await db.execute(
            `SELECT p.first_name, p.last_name
             FROM profiles p WHERE p.user_id = ? LIMIT 1`,
            [req.user.id]
          );
          const followerName = follower
            ? `${follower.first_name || ""} ${follower.last_name || ""}`.trim()
            : null;

          Notification.create({
            user_id: startup.owner_id,
            title:   "New follower",
            message: followerName
              ? `${followerName} started following your startup "${startup.name}".`
              : `Someone started following your startup "${startup.name}".`,
            type: "general",
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    }

    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── GET /api/startups/:startupId/followers ─────── */
async function getFollowers(req, res) {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await StartupFollower.getFollowers(req.params.startupId, {
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/startups/:startupId/follow/status ──── */
async function getFollowStatus(req, res) {
  try {
    const db = require("../config/database");
    const [[row]] = await db.execute(
      `SELECT COUNT(*) AS total,
              MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS is_following
       FROM startup_followers WHERE startup_id = ?`,
      [req.user.id, req.params.startupId]
    );
    return res.json({ following: row.is_following === 1, count: Number(row.total) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/users/me/following ─────────────────── */
async function getFollowedStartups(req, res) {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await StartupFollower.getFollowedStartups(req.user.id, {
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { toggleFollow, getFollowers, getFollowStatus, getFollowedStartups };
