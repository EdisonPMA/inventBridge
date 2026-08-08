const router = require("express").Router();
const c = require("../controllers/SavedStartup.controller");
const { requireAuth } = require("../middelwares/auth.middleware");

router.get("/",                        requireAuth, c.getMySavedStartups);
router.post("/:startupId",             requireAuth, c.toggleSave);
router.get("/:startupId/status",       requireAuth, c.getSaveStatus);
router.delete("/:startupId",           requireAuth, c.unsaveStartup);

module.exports = router;