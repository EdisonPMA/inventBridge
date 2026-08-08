const router = require("express").Router();
const c = require("../controllers/Dashboard.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");

router.get("/inventor",     requireAuth, requireRole(["inventor", "admin"]),     c.inventorDashboard);
router.get("/investor",     requireAuth, requireRole(["investor", "admin"]),     c.investorDashboard);
router.get("/organization", requireAuth, requireRole(["organization", "admin"]), c.organizationDashboard);
router.get("/admin",        requireAuth, requireRole("admin"),                   c.adminDashboard);

module.exports = router;
