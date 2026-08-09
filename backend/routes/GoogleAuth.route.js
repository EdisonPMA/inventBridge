/**
 * Google OAuth routes — mounted at /api/auth
 * GET /api/auth/google           → redirect to Google consent
 * GET /api/auth/google/callback  → handle callback, issue JWT
 */
const router = require("express").Router();
const rateLimit = require("express-rate-limit");
const { authLimiter } = require("../middelwares/rateLimit.middleware");
const { initiateGoogleAuth, handleGoogleCallback, exchangeOtc } = require("../controllers/GoogleAuth.controller");

// Separate limiter for Google OAuth initiation — looser than authLimiter
// The frontend does a HEAD probe before each click, so we need generous limits
const googleAuthLimiter = rateLimit({
  windowMs:        15 * 60 * 1000,
  max:             60, // 60 OAuth attempts per IP per 15 min
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { message: "Too many sign-in attempts. Please wait 15 minutes." },
});

router.get("/google",          googleAuthLimiter, initiateGoogleAuth);
router.head("/google",         googleAuthLimiter, (_req, res) => res.status(200).end()); // HEAD probe
router.get("/google/callback", handleGoogleCallback);
// Exchange one-time code for access token — no Bearer token needed (public)
router.post("/google/exchange", authLimiter, exchangeOtc);

module.exports = router;
