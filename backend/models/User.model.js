/**
 * User model — table: users
 * Handles authentication-level fields (email, password_hash, role, status).
 * Profile data lives in Profile.model.js (profiles table).
 */
const db = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { hashPassword } = require("../utils/password");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/* ── helpers ─────────────────────────────────────── */
const PUBLIC_FIELDS = `
  u.id, u.uuid, u.email, u.phone, u.role, u.status,
  u.email_verified, u.phone_verified, u.last_login,
  u.created_at, u.updated_at,
  p.first_name, p.last_name, p.profile_photo,
  p.headline, p.verification_level, p.country
`;

/* ── CREATE ──────────────────────────────────────── */
async function create({ email, phone = null, password, role = "inventor" }) {
  const normalizedEmail = normalizeEmail(email);
  const [existing] = await db.execute(
    "SELECT id FROM users WHERE email = ?", [normalizedEmail]
  );
  if (existing.length) throw new Error("An account with this email already exists.");

  const password_hash = await hashPassword(password);
  const uuid = uuidv4();

  const [result] = await db.execute(
    `INSERT INTO users (uuid, email, phone, password_hash, role, status)
     VALUES (?, ?, ?, ?, ?, 'active')`,
    [uuid, normalizedEmail, phone, password_hash, role]
  );

  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS}
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("User not found.");
  return rows[0];
}

async function findByUuid(uuid) {
  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS}
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.uuid = ? LIMIT 1`,
    [uuid]
  );
  if (!rows.length) throw new Error("User not found.");
  return rows[0];
}

/** Returns row including password_hash — login use only */
async function findByEmailWithPassword(email) {
  const [rows] = await db.execute(
    `SELECT u.*, p.first_name, p.last_name, p.profile_photo,
            p.headline, p.verification_level
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE LOWER(u.email) = ? LIMIT 1`,
    [normalizeEmail(email)]
  );
  return rows[0] || null;
}

async function findAll({ role, status, limit = 50, offset = 0 } = {}) {
  const conditions = [];
  const params = [];

  if (role)   { conditions.push("u.role = ?");   params.push(role); }
  if (status) { conditions.push("u.status = ?"); params.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.execute(
    `SELECT ${PUBLIC_FIELDS}
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     ${where}
     ORDER BY u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    params
  );

  return { rows, total };
}

/* ── UPDATE ──────────────────────────────────────── */
async function updateRole(id, role) {
  await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, id]);
  return findById(id);
}

async function updateStatus(id, status) {
  await db.execute("UPDATE users SET status = ? WHERE id = ?", [status, id]);
  return findById(id);
}

async function updatePassword(id, newPassword) {
  const password_hash = await hashPassword(newPassword);
  const [result] = await db.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, id]
  );
  if (!result.affectedRows) throw new Error("User not found.");
  return { message: "Password updated successfully." };
}

async function setPasswordHash(id, password_hash) {
  await db.execute(
    "UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, id]
  );
}

async function markEmailVerified(id) {
  await db.execute("UPDATE users SET email_verified = TRUE WHERE id = ?", [id]);
}

async function markPhoneVerified(id) {
  await db.execute("UPDATE users SET phone_verified = TRUE WHERE id = ?", [id]);
}

async function touchLastLogin(id) {
  await db.execute(
    "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?", [id]
  );
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM users WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("User not found.");
  return { message: "User deleted successfully." };
}

/* ── STATS ───────────────────────────────────────── */
async function countByRole() {
  const [rows] = await db.execute(
    "SELECT role, COUNT(*) AS total FROM users GROUP BY role"
  );
  return rows;
}

async function platformStats() {
  const [[startups]] = await db.execute(
    "SELECT COUNT(*) AS total FROM startups WHERE status != 'draft'"
  );
  const [[investors]] = await db.execute(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'investor' AND status = 'active'"
  );
  const [[orgs]] = await db.execute(
    "SELECT COUNT(*) AS total FROM users WHERE role = 'organization' AND status = 'active'"
  );
  const [[industries]] = await db.execute(
    "SELECT COUNT(DISTINCT industry) AS total FROM startups WHERE industry IS NOT NULL AND status != 'draft'"
  );
  const [[users]] = await db.execute(
    "SELECT COUNT(*) AS total FROM users WHERE status = 'active'"
  );
  const [[investments]] = await db.execute(
    "SELECT COUNT(*) AS total FROM investments WHERE status IN ('accepted','completed')"
  );
  return {
    startups: startups.total,
    investors: investors.total,
    organizations: orgs.total,
    industries: industries.total,
    users: users.total,
    investments: investments.total,
  };
}

/** Public directory for landing page — investors, organizations, etc. */
async function findPublicDirectory({ role, limit = 12, offset = 0 } = {}) {
  if (!role) throw new Error("role is required.");

  const investorExtra =
    role === "investor"
      ? `, (SELECT COUNT(*) FROM investments i
           WHERE i.investor_id = u.id AND i.status IN ('accepted','completed','pending','negotiating')) AS investment_count`
      : "";

  const [rows] = await db.execute(
    `SELECT u.id, u.role, u.created_at,
            p.first_name, p.last_name, p.headline, p.bio,
            p.verification_level, p.country, p.profile_photo
            ${investorExtra}
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.role = ? AND u.status = 'active'
     ORDER BY
       CASE p.verification_level WHEN 'verified' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END,
       u.created_at DESC
     LIMIT ? OFFSET ?`,
    [role, limit, offset]
  );
  return rows;
}

async function countActiveByRole(role) {
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM users WHERE role = ? AND status = 'active'",
    [role]
  );
  return total;
}

async function totalCount() {
  const [[{ total }]] = await db.execute("SELECT COUNT(*) AS total FROM users");
  return total;
}

/** People discovery — search users by name, headline, bio; filter by role/location */
async function discover({ q, role, country, province, district, limit = 12, offset = 0 } = {}) {
  // Admins are never listed in people discovery
  const conditions = ["u.status = 'active'", "u.role != 'admin'"];
  const params = [];

  if (q && q.length <= 200) {
    // Escape LIKE metacharacters to prevent wildcard injection & index thrashing
    const safe = q.replace(/[%_\\]/g, "\\$&");
    conditions.push(
      "(p.first_name LIKE ? OR p.last_name LIKE ? OR p.headline LIKE ? OR p.bio LIKE ?)"
    );
    const pct = `%${safe}%`;
    params.push(pct, pct, pct, pct);
  }
  if (role)     { conditions.push("u.role = ?");     params.push(role); }
  if (country)  { conditions.push("p.country = ?");  params.push(country); }
  if (province) { conditions.push("p.province = ?"); params.push(province); }
  if (district) { conditions.push("p.district = ?"); params.push(district); }

  const where = `WHERE ${conditions.join(" AND ")}`;

  const [rows] = await db.execute(
    `SELECT u.id, u.uuid, u.role, u.created_at,
            p.first_name, p.last_name, p.headline, p.bio,
            p.verification_level, p.country, p.province, p.district,
            p.profile_photo, p.cover_photo, p.website, p.linkedin
     FROM users u
     LEFT JOIN profiles p ON p.user_id = u.id
     ${where}
     ORDER BY
       CASE p.verification_level WHEN 'verified' THEN 0 WHEN 'premium' THEN 1 ELSE 2 END,
       u.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${where}`,
    params
  );

  return { rows, total };
}

module.exports = {
  create,
  findById,
  findByUuid,
  findByEmailWithPassword,
  findAll,
  updateRole,
  updateStatus,
  updatePassword,
  setPasswordHash,
  markEmailVerified,
  markPhoneVerified,
  touchLastLogin,
  remove,
  countByRole,
  platformStats,
  findPublicDirectory,
  countActiveByRole,
  totalCount,
  discover,
};
