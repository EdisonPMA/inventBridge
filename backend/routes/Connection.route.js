const router = require("express").Router();
const c = require("../controllers/Connection.controller");
const { requireAuth } = require("../middelwares/auth.middleware");
const { rejectSuspended } = require("../middelwares/suspended.middleware");
const { rejectAdmin } = require("../middelwares/rejectAdmin.middleware");

// Read-only — admin may query these for support/moderation purposes
router.get("/pending",           requireAuth, c.getPendingRequests);
router.get("/sent",              requireAuth, c.getSentRequests);
router.get("/between/:userId",   requireAuth, c.getConnectionBetween);
router.get("/",                  requireAuth, c.getMyConnections);

// Write operations — admins are blocked from all of these
router.post("/",                 requireAuth, rejectAdmin, rejectSuspended, c.sendRequest);
router.patch("/:id/accept",      requireAuth, rejectAdmin, c.acceptRequest);
router.patch("/:id/reject",      requireAuth, rejectAdmin, c.rejectRequest);
router.delete("/:id/request",    requireAuth, rejectAdmin, c.cancelRequest);
router.delete("/:id",            requireAuth, rejectAdmin, c.removeConnection);

module.exports = router;
