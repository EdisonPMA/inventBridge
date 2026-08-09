/**
 * Auth middleware
 *
 * requireAuth     â€” validates Bearer JWT + token_version check (instant revocation)
 * optionalAuth    â€” same but non-blocking
 * requireRole     â€” whitelist roles after auth
 * rejectSuspended â€” live DB status check; apply to ALL routes (GET and mutations)
 */
const { verifyToken } = require("../utils/jwt");
const db = require("../config/database");

/* â”€â”€ requireAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authorization token required." });
    }

    const token   = authHeader.split(" ")[1];
    const decoded = verifyToken(token); // throws on invalid/expired

    // token_version check â€” instant revocation when admin suspends or user logs out all
    const [[row]] = await db.execute(
      "SELECT token_version, status FROM users WHERE id = ? LIMIT 1",
      [decoded.id]
    );

    if (!row) {
      return res.status(401).json({ message: "User not found." });
    }
    if (row.status === "suspended") {
      return res.status(403).json({
        message: "Your account has been suspended. Contact support if you believe this is a mistake.",
        code: "ACCOUNT_SUSPENDED",
      });
    }
    // If token was issued before the current version, it has been revoked
    if ((decoded.tv ?? 0) < (row.token_version ?? 0)) {
      return res.status(401).json({ message: "Session expired. Please log in again.", code: "TOKEN_REVOKED" });
    }

    req.user = decoded; // { id, email, role, tv }
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

/* â”€â”€ optionalAuth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token   = authHeader.split(" ")[1];
      const decoded = verifyToken(token);

      const [[row]] = await db.execute(
        "SELECT token_version, status FROM users WHERE id = ? LIMIT 1",
        [decoded.id]
      );
      if (row && row.status !== "suspended" && (decoded.tv ?? 0) >= (row.token_version ?? 0)) {
        req.user = decoded;
      }
    }
  } catch { /* treat as unauthenticated */ }
  next();
}

/* â”€â”€ requireRole â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function requireRole(roles) {
  const allowed = Array.isArray(roles) ? roles : [roles];
  return (req, res, next) => {
    if (!req.user || !allowed.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to access this resource." });
    }
    next();
  };
}

/**
 * rejectSuspended â€” legacy middleware kept for explicit routes.
 * Now requireAuth already checks suspended status on every call,
 * so this is only needed on routes that DON'T use requireAuth
 * but still need suspension enforcement.
 */
async function rejectSuspended(req, res, next) {
  try {
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

module.exports = { requireAuth, optionalAuth, requireRole };

