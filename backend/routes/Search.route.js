const router = require("express").Router();
const { globalSearch } = require("../controllers/Search.controller");
const { generalLimiter } = require("../middelwares/rateLimit.middleware");
const rateLimit = require("express-rate-limit");

// Dedicated search limiter — search runs FULLTEXT + LIKE across 3 tables
const searchLimiter = rateLimit({
  windowMs:        60 * 1000,
  max:             60,
  message:         { message: "Too many search requests. Please slow down." },
  standardHeaders: true,
  legacyHeaders:   false,
});

router.get("/", searchLimiter, globalSearch);

module.exports = router;
