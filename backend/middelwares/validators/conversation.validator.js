/**
 * Conversation & Message validators
 */
const { body, param } = require("express-validator");

const VALID_TYPES = ["private", "group"];

/* ── Create conversation ─────────────────────────── */
const createConversationValidator = [
  body("participant_ids")
    .isArray({ min: 1 }).withMessage("participant_ids must be a non-empty array.")
    .custom((ids) => ids.every((id) => Number.isInteger(id) && id > 0))
    .withMessage("Each participant_id must be a positive integer."),

  body("type")
    .optional()
    .trim()
    .isIn(VALID_TYPES).withMessage(`Type must be one of: ${VALID_TYPES.join(", ")}.`),

  body("title")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 255 }).withMessage("Title must be at most 255 characters."),
];

/* ── Update title ────────────────────────────────── */
const updateTitleValidator = [
  body("title")
    .trim()
    .notEmpty().withMessage("title is required.")
    .isLength({ max: 255 }).withMessage("Title must be at most 255 characters."),
];

/* ── Add participant ─────────────────────────────── */
const addParticipantValidator = [
  body("user_id")
    .notEmpty().withMessage("user_id is required.")
    .isInt({ min: 1 }).withMessage("user_id must be a positive integer.")
    .toInt(),
];

/* ── Send message ────────────────────────────────── */
const sendMessageValidator = [
  body("message")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isLength({ max: 10000 }).withMessage("Message must be at most 10,000 characters."),

  body("attachment_url")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isURL({ protocols: ["http", "https"] }).withMessage("attachment_url must be a valid URL.")
    .isLength({ max: 500 }).withMessage("attachment_url too long."),

  body("attachment_type")
    .optional({ nullable: true, checkFalsy: true })
    .trim()
    .isIn(["image", "video", "file", "audio", "shared_post"]).withMessage("Invalid attachment_type."),

  // Custom: must have at least message or attachment_url
  body("message").custom((val, { req }) => {
    if (!val && !req.body.attachment_url) {
      throw new Error("Message must have text content or an attachment.");
    }
    return true;
  }),
];

module.exports = {
  createConversationValidator,
  updateTitleValidator,
  addParticipantValidator,
  sendMessageValidator,
};
