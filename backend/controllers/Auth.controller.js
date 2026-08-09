const userModel = require("../models/Auth.model");
const User = require("../models/User.model");
const db = require("../config/database");
const {
  generateToken, generateRefreshToken, verifyRefreshToken,
  setRefreshCookie, clearRefreshCookie,
} = require("../utils/jwt");
const { verifyPassword, hashPassword } = require("../utils/password");

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function userPayload(u) {
  return {
    id:                u.id,
    uuid:              u.uuid,
    firstName:         u.first_name,
    lastName:          u.last_name,
    email:             u.email,
    role:              u.role,
    status:            u.status,
    profilePhoto:      u.profile_photo || null,
    verificationLevel: u.verification_level || "unverified",
    headline:          u.headline || null,
  };
}

/* â”€â”€ POST /api/auth/register â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function createUser(req, res) {
  try {
    const { firstName, lastName, password, phone } = req.body;
    const email = String(req.body.email || "").trim().toLowerCase();

    // Whitelist self-registration roles â€” never trust role from client
    const ALLOWED_ROLES = ["inventor", "investor", "organization"];
    const role = ALLOWED_ROLES.includes(req.body.role) ? req.body.role : "inventor";

    if (!firstName || !lastName || !email || !password)
      return res.status(400).json({ message: "First name, last name, email, and password are required." });
    if (password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });

    const user      = await userModel.createUser(firstName, lastName, email, password, phone, role);
    const freshUser = await userModel.getUserById(user.id);

    const accessToken   = generateToken(freshUser);
    const refreshToken  = generateRefreshToken(freshUser);
    setRefreshCookie(res, refreshToken);

    return res.status(201).json({
      message: "Registration successful",
      token:   accessToken,
      user:    userPayload(freshUser),
      redirect: "/home",
    });
  } catch (error) {
    const status = error.message.includes("already exists") ? 409 : 400;
    return res.status(status).json({ message: error.message });
  }
}

/* â”€â”€ POST /api/auth/login â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function userLogin(req, res) {
  try {
    const email    = String(req.body.email || "").trim().toLowerCase();
    const { password } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required." });

    const user = await userModel.getUserByEmail(email);

    // Use a constant-time invalid response when email not found to prevent
    // user enumeration via timing differences
    if (!user) {
      await require("../utils/password").hashPassword("dummy_timing_equalizer").catch(() => {});
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const { valid, needsUpgrade } = await verifyPassword(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: "Invalid email or password." });

    // Check account status AFTER password verification to prevent user enumeration
    if (user.status !== "active")
      return res.status(403).json({ message: "Your account is not active. Please contact support." });

    if (needsUpgrade)
      User.setPasswordHash(user.id, await hashPassword(password)).catch(() => {});

    userModel.updateLastLogin(user.id).catch(() => {});

    const accessToken  = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    return res.status(200).json({
      message: "Login successful",
      token:   accessToken,
      user:    userPayload(user),
      redirect: "/home",
    });
  } catch {
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }
}

/* â”€â”€ POST /api/auth/refresh â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function refreshToken(req, res) {
  try {
    const { REFRESH_COOKIE } = require("../utils/jwt");
    const raw = req.cookies?.[REFRESH_COOKIE];
    if (!raw) return res.status(401).json({ message: "No refresh token." });

    const decoded = verifyRefreshToken(raw); // throws if invalid/expired

    // Load fresh user data + check token_version
    const [[row]] = await db.execute(
      `SELECT u.id, u.uuid, u.email, u.role, u.status, u.token_version,
              p.first_name, p.last_name, p.profile_photo, p.verification_level, p.headline
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [decoded.id]
    );

    if (!row)
      return res.status(401).json({ message: "User not found." });
    if (row.status === "suspended")
      return res.status(403).json({ message: "Your account has been suspended.", code: "ACCOUNT_SUSPENDED" });
    if (decoded.version < (row.token_version ?? 0))
      return res.status(401).json({ message: "Session revoked. Please log in again.", code: "TOKEN_REVOKED" });

    // Issue a fresh access token
    const accessToken = generateToken(row);
    return res.json({ token: accessToken, user: userPayload(row) });
  } catch {
    return res.status(401).json({ message: "Invalid or expired refresh token." });
  }
}

/* â”€â”€ POST /api/auth/logout â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function logout(req, res) {
  try {
    clearRefreshCookie(res);

    // Increment token_version to revoke ALL tokens for this user immediately.
    // requireAuth carries the user from the Bearer token so we know who's logging out.
    if (req.user?.id) {
      await db.execute(
        "UPDATE users SET token_version = token_version + 1 WHERE id = ?",
        [req.user.id]
      ).catch(() => {});
    }

    return res.json({ message: "Logged out successfully." });
  } catch {
    return res.status(500).json({ message: "Logout failed." });
  }
}

/* â”€â”€ Platform stats (public â€” for landing page) â”€â”€ */
const { getOrSet } = require("../utils/cache");
async function getPlatformStats(req, res) {
  try {
    // Cache for 5 minutes â€” these counters don't need to be real-time
    const stats = await getOrSet("platform_stats", () => userModel.getPlatformStats(), 300);
    return res.status(200).json({ stats });
  } catch {
    return res.status(500).json({ message: "Could not fetch stats." });
  }
}

/* â”€â”€ Public member directory â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getPublicDirectory(req, res) {
  try {
    const { role = "investor" } = req.query;
    const limit  = Math.min(Math.max(parseInt(req.query.limit,  10) || 12, 1), 100);
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
    const allowed = ["investor", "organization", "inventor"];
    if (!allowed.includes(role))
      return res.status(400).json({ message: "Invalid role for directory." });
    const members = await User.findPublicDirectory({ role, limit, offset });
    return res.json({ members });
  } catch (error) {
    return res.status(500).json({ message: "Could not fetch directory." });
  }
}

/* â”€â”€ Success stories â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getSuccessStories(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT i.offered_amount, i.status, i.updated_at,
              s.name AS startup_name, s.industry,
              fp.first_name AS founder_first, fp.last_name AS founder_last
       FROM investments i
       JOIN startups s ON s.id = i.startup_id
       JOIN users fu ON fu.id = s.owner_id
       LEFT JOIN profiles fp ON fp.user_id = fu.id
       WHERE i.status IN ('completed','accepted')
       ORDER BY i.updated_at DESC LIMIT 6`
    );
    const stories = rows.map((r) => {
      const amount = Number(r.offered_amount || 0);
      const lbl = amount >= 1000000 ? `$${(amount/1e6).toFixed(1)}M`
        : amount >= 1000 ? `$${Math.round(amount/1000)}K` : `$${amount}`;
      return {
        quote: amount > 0
          ? `${r.startup_name} secured ${lbl} in funding through InventBridge.`
          : `${r.startup_name} found investment partners on InventBridge.`,
        name:    `${r.founder_first || ""} ${r.founder_last || ""}`.trim() || r.startup_name,
        role:    `Founder, ${r.startup_name}`,
        funding: amount > 0 ? lbl : null,
        initials:`${(r.founder_first || r.startup_name).charAt(0)}${(r.founder_last || "").charAt(0) || ""}`.toUpperCase(),
      };
    });
    return res.json({ stories });
  } catch {
    return res.status(500).json({ message: "Could not fetch success stories." });
  }
}

/* â”€â”€ Legacy admin routes (kept for compatibility) â”€â”€ */
async function getUsers(req, res) {
  try { return res.status(200).json({ users: await userModel.getUsers() }); }
  catch (error) { return res.status(500).json({ message: error.message }); }
}
async function getUserById(req, res) {
  try { return res.status(200).json({ user: await userModel.getUserById(req.params.id) }); }
  catch (error) { return res.status(404).json({ message: error.message }); }
}
async function updateUser(req, res) {
  try {
    const { firstName, lastName, email, phone, role } = req.body;
    const user = await userModel.updateUser(req.params.id, firstName, lastName, email, phone, role);
    return res.status(200).json({ message: "User updated successfully", user });
  } catch (error) { return res.status(400).json({ message: error.message }); }
}
async function updatePassword(req, res) {
  try {
    const { password } = req.body;
    if (!password || password.length < 8)
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    return res.status(200).json(await userModel.updatePassword(req.params.id, password));
  } catch (error) { return res.status(400).json({ message: error.message }); }
}
async function deleteUser(req, res) {
  try { return res.status(200).json(await userModel.deleteUser(req.params.id)); }
  catch (error) { return res.status(400).json({ message: error.message }); }
}

module.exports = {
  createUser, userLogin, refreshToken, logout,
  getPlatformStats, getPublicDirectory, getSuccessStories,
  getUsers, getUserById, updateUser, updatePassword, deleteUser,
};


