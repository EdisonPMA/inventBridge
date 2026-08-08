const mysql = require("mysql2/promise");
require("./env");

// Singleton pool — shared across all models
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASS,
  database:         process.env.DB_NAME,
  connectionLimit:  10,
  waitForConnections: true,
  queueLimit:       50,   // fail fast instead of queuing forever under load
  enableKeepAlive:  true,
  keepAliveInitialDelay: 0,
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
