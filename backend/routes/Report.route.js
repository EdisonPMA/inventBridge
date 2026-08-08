const router = require("express").Router();
const c = require("../controllers/Report.controller");
const { requireAuth } = require("../middelwares/auth.middleware");
const { rejectSuspended } = require("../middelwares/suspended.middleware");

router.post("/",       requireAuth, rejectSuspended, c.createReport);
router.get("/mine",    requireAuth, c.getMyReports);

module.exports = router;
