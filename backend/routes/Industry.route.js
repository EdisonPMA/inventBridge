const router = require("express").Router();
const c = require("../controllers/Industry.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");

router.get("/",       c.getAllIndustries);                               // public
router.get("/:id",    c.getIndustryById);                               // public
router.post("/",      requireAuth, requireRole("admin"), c.createIndustry);
router.put("/:id",    requireAuth, requireRole("admin"), c.updateIndustry);
router.delete("/:id", requireAuth, requireRole("admin"), c.deleteIndustry);

module.exports = router;
