const router = require("express").Router();
const c = require("../controllers/Notification.controller");
const { requireAuth } = require("../middelwares/auth.middleware");

router.get("/",               requireAuth, c.getMyNotifications);
router.put("/read-all",       requireAuth, c.markAllRead);
router.put("/:id/read",       requireAuth, c.markOneRead);
router.delete("/",            requireAuth, c.clearAllNotifications);
router.delete("/:id",         requireAuth, c.deleteNotification);

module.exports = router;
