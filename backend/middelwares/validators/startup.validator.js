/**
 * Startup validators
 * Used by: POST /api/startups, PUT /api/startups/:id,
 *          PUT /api/startups/:id/status, PUT /api/startups/:id/verify
 */
const { body, param, query } = require("express-validator");

const VALID_STAGES = ["idea", "prototype", "mvp", "growth", "scaling", "exit"];
const VALID_STATUSES = ["draft", "published", "suspended", "archived"];
const VALID_VERIFICATION = ["pending", "under_review", "verified", "rejected"];
const VALID_REG_TYPES = ["early_stage", "registered", "incorporated"];

/* ── Create startup ──────────────────────────────── */
const createStartupValidator = [
  body("name")
    .trim()
    .notEmpty().withMessage("Startup name is required.")
    .isLength({ min: 2, max: 200 }).withMessage("Name must be 2–200 characters."),

  body("category_id")
    .notEmpty().withMessage("category_id is required.")
    .isInt({ min: 1 }).withMessage("category_id must be a positive integer.")
    .toInt(),

  body("description")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 5000 }).withMessage("Description must be at most 5000 characters."),

  body("problem")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 }).withMessage("Problem statement must be at most 3000 characters."),

  body("solution")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 }).withMessage("Solution must be at most 3000 characters."),

  body("mission")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage("Mission must be at most 1000 characters."),

  body("vision")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 1000 }).withMessage("Vision must be at most 1000 characters."),

  body("business_model")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 }).withMessage("Business model must be at most 3000 characters."),

  body("revenue_model")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 }).withMessage("Revenue model must be at most 3000 characters."),

  body("industry")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 150 }).withMessage("Industry must be at most 150 characters."),

  body("stage")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .toLowerCase()
    .isIn(VALID_STAGES).withMessage(`Stage must be one of: ${VALID_STAGES.join(", ")}.`),

  body("funding_required")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 1_000_000_000 }).withMessage("Funding required must be a positive number up to 1 billion.")
    .toFloat(),

  body("equity_offered")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage("Equity offered must be between 0 and 100.")
    .toFloat(),

  body("country")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage("Country must be at most 100 characters."),

  body("province")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage("Province must be at most 100 characters."),

  body("district")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage("District must be at most 100 characters."),

  body("registration_type")
    .optional()
    .trim()
    .isIn(VALID_REG_TYPES).withMessage(`Registration type must be one of: ${VALID_REG_TYPES.join(", ")}.`),

  body("registration_number")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 100 }).withMessage("Registration number must be at most 100 characters."),
];

/* ── Update startup (same rules, all optional) ───── */
const updateStartupValidator = createStartupValidator.map((rule) =>
  rule.optional ? rule : rule
);

/* ── Update status ───────────────────────────────── */
const updateStatusValidator = [
  body("status")
    .trim()
    .notEmpty().withMessage("status is required.")
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}.`),
];

/* ── Admin: verify startup ───────────────────────── */
const verifyStartupValidator = [
  body("verification_status")
    .trim()
    .notEmpty().withMessage("verification_status is required.")
    .isIn(VALID_VERIFICATION)
    .withMessage(`Verification status must be one of: ${VALID_VERIFICATION.join(", ")}.`),
];

/* ── List query params ───────────────────────────── */
const listStartupsValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage("limit must be between 1 and 100.")
    .toInt(),

  query("offset")
    .optional()
    .isInt({ min: 0 }).withMessage("offset must be a non-negative integer.")
    .toInt(),

  query("stage")
    .optional()
    .isIn([...VALID_STAGES, ""]).withMessage(`Invalid stage value.`),

  query("search")
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Search query too long."),
];

module.exports = {
  createStartupValidator,
  updateStartupValidator,
  updateStatusValidator,
  verifyStartupValidator,
  listStartupsValidator,
};
