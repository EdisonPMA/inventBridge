/**
 * Auth validators
 * Used by: POST /api/auth/register, POST /api/auth/login
 */
const { body } = require("express-validator");

const VALID_ROLES = ["inventor", "investor", "organization", "admin"];

/* ── Register ────────────────────────────────────── */
const registerValidator = [
  body("firstName")
    .trim()
    .notEmpty().withMessage("First name is required.")
    .isLength({ min: 2, max: 50 }).withMessage("First name must be 2–50 characters.")
    .matches(/^[a-zA-ZÀ-ÿ' -]+$/).withMessage("First name contains invalid characters."),

  body("lastName")
    .trim()
    .notEmpty().withMessage("Last name is required.")
    .isLength({ min: 2, max: 50 }).withMessage("Last name must be 2–50 characters.")
    .matches(/^[a-zA-ZÀ-ÿ' -]+$/).withMessage("Last name contains invalid characters."),

  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Enter a valid email address.")
    .normalizeEmail()
    .isLength({ max: 150 }).withMessage("Email must be at most 150 characters."),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters.")
    .isLength({ max: 128 }).withMessage("Password must be at most 128 characters.")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Password must contain at least one number."),

  body("phone")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .matches(/^\+?[1-9]\d{6,14}$/).withMessage("Enter a valid phone number (E.164 format)."),

  body("role")
    .optional()
    .trim()
    .toLowerCase()
    .isIn(VALID_ROLES).withMessage(`Role must be one of: ${VALID_ROLES.join(", ")}.`),
];

/* ── Login ───────────────────────────────────────── */
const loginValidator = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email is required.")
    .isEmail().withMessage("Enter a valid email address.")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required.")
    .isLength({ max: 128 }).withMessage("Password is too long."),
];

/* ── Change password ─────────────────────────────── */
const changePasswordValidator = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required."),

  body("newPassword")
    .notEmpty().withMessage("New password is required.")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters.")
    .isLength({ max: 128 }).withMessage("New password must be at most 128 characters.")
    .matches(/[A-Z]/).withMessage("Must contain at least one uppercase letter.")
    .matches(/[0-9]/).withMessage("Must contain at least one number."),
];

module.exports = { registerValidator, loginValidator, changePasswordValidator };
