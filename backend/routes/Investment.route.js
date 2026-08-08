const router = require("express").Router();
const c = require("../controllers/Investment.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");
const { rejectSuspended } = require("../middelwares/suspended.middleware");

// Static named routes first
router.get("/mine",                requireAuth, c.getMyInvestments);
router.get("/received",            requireAuth, c.getReceivedInvestments);
router.get("/startup/:startupId",  requireAuth, c.getStartupInvestments);
router.get("/",                    requireAuth, requireRole("admin"), c.getAllInvestments);

// Create (investor, not suspended)
router.post("/",                   requireAuth, requireRole(["investor","admin"]), rejectSuspended, c.createInvestment);

// Single + history
router.get("/:id",                 requireAuth, c.getInvestmentById);
router.get("/:id/history",         requireAuth, c.getInvestmentHistory);

// State transitions
router.patch("/:id/accept",        requireAuth, c.acceptInvestment);
router.patch("/:id/reject",        requireAuth, c.rejectInvestment);
router.patch("/:id/negotiate",     requireAuth, c.negotiateInvestment);
router.patch("/:id/cancel",        requireAuth, c.cancelInvestment);
router.patch("/:id/finalize",      requireAuth, c.finalizeInvestment);

// Legacy
router.put("/:id/status",          requireAuth, c.updateInvestmentStatus);
router.put("/:id/offer",           requireAuth, c.updateOffer);

router.delete("/:id",              requireAuth, requireRole("admin"), c.deleteInvestment);

module.exports = router;
