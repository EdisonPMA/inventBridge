/**
 * GoogleAuth.controller.js
 *
 * GET /api/auth/google           â€” redirect to Google consent screen
 * GET /api/auth/google/callback  â€” handle OAuth callback, issue JWT, redirect frontend
 *
 * Security: the access token is NOT placed in the redirect URL.
 * Instead a short-lived one-time code (OTC) is stored server-side in a Map,
 * and the frontend exchanges it via POST /api/auth/google/exchange.
 * This prevents the token from appearing in browser history / logs / Referer headers.
 */
const passport = require("passport");
const crypto   = require("crypto");
const {
  generateToken,
  generateRefreshToken,
  setRefreshCookie,
} = require("../utils/jwt");

require("../config/env");

const CLIENT_URL = (() => {
  const url = process.env.CLIENT_URL || process.env.CLIENT_ORIGIN;
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("CLIENT_URL must be set in production.");
  }
  return url || "http://localhost:5173";
})();

/* â”€â”€ One-time code store (in-memory, TTL 2 min, max 500 entries) â”€â”€â”€â”€â”€ */
const OTC_MAX = 500;
const otcStore = new Map(); // code â†’ { user, accessToken, expiresAt }

function storeOtc(user, accessToken) {
  // Evict oldest entry if at capacity to prevent unbounded memory growth
  if (otcStore.size >= OTC_MAX) {
    const oldestKey = otcStore.keys().next().value;
    otcStore.delete(oldestKey);
  }
  const code = crypto.randomBytes(32).toString("hex");
  otcStore.set(code, {
    user,
    accessToken,
    expiresAt: Date.now() + 2 * 60 * 1000, // 2 minutes
  });
  // Self-cleanup
  setTimeout(() => otcStore.delete(code), 2 * 60 * 1000);
  return code;
}

/** Build user payload matching existing auth format */
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

/* â”€â”€ GET /api/auth/google â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const initiateGoogleAuth = passport.authenticate("google", {
  scope:   ["profile", "email"],
  prompt:  "select_account",
  session: false,
});

/* â”€â”€ GET /api/auth/google/callback â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function handleGoogleCallback(req, res, next) {
  passport.authenticate("google", { session: false }, (err, user, info) => {
    if (err) {
      console.error("[GoogleAuth] OAuth error:", err.message);
      return res.redirect(
        `${CLIENT_URL}/?error=${encodeURIComponent("Authentication failed. Please try again.")}`
      );
    }
    if (!user) {
      const msg = info?.message || "Google authentication failed.";
      return res.redirect(`${CLIENT_URL}/?error=${encodeURIComponent(msg)}`);
    }

    try {
      const accessToken  = generateToken(user);
      const refreshToken = generateRefreshToken(user);

      // httpOnly Secure cookie â€” same as email/password login
      setRefreshCookie(res, refreshToken);

      // Store a short-lived one-time code; redirect only the code (not the token)
      const otc = storeOtc(userPayload(user), accessToken);

      return res.redirect(`${CLIENT_URL}/auth/google/callback?code=${encodeURIComponent(otc)}`);
    } catch (tokenErr) {
      console.error("[GoogleAuth] Token error:", tokenErr.message);
      return res.redirect(
        `${CLIENT_URL}/?error=${encodeURIComponent("Session creation failed. Please try again.")}`
      );
    }
  })(req, res, next);
}

/* â”€â”€ POST /api/auth/google/exchange â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
// Frontend POSTs the one-time code; receives the access token in JSON (never in URL).
function exchangeOtc(req, res) {
  const { code } = req.body;
  if (!code) return res.status(400).json({ message: "code is required." });

  const entry = otcStore.get(code);
  if (!entry) return res.status(401).json({ message: "Invalid or expired authentication code." });
  if (Date.now() > entry.expiresAt) {
    otcStore.delete(code);
    return res.status(401).json({ message: "Authentication code expired. Please sign in again." });
  }

  otcStore.delete(code); // one-time use
  return res.json({ token: entry.accessToken, user: entry.user });
}

module.exports = { initiateGoogleAuth, handleGoogleCallback, exchangeOtc };

