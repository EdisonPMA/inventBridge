const express  = require("express");
const router   = express.Router();
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");
const { authLimiter, registerLimiter } = require("../middelwares/rateLimit.middleware");
const {
  createUser, userLogin, refreshToken, logout,
  getPlatformStats, getPublicDirectory, getSuccessStories,
  getUsers, getUserById, updateUser, updatePassword, deleteUser,
} = require("../controllers/Auth.controller");

// ── Public ────────────────────────────────────────
router.post("/register",        registerLimiter, createUser);
router.post("/login",           authLimiter,     userLogin);
router.post("/refresh",         authLimiter,     refreshToken);
router.post("/logout",          requireAuth,     logout);

// ── Public read ───────────────────────────────────
router.get("/stats",            getPlatformStats);
router.get("/directory",        getPublicDirectory);
router.get("/success-stories",  getSuccessStories);

// ── Legacy admin routes — secured ────────────────
// These are superseded by /api/admin/* but kept for backward compat.
router.get("/users",              requireAuth, requireRole("admin"), getUsers);
router.get("/users/:id",          requireAuth, requireRole("admin"), getUserById);
router.put("/users/:id",          requireAuth, requireRole("admin"), updateUser);
router.put("/users/:id/password", requireAuth, requireRole("admin"), updatePassword);
router.delete("/users/:id",       requireAuth, requireRole("admin"), deleteUser);

module.exports = router;
