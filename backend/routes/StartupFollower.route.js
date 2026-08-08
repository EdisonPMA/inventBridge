const router = require("express").Router();
const fl = require("../controllers/StartupFollower.controller");
const { requireAuth } = require("../middelwares/auth.middleware");

// Followed startups for the current user
router.get("/me/following", requireAuth, fl.getFollowedStartups);

module.exports = router;
