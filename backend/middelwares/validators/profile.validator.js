/**
 * Profile validators
 * Used by: PUT /api/profiles/me, PUT /api/profiles/me/photo
 */
const { body } = require("express-validator");

const VALID_GENDERS = ["male", "female", "non_binary", "prefer_not_to_say"];
const VALID_VERIFICATION_LEVELS = ["unverified", "pending", "verified", "rejected"];

/* ── Update profile ──────────────────────────────── */
const updateProfileValidator = [
  body("first_name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("First name must be 2–100 characters.")
    .matches(/^[a-zA-ZÀ-ÿ' -]+$/).withMessage("First name contains invalid characters."),

  body("last_name")
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Last name must be 2–100 characters.")
    .matches(/^[a-zA-ZÀ-ÿ' -]+$/).withMessage("Last name contains invalid characters."),

  body("gender")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(VALID_GENDERS).withMessage(`Gender must be one of: ${VALID_GENDERS.join(", ")}.`),

  body("birth_date")
    .optional({ nullable: true, checkFalsy: true })
    .isDate({ format: "YYYY-MM-DD" }).withMessage("Birth date must be in YYYY-MM-DD format.")
    .custom((val) => {
      const age = (Date.now() - new Date(val)) / (365.25 * 24 * 3600 * 1000);
      if (age < 13) throw new Error("Must be at least 13 years old.");
      if (age > 120) throw new Error("Enter a valid birth date.");
      return true;
    }),

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

  body("headline")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 200 }).withMessage("Headline must be at most 200 characters."),

  body("bio")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 2000 }).withMessage("Bio must be at most 2000 characters."),

  body("website")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"], require_tld: true })
    .withMessage("Website must be a valid URL.")
    .isLength({ max: 255 }).withMessage("Website URL must be at most 255 characters."),

  body("linkedin")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] })
    .withMessage("LinkedIn must be a valid URL.")
    .contains("linkedin.com").withMessage("Must be a LinkedIn profile URL.")
    .isLength({ max: 255 }).withMessage("LinkedIn URL must be at most 255 characters."),
];

/* ── Update photo (URL-based, not file upload) ───── */
const updatePhotoValidator = [
  body("profile_photo")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("profile_photo must be a valid URL."),

  body("cover_photo")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("cover_photo must be a valid URL."),
];

/* ── Admin: set verification level ──────────────── */
const verificationLevelValidator = [
  body("level")
    .trim()
    .notEmpty().withMessage("level is required.")
    .isIn(VALID_VERIFICATION_LEVELS)
    .withMessage(`level must be one of: ${VALID_VERIFICATION_LEVELS.join(", ")}.`),
];

module.exports = {
  updateProfileValidator,
  updatePhotoValidator,
  verificationLevelValidator,
};
