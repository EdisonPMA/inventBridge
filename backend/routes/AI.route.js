/**
 * AI routes — /api/ai
 *
 * All routes:
 *  - requireAuth      — valid JWT required
 *  - rejectSuspended  — suspended users cannot call AI
 *  - aiLimiter        — 10 req/min per user, prevents token abuse
 *  - body validators  — express-validator for each endpoint
 *
 * Role guards are enforced inside each controller action.
 * The API key never touches this file — lives only in aiService.js.
 */
const router          = require("express").Router();
const { body }        = require("express-validator");
const c               = require("../controllers/AI.controller");
const { requireAuth } = require("../middelwares/auth.middleware");
const { rejectSuspended } = require("../middelwares/suspended.middleware");
const { aiLimiter }   = require("../middelwares/rateLimit.middleware");
const validate        = require("../middelwares/validate");

// Apply auth + suspension + rate limit to every AI route
router.use(requireAuth, rejectSuspended, aiLimiter);

/* ── 1. Startup recommendations for an investor ── */
router.post(
  "/startup-recommendations",
  [
    body("limit").optional().isInt({ min: 1, max: 10 }).withMessage("limit must be 1–10."),
  ],
  validate,
  c.startupRecommendations
);

/* ── 2. Investor matches for a startup founder ─── */
router.post(
  "/investor-matches",
  [
    body("startup_id").notEmpty().isInt({ min: 1 }).withMessage("startup_id must be a positive integer.").toInt(),
    body("limit").optional().isInt({ min: 1, max: 10 }).withMessage("limit must be 1–10."),
  ],
  validate,
  c.investorMatches
);

/* ── 3. Deep startup profile analysis ────────────  */
router.post(
  "/startup-analysis",
  [
    body("startup_id").notEmpty().isInt({ min: 1 }).withMessage("startup_id must be a positive integer.").toInt(),
  ],
  validate,
  c.startupAnalysis
);

/* ── 4. Explain a specific recommendation ────────  */
router.post(
  "/explain-recommendation",
  [
    body("startup_id").notEmpty().isInt({ min: 1 }).withMessage("startup_id must be a positive integer.").toInt(),
    body("investor_id").optional().isInt({ min: 1 }).withMessage("investor_id must be a positive integer.").toInt(),
  ],
  validate,
  c.explainRecommendation
);

/* ── 5. Profile improvement suggestions ──────────  */
router.post(
  "/profile-suggestions",
  [
    body("startup_id").optional().isInt({ min: 1 }).withMessage("startup_id must be a positive integer.").toInt(),
  ],
  validate,
  c.profileSuggestions
);

/* ── 6. Startup / ecosystem insights ─────────────  */
router.post(
  "/startup-insights",
  [
    body("startup_id").optional().isInt({ min: 1 }).withMessage("startup_id must be a positive integer.").toInt(),
  ],
  validate,
  c.startupInsights
);

module.exports = router;
