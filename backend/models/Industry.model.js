/**
 * Industry model — table: industries
 * Lookup table for startup industries.
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function create({ name, description = null, icon = null }) {
  const [existing] = await db.execute(
    "SELECT id FROM industries WHERE name = ?", [name]
  );
  if (existing.length) throw new Error(`Industry "${name}" already exists.`);

  const [result] = await db.execute(
    "INSERT INTO industries (name, description, icon) VALUES (?, ?, ?)",
    [name, description, icon]
  );
  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM industries WHERE id = ? LIMIT 1", [id]
  );
  if (!rows.length) throw new Error("Industry not found.");
  return rows[0];
}

async function findByName(name) {
  const [rows] = await db.execute(
    "SELECT * FROM industries WHERE name = ? LIMIT 1", [name]
  );
  return rows[0] || null;
}

async function findAll({ status } = {}) {
  const where = status ? "WHERE i.status = ?" : "";
  const params = status ? [status] : [];
  const [rows] = await db.execute(
    `SELECT i.*, COUNT(s.id) AS startup_count
     FROM industries i
     LEFT JOIN startups s ON s.industry = i.name AND s.status = 'published'
     ${where}
     GROUP BY i.id
     ORDER BY startup_count DESC, i.name ASC`,
    params
  );
  return rows;
}

/* ── UPDATE ──────────────────────────────────────── */
async function update(id, { name, description, icon, status }) {
  const fields = [];
  const values = [];
  if (name        !== undefined) { fields.push("name = ?");        values.push(name); }
  if (description !== undefined) { fields.push("description = ?"); values.push(description); }
  if (icon        !== undefined) { fields.push("icon = ?");        values.push(icon); }
  if (status      !== undefined) { fields.push("status = ?");      values.push(status); }
  if (!fields.length) throw new Error("No valid fields to update.");

  await db.execute(
    `UPDATE industries SET ${fields.join(", ")} WHERE id = ?`,
    [...values, id]
  );
  return findById(id);
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  const ind = await findById(id);
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM startups WHERE industry = ?", [ind.name]
  );
  if (total > 0) throw new Error("Cannot delete industry that has startups.");

  const [result] = await db.execute("DELETE FROM industries WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Industry not found.");
  return { message: "Industry deleted." };
}

module.exports = { create, findById, findByName, findAll, update, remove };
