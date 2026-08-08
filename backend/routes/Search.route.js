const router = require("express").Router();
const { globalSearch } = require("../controllers/Search.controller");

// Public — no auth required so the header search works even when logged out
router.get("/", globalSearch);

module.exports = router;
