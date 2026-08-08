const mysql = require("mysql2/promise");
require("./env");

// Singleton pool — shared across all models
// Render free tier: 512MB RAM, shared CPU — keep pool small to avoid memory pressure
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASS,
  database:         process.env.DB_NAME,
  connectionLimit:  5,              // free tier: small pool, avoid exhausting TiDB connections
  waitForConnections: true,
  queueLimit:       20,             // reject early instead of queuing 50 requests
  enableKeepAlive:  true,
  keepAliveInitialDelay: 0,
  connectTimeout:   30000,          // 30s — TiDB Cloud can be slow on first connection
  idleTimeout:      60000,          // release idle connections after 60s
  // SSL for non-localhost environments
  ...(process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1"
    ? { ssl: { rejectUnauthorized: true } }
    : {}),
});

// Surface pool-level errors rather than letting them become unhandled rejections
pool.on("error", (err) => {
  console.error("[DB] Pool error:", err.code, err.message);
});

module.exports = pool;
