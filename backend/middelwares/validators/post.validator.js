/**
 * Post & Comment validators
 */
const { body, query } = require("express-validator");

const VALID_VISIBILITY = ["public", "connections", "private"];

/* ── Create / update post ────────────────────────── */
const createPostValidator = [
  body("content")
    .trim()
    .notEmpty().withMessage("Post content is required.")
    .isLength({ min: 1, max: 5000 }).withMessage("Content must be 1–5000 characters."),

  body("startup_id")
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 }).withMessage("startup_id must be a positive integer.")
    .toInt(),

  body("image_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("image_url must be a valid URL.")
    .isLength({ max: 500 }).withMessage("image_url too long."),

  body("video_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("video_url must be a valid URL.")
    .isLength({ max: 500 }).withMessage("video_url too long."),

  body("visibility")
    .optional()
    .trim()
    .isIn(VALID_VISIBILITY).withMessage(`Visibility must be one of: ${VALID_VISIBILITY.join(", ")}.`),
];

const updatePostValidator = [
  body("content")
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 }).withMessage("Content must be 1–5000 characters."),

  body("image_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("image_url must be a valid URL."),

  body("video_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("video_url must be a valid URL."),

  body("visibility")
    .optional()
    .trim()
    .isIn(VALID_VISIBILITY).withMessage(`Visibility must be one of: ${VALID_VISIBILITY.join(", ")}.`),
];

/* ── Comment ─────────────────────────────────────── */
const commentValidator = [
  body("comment")
    .trim()
    .notEmpty().withMessage("Comment text is required.")
    .isLength({ min: 1, max: 2000 }).withMessage("Comment must be 1–2000 characters."),
];

/* ── Feed query params ───────────────────────────── */
const feedQueryValidator = [
  query("limit")
    .optional()
    .isInt({ min: 1, max: 50 }).withMessage("limit must be 1–50.")
    .toInt(),

  query("offset")
    .optional()
    .isInt({ min: 0 }).withMessage("offset must be >= 0.")
    .toInt(),
];

module.exports = {
  createPostValidator,
  updatePostValidator,
  commentValidator,
  feedQueryValidator,
};
