const router = require("express").Router();
const c = require("../controllers/Category.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");

router.get("/",     c.getAllCategories);                              // public
router.get("/:id",  c.getCategoryById);                              // public
router.post("/",    requireAuth, requireRole("admin"), c.createCategory);
router.put("/:id",  requireAuth, requireRole("admin"), c.updateCategory);
router.delete("/:id", requireAuth, requireRole("admin"), c.deleteCategory);

module.exports = router;
