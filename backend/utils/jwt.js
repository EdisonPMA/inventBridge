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

/** Set the refresh token as an httpOnly Secure SameSite=Strict cookie. */
function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly:  true,
    secure:    process.env.NODE_ENV === "production",
    sameSite:  "strict",
    maxAge:    7 * 24 * 60 * 60 * 1000, // 7 days in ms
    path:      "/api/auth",             // only sent to /api/auth/* routes
  });
}

/** Clear the refresh token cookie on logout. */
function clearRefreshCookie(res) {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    sameSite: "strict",
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
