require("./config/env");
const http        = require("http");
const express     = require("express");
const cors        = require("cors");
const helmet      = require("helmet");
const morgan      = require("morgan");
const cookieParser = require("cookie-parser");
const DBconnect   = require("./config/connection");
const { createSocketServer } = require("./socket/socketServer");
const { generalLimiter, authLimiter } = require("./middelwares/rateLimit.middleware");

// ── Route imports ─────────────────────────────────
const authRoutes         = require("./routes/Auth.route");
const googleAuthRoutes   = require("./routes/GoogleAuth.route");
const userRoutes         = require("./routes/User.route");
const profileRoutes      = require("./routes/Profile.route");
const categoryRoutes     = require("./routes/Category.route");
const industryRoutes     = require("./routes/Industry.route");
const startupRoutes      = require("./routes/Startup.route");
const postRoutes         = require("./routes/Post.route");
const searchRoutes       = require("./routes/Search.route");
const connectionRoutes   = require("./routes/Connection.route");
const conversationRoutes = require("./routes/Conversation.route");
const investmentRoutes   = require("./routes/Investment.route");
const verificationRoutes = require("./routes/Verification.route");
const notificationRoutes = require("./routes/Notification.route");
const savedStartupRoutes = require("./routes/SavedStartup.route");
const followerRoutes     = require("./routes/StartupFollower.route");
const uploadRoutes       = require("./routes/Upload.route");
const dashboardRoutes    = require("./routes/Dashboard.route");
const secureFileRoutes   = require("./routes/SecureFile.route");
const adminRoutes        = require("./routes/Admin.route");
const reportRoutes       = require("./routes/Report.route");
const aiRoutes           = require("./routes/AI.route");

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Allowed origins (supports comma-separated list in CLIENT_ORIGIN) ──
const allowedOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

// ── Security headers ───────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false, // allow Cloudinary media embeds
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'self'"],
      scriptSrc:      ["'self'"],
      styleSrc:       ["'self'", "'unsafe-inline'"], // Tailwind inline styles
      imgSrc:         ["'self'", "data:", "https:", "blob:"], // Cloudinary, Google avatars
      connectSrc:     ["'self'", ...allowedOrigins],
      fontSrc:        ["'self'", "https:", "data:"],
      objectSrc:      ["'none'"],
      mediaSrc:       ["'self'", "https:"],
      frameSrc:       ["'none'"],
    },
  },
}));

// ── CORS ───────────────────────────────────────────
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin '${origin}' not allowed`));
  },
  credentials: true,
  methods:     ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
}));

// ── Body limits ────────────────────────────────────
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

// ── Cookie parser (needed for httpOnly refresh token cookie) ──
app.use(cookieParser());

// ── HTTP request logging ───────────────────────────
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined", {
    skip: (req) => req.path === "/health",
    stream: {
      write: (msg) => {
        // Strip sensitive query params from logs
        const safe = msg
          .replace(/password=[^&\s]*/gi, "password=[REDACTED]")
          .replace(/\btoken=[^&\s]*/gi,  "token=[REDACTED]")
          .replace(/\bcode=[^&\s]*/gi,   "code=[REDACTED]");
        process.stdout.write(safe);
      },
    },
  }));
}

// ── Passport (Google OAuth) ────────────────────────
const passport = require("passport");
require("./config/passport")(); // configure strategy
app.use(passport.initialize());  // no sessions — JWT only

// ── Global rate limit ──────────────────────────────
app.use(generalLimiter);
app.get("/health", (_req, res) =>
  res.json({ status: "ok", timestamp: new Date().toISOString() })
);

// ── API routes ─────────────────────────────────────
app.use("/api/auth",           authLimiter, authRoutes);
app.use("/api/auth",           googleAuthRoutes); // Google OAuth (own rate limit inside)
app.use("/api/users",          userRoutes);
app.use("/api/profiles",       profileRoutes);
app.use("/api/categories",     categoryRoutes);
app.use("/api/industries",     industryRoutes);
app.use("/api/startups",       startupRoutes);
app.use("/api/posts",          postRoutes);
app.use("/api/search",         searchRoutes);
app.use("/api/connections",    connectionRoutes);
app.use("/api/conversations",  conversationRoutes);
app.use("/api/investments",    investmentRoutes);
app.use("/api/verifications",  verificationRoutes);
app.use("/api/notifications",  notificationRoutes);
app.use("/api/saved-startups", savedStartupRoutes);
app.use("/api/following",      followerRoutes);
app.use("/api/uploads",        uploadRoutes);
app.use("/api/dashboard",      dashboardRoutes);
app.use("/api/files",          secureFileRoutes);
app.use("/api/admin",          adminRoutes);
app.use("/api/reports",        reportRoutes);
app.use("/api/ai",             aiRoutes);

// ── Convenience aliases ────────────────────────────
app.use("/api/me/saved-startups", savedStartupRoutes);
app.get("/api/me/following", require("./middelwares/auth.middleware").requireAuth, (req, res, next) => {
  req.url = "/me/following";
  followerRoutes(req, res, next);
});

// ── 404 handler ────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found.` })
);

// ── Global error handler — never expose internals ──
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  console.error("Unhandled error:", err.message);
  res.status(500).json({ message: "Internal server error." });
});

// ── HTTP server + Socket.IO ────────────────────────
const server = http.createServer(app);
const { io, onlineUsers } = createSocketServer(server);
app.set("io", io);
app.set("onlineUsers", onlineUsers);

// ── Boot ───────────────────────────────────────────
DBconnect()
  .then(() => {
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT} (Socket.IO enabled)`)
    );
  })
  .catch((err) => {
    console.error("Failed to start server:", err.message);
    process.exit(1);
  });
