const router = require("express").Router();
const c = require("../controllers/Profile.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");

router.get("/me",                          requireAuth, c.getMyProfile);
router.put("/me",                          requireAuth, c.updateMyProfile);
router.put("/me/photo",                    requireAuth, c.updatePhoto);
router.get("/:userId",                     requireAuth, c.getProfileByUserId);
router.put("/:userId/verification",        requireAuth, requireRole("admin"), c.updateVerificationLevel);

module.exports = router;
