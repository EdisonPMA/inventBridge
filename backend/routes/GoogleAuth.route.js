/**
 * Google OAuth routes — mounted at /api/auth
 * GET /api/auth/google           → redirect to Google consent
 * GET /api/auth/google/callback  → handle callback, issue JWT
 */
const router = require("express").Router();
const { authLimiter } = require("../middelwares/rateLimit.middleware");
const { initiateGoogleAuth, handleGoogleCallback, exchangeOtc } = require("../controllers/GoogleAuth.controller");

router.get("/google",          initiateGoogleAuth);
router.head("/google",         (_req, res) => res.status(200).end()); // HEAD probe from frontend
router.get("/google/callback", handleGoogleCallback);
router.post("/google/exchange", authLimiter, exchangeOtc);

module.exports = router;
