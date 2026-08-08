const router = require("express").Router();
const c = require("../controllers/User.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");

router.get("/me",            requireAuth, c.getMe);
router.get("/discover",      requireAuth, c.discoverPeople);   // people discovery
router.get("/stats",         requireAuth, requireRole("admin"), c.getPlatformStats);
router.get("/",              requireAuth, requireRole("admin"), c.getAllUsers);
router.get("/:id",           requireAuth, c.getUserById);
router.put("/:id/role",      requireAuth, requireRole("admin"), c.updateRole);
router.put("/:id/status",    requireAuth, requireRole("admin"), c.updateStatus);
router.put("/:id/password",  requireAuth, c.updatePassword);
router.delete("/:id",        requireAuth, requireRole("admin"), c.deleteUser);

module.exports = router;
