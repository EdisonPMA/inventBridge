/**
 * Admin routes — all require JWT + admin role.
 * Mounted at /api/admin
 */
const router = require("express").Router();
const c = require("../controllers/Admin.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");

const admin = [requireAuth, requireRole("admin")];

// Dashboard
router.get("/stats",                      ...admin, c.getDashboardStats);

// User management
router.get("/users",                      ...admin, c.listUsers);
router.get("/users/:id",                  ...admin, c.getUserDetail);
router.patch("/users/:id/status",         ...admin, c.setUserStatus);
router.patch("/users/:id/role",           ...admin, c.setUserRole);

// Startup moderation
router.get("/startups",                   ...admin, c.listStartups);
router.get("/startups/:id",               ...admin, c.getStartupDetail);
router.patch("/startups/:id/status",      ...admin, c.setStartupStatus);

// Investor management
router.get("/investors",                  ...admin, c.listInvestors);

// Post moderation
router.get("/posts",                      ...admin, c.listPosts);
router.patch("/posts/:id/status",         ...admin, c.setPostStatus);

// Investment offer moderation
router.get("/investments",                ...admin, c.listInvestments);
router.patch("/investments/:id/suspend",  ...admin, c.suspendInvestment);

// Reports
router.get("/reports",                    ...admin, c.listReports);
router.get("/reports/:id",                ...admin, c.getReport);
router.patch("/reports/:id",              ...admin, c.updateReport);

// Suspended accounts
router.get("/suspended",                  ...admin, c.listSuspended);

// Audit logs
router.get("/audit-logs",                 ...admin, c.getAuditLogs);

module.exports = router;
