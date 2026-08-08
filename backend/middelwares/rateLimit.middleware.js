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
 * Auth limiter — 10 login attempts per IP per 15 minutes.
 * Applied only to /login and /refresh.
 */
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  message:          { message: "Too many attempts. Please try again in 15 minutes." },
  standardHeaders:  true,
  legacyHeaders:    false,
});

/**
 * Register limiter — 5 registrations per IP per hour.
 * More lenient than login but still prevents signup spam.
 */
const registerLimiter = rateLimit({
  windowMs:         60 * 60 * 1000, // 1 hour
  max:              5,
  message:          { message: "Too many registration attempts. Please try again in an hour." },
  standardHeaders:  true,
  legacyHeaders:    false,
});

/**
 * General API limiter — 100 requests per IP per minute.
 * Tightened for free-tier hosting (Render 512MB RAM, shared CPU).
 */
const generalLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              100,
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
