/**
 * validate.js  —  shared validation result handler
 *
 * Drop this after any array of express-validator check() chains.
 * If there are errors it responds 422 with a structured list.
 * If clean it calls next().
 *
 * Usage:
 *   const { body } = require('express-validator');
 *   const validate = require('../middelwares/validate');
 *
 *   router.post('/register',
 *     [body('email').isEmail(), body('password').isLength({ min: 8 })],
 *     validate,
 *     controller
 *   );
 */
const { validationResult } = require("express-validator");

function validate(req, res, next) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();

  // Return first error per field (keeps response small)
  const formatted = {};
  for (const err of errors.array({ onlyFirstError: true })) {
    const key = err.path || err.param || "field";
    if (!formatted[key]) formatted[key] = err.msg;
  }

  return res.status(422).json({
    message: "Validation failed.",
    errors:  formatted,
  });
}

module.exports = validate;
