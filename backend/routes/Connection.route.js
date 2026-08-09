const router = require("express").Router();
const c = require("../controllers/Connection.controller");
const { requireAuth } = require("../middelwares/auth.middleware");
const { rejectAdmin } = require("../middelwares/rejectAdmin.middleware");

router.get("/pending",           requireAuth, c.getPendingRequests);
router.get("/sent",              requireAuth, c.getSentRequests);
router.get("/between/:userId",   requireAuth, c.getConnectionBetween);
router.get("/",                  requireAuth, c.getMyConnections);
router.post("/",                 requireAuth, rejectAdmin, c.sendRequest);
router.patch("/:id/accept",      requireAuth, rejectAdmin, c.acceptRequest);
router.patch("/:id/reject",      requireAuth, rejectAdmin, c.rejectRequest);
router.delete("/:id/request",    requireAuth, rejectAdmin, c.cancelRequest);
router.delete("/:id",            requireAuth, rejectAdmin, c.removeConnection);

module.exports = router;
