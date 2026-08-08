const mysql = require("mysql2/promise");
require("./env");
const createTables = require("./schema.js");

async function DBconnect() {
  try {
    // Use the shared pool for initial connection check and schema creation
    const tempPool = mysql.createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
      connectionLimit: 1,

      ssl: {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true
}
    });

    const connection = await tempPool.getConnection();
    console.log("✅ Database connected successfully");

    await createTables(connection);
    connection.release();
    await tempPool.end();

    console.log("✅ Database schema ready");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error;
  }
}

module.exports = DBconnect;
