/**
 * StartupMember validators
 * Members do NOT require a platform account — identified by name/email.
 */
const { body } = require("express-validator");

const addMemberValidator = [
  body("name")
    .notEmpty().withMessage("Member name is required.")
    .trim()
    .isLength({ max: 150 }).withMessage("Name must be at most 150 characters."),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage("Invalid email address.")
    .isLength({ max: 150 }).withMessage("Email must be at most 150 characters.")
    .normalizeEmail(),

  body("position")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage("Position must be at most 120 characters."),

  body("bio")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage("Bio must be at most 500 characters."),

  body("ownership_percentage")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage("Ownership percentage must be between 0 and 100.")
    .toFloat(),
];

const updateMemberValidator = [
  body("name")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 150 }).withMessage("Name must be at most 150 characters."),

  body("email")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isEmail().withMessage("Invalid email address.")
    .normalizeEmail(),

  body("position")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 120 }).withMessage("Position must be at most 120 characters."),

  body("bio")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage("Bio must be at most 500 characters."),

  body("ownership_percentage")
    .optional({ nullable: true, checkFalsy: true })
    .isFloat({ min: 0, max: 100 }).withMessage("Ownership percentage must be between 0 and 100.")
    .toFloat(),
];

module.exports = { addMemberValidator, updateMemberValidator };
