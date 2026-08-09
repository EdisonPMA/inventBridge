/**
 * JWT utilities — access tokens + refresh tokens.
 *
 * Access token:  short-lived (15 min), sent as Authorization Bearer header.
 * Refresh token: long-lived (7 days), stored in httpOnly Secure cookie only.
 *
 * The refresh token payload carries { id, version } where version must match
 * users.token_version in the DB — incrementing it instantly revokes all
 * existing refresh tokens for that user without any blacklist table.
 */
const jwt = require("jsonwebtoken");
require("../config/env");

const ACCESS_EXPIRY  = "15m";
const REFRESH_EXPIRY = "7d";

// Fail fast in production if secrets are not properly configured
if (process.env.NODE_ENV === "production") {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET must be set in production.");
  if (!process.env.JWT_REFRESH_SECRET) {
    console.warn("[WARN] JWT_REFRESH_SECRET not set — using derived secret. Set an independent secret for best security.");
  }
}

/* ── Access token ────────────────────────────────── */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, tv: user.token_version ?? 0 },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRY }
  );
}

function verifyToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("Invalid or expired token");
  }
}

/* ── Refresh token ───────────────────────────────── */
function generateRefreshToken(user) {
  const secret  = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
  const version = user.token_version ?? 0;
  return jwt.sign(
    { id: user.id, version },
    secret,
    { expiresIn: REFRESH_EXPIRY }
  );
}

function verifyRefreshToken(token) {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
  try {
    return jwt.verify(token, secret); // { id, version, iat, exp }
  } catch {
    throw new Error("Invalid or expired refresh token");
  }
}

/* ── Cookie helpers ──────────────────────────────── */
const REFRESH_COOKIE = "innovest_refresh";

/** Set the refresh token as an httpOnly Secure SameSite cookie. */
function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === "production";
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure:   isProd,           // HTTPS only in production
    sameSite: isProd ? "none" : "strict", // "none" required for cross-origin (Vercel → Render)
    maxAge:   7 * 24 * 60 * 60 * 1000,   // 7 days in ms
    path:     "/api/auth",               // only sent to /api/auth/* routes
  });
}

/** Clear the refresh token cookie on logout. */
function clearRefreshCookie(res) {
  const isProd = process.env.NODE_ENV === "production";
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure:   isProd,
    sameSite: isProd ? "none" : "strict",
    path:     "/api/auth",
  });
}

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
  setRefreshCookie,
  clearRefreshCookie,
  REFRESH_COOKIE,
};
