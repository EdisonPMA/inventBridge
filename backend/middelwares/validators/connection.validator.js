/**
 * Connection validators
 */
const { body, param } = require("express-validator");

const VALID_STATUSES = ["accepted", "rejected", "blocked"];

const sendRequestValidator = [
  body("receiver_id")
    .notEmpty().withMessage("receiver_id is required.")
    .isInt({ min: 1 }).withMessage("receiver_id must be a positive integer.")
    .toInt(),
];

const updateStatusValidator = [
  body("status")
    .trim()
    .notEmpty().withMessage("status is required.")
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(", ")}.`),
];

module.exports = { sendRequestValidator, updateStatusValidator };
