/**
 * Suspended account middleware.
 * Must run AFTER requireAuth so req.user is populated.
 * Blocks suspended users from mutating resources.
 * Read-only endpoints may be excluded by not applying this middleware.
 */
const db = require("../config/database");

async function rejectSuspended(req, res, next) {
  try {
    // Guard: must run after requireAuth — skip silently if no user attached
    if (!req.user?.id) return next();
    const [[row]] = await db.execute(
      "SELECT status FROM users WHERE id = ? LIMIT 1",
      [req.user.id]
    );
    if (!row) return res.status(401).json({ message: "User not found." });
    if (row.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended. Contact support if you believe this is a mistake.",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    next();
  } catch (err) {
    console.error("rejectSuspended:", err.message);
    return res.status(500).json({ message: "Internal server error." });
  }
}

module.exports = { rejectSuspended };
