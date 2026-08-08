/**
 * Investment validators
 */
const { body } = require("express-validator");

const VALID_STATUSES = [
  "pending", "negotiating", "accepted", "rejected", "completed", "cancelled",
];

/* ── Create investment offer ─────────────────────── */
const createInvestmentValidator = [
  body("startup_id")
    .notEmpty().withMessage("startup_id is required.")
    .isInt({ min: 1 }).withMessage("startup_id must be a positive integer.")
    .toInt(),

  body("requested_amount")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 1_000_000_000 }).withMessage("requested_amount must be between 0 and 1 billion.")
    .toFloat(),

  body("offered_amount")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 1_000_000_000 }).withMessage("offered_amount must be between 0 and 1 billion.")
    .toFloat(),

  body("equity_percentage")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage("equity_percentage must be between 0 and 100.")
    .toFloat(),

  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 }).withMessage("Notes must be at most 3000 characters."),
];

/* ── Update status ───────────────────────────────── */
const updateStatusValidator = [
  body("status")
    .trim()
    .notEmpty().withMessage("status is required.")
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}.`),
];

/* ── Counter-offer ───────────────────────────────── */
const updateOfferValidator = [
  body("offered_amount")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 1_000_000_000 }).withMessage("offered_amount must be between 0 and 1 billion.")
    .toFloat(),

  body("equity_percentage")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage("equity_percentage must be between 0 and 100.")
    .toFloat(),

  body("notes")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 3000 }).withMessage("Notes must be at most 3000 characters."),
];

/* ── Attach agreement URL ────────────────────────── */
const attachAgreementValidator = [
  body("agreement_url")
    .trim()
    .notEmpty().withMessage("agreement_url is required.")
    .isURL({ protocols: ["http", "https"] }).withMessage("agreement_url must be a valid URL.")
    .isLength({ max: 500 }).withMessage("agreement_url too long."),
];

module.exports = {
  createInvestmentValidator,
  updateStatusValidator,
  updateOfferValidator,
  attachAgreementValidator,
};
