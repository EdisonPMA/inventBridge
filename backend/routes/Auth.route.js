const express  = require("express");
const router   = express.Router();
const { requireAuth } = require("../middelwares/auth.middleware");
const { authLimiter, registerLimiter } = require("../middelwares/rateLimit.middleware");
const {
  createUser, userLogin, refreshToken, logout,
  getPlatformStats, getPublicDirectory, getSuccessStories,
} = require("../controllers/Auth.controller");

router.post("/register",        registerLimiter, createUser);
router.post("/login",           authLimiter,     userLogin);
router.post("/refresh",         authLimiter,     refreshToken);
router.post("/logout",          requireAuth,     logout);

router.get("/stats",            getPlatformStats);
router.get("/directory",        getPublicDirectory);
router.get("/success-stories",  getSuccessStories);

module.exports = router;
