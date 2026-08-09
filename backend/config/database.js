const mysql = require("mysql2/promise");
require("./env");

// Singleton pool — shared across all models
const pool = mysql.createPool({
  host:             process.env.DB_HOST,
  user:             process.env.DB_USER,
  password:         process.env.DB_PASS,
  database:         process.env.DB_NAME,
  connectionLimit:  5,
  waitForConnections: true,
  queueLimit:       20,
  enableKeepAlive:  true,
  keepAliveInitialDelay: 0,
  connectTimeout:   30000,
  idleTimeout:      60000,
  ...(process.env.DB_HOST !== "localhost" && process.env.DB_HOST !== "127.0.0.1"
    ? { ssl: { rejectUnauthorized: true } }
    : {}),
});

// Surface pool-level errors
pool.on("error", (err) => {
  console.error("[DB] Pool error:", err.code, err.message);
});

/**
 * TiDB Cloud requires LIMIT/OFFSET to be strict 32-bit integers.
 * Math.min/Math.max return Number objects that TiDB rejects with ER_WRONG_ARGUMENTS.
 * Wrap execute() to coerce whole-number floats to integers.
 * Only integers are coerced — decimals (prices, percentages) are left alone.
 */
function coerceParams(params) {
  if (!Array.isArray(params)) return params;
  return params.map(v =>
    (typeof v === "number" && Number.isFinite(v) && (v | 0) === v) ? v | 0 : v
  );
}

const _execute = pool.execute.bind(pool);
pool.execute = (sql, params) => _execute(sql, coerceParams(params));

// Also wrap getConnection so connection.execute() gets the same treatment
const _getConnection = pool.getConnection.bind(pool);
pool.getConnection = async () => {
  const conn = await _getConnection();
  const _connExecute = conn.execute.bind(conn);
  conn.execute = (sql, params) => _connExecute(sql, coerceParams(params));
  return conn;
};

module.exports = pool;
