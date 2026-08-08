const router = require("express").Router();
const s  = require("../controllers/Startup.controller");
const m  = require("../controllers/StartupMember.controller");
const f  = require("../controllers/StartupFile.controller");
const fl = require("../controllers/StartupFollower.controller");
const { requireAuth, optionalAuth, requireRole } = require("../middelwares/auth.middleware");

// ── Static / named routes MUST come before /:id ───
router.get("/discover",        s.discoverStartups);                              // public investor discovery
router.get("/mine",            requireAuth, s.getMyStartups);                   // owner's startups
router.get("/admin/all",       requireAuth, requireRole("admin"), s.adminGetAllStartups);
router.get("/slug/:slug",      optionalAuth, s.getStartupBySlug);  // optionalAuth so owners can preview unpublished

// ── Public list + single ──────────────────────────
router.get("/",                s.getAllStartups);
router.get("/:id",             optionalAuth, s.getStartupById);    // optionalAuth so owners can preview unpublished

// ── Authenticated startup management ──────────────
router.post("/",               requireAuth, requireRole(["inventor", "admin"]), s.createStartup);
router.put("/:id",             requireAuth, s.updateStartup);
router.patch("/:id/status",    requireAuth, s.updateStartupStatus);
router.patch("/:id/archive",   requireAuth, s.archiveStartup);
router.patch("/:id/verify",    requireAuth, requireRole("admin"), s.verifyStartup);
router.post("/:id/submit-verification", requireAuth, requireRole(["inventor"]), s.submitForVerification);
router.delete("/:id",          requireAuth, s.deleteStartup);

// ── Members ───────────────────────────────────────
router.get("/:startupId/members",             requireAuth, m.getMembers);
router.post("/:startupId/members",            requireAuth, m.addMember);
router.put("/:startupId/members/:memberId",   requireAuth, m.updateMember);
router.delete("/:startupId/members/:memberId", requireAuth, m.removeMember);

// ── Files (metadata only — actual upload via /api/uploads) ───
// optionalAuth: unauthed users get public files only; owners/investors see private too
router.get("/:startupId/files",               optionalAuth, f.getFiles);
router.post("/:startupId/files",              requireAuth, f.uploadFile);
router.put("/:startupId/files/:fileId",       requireAuth, f.updateFile);
router.delete("/:startupId/files/:fileId",    requireAuth, f.deleteFile);

// ── Followers ─────────────────────────────────────
router.post("/:startupId/follow",             requireAuth, fl.toggleFollow);
router.get("/:startupId/followers",           fl.getFollowers);
router.get("/:startupId/follow/status",       requireAuth, fl.getFollowStatus);

module.exports = router;
