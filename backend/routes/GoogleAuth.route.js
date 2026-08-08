/**
 * Google OAuth routes — mounted at /api/auth
 * GET /api/auth/google           → redirect to Google consent
 * GET /api/auth/google/callback  → handle callback, issue JWT
 */
const router = require("express").Router();
const { authLimiter } = require("../middelwares/rateLimit.middleware");
const { initiateGoogleAuth, handleGoogleCallback, exchangeOtc } = require("../controllers/GoogleAuth.controller");

router.get("/google",          authLimiter, initiateGoogleAuth);
router.get("/google/callback", handleGoogleCallback);
// Exchange one-time code for access token — no Bearer token needed (public)
router.post("/google/exchange", authLimiter, exchangeOtc);

module.exports = router;
