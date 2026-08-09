/**
 * Rate limiting middleware
 * Protects upload endpoints and auth endpoints from abuse.
 */
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");

/**
 * Upload limiter — 20 uploads per IP per 15 minutes.
 */
const uploadLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              20,
  message:          { message: "Too many upload requests. Please wait 15 minutes and try again." },
  standardHeaders:  true,
  legacyHeaders:    false,
});

/**
 * Auth limiter — 30 login attempts per IP per 15 minutes.
 * Applied only to /login and /refresh.
 */
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              30,
  message:          { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders:  true,
  legacyHeaders:    false,
});

/**
 * Register limiter — 20 registrations per IP per hour.
 */
const registerLimiter = rateLimit({
  windowMs:         60 * 60 * 1000,
  max:              20,
  message:          { message: "Too many registration attempts. Please try again in an hour." },
  standardHeaders:  true,
  legacyHeaders:    false,
});

/**
 * General API limiter — 300 requests per IP per minute.
 */
const generalLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              300,
  message:          { message: "Too many requests. Please slow down." },
  standardHeaders:  true,
  legacyHeaders:    false,
});

/**
 * AI limiter — 10 AI requests per user per minute.
 * Keyed by user ID (from JWT) when available, falls back to IP.
 * Prevents runaway token costs and abuse.
 */
const aiLimiter = rateLimit({
  windowMs:        60 * 1000,   // 1 minute
  max:             10,
  // Key by user ID when authenticated (most precise), fall back to IPv6-safe IP
  keyGenerator:    (req) => req.user?.id ? `ai_user_${req.user.id}` : ipKeyGenerator(req),
  message:         { message: "Too many AI requests. Please wait a moment before trying again." },
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            (req) => req.user?.role === "admin",
});

module.exports = { uploadLimiter, authLimiter, registerLimiter, generalLimiter, aiLimiter };
