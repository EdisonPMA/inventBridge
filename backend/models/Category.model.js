/**
 * Category model — table: categories
 * Lookup table for startup industry categories.
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function create({ name, description = null, icon = null }) {
  const [existing] = await db.execute(
    "SELECT id FROM categories WHERE name = ?", [name]
  );
  if (existing.length) throw new Error(`Category "${name}" already exists.`);

  const [result] = await db.execute(
    "INSERT INTO categories (name, description, icon) VALUES (?, ?, ?)",
    [name, description, icon]
  );
  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM categories WHERE id = ? LIMIT 1", [id]
  );
  if (!rows.length) throw new Error("Category not found.");
  return rows[0];
}

async function findByName(name) {
  const [rows] = await db.execute(
    "SELECT * FROM categories WHERE name = ? LIMIT 1", [name]
  );
  return rows[0] || null;
}

async function findAll({ status } = {}) {
  const where = status ? "WHERE c.status = ?" : "";
  const params = status ? [status] : [];
  const [rows] = await db.execute(
    `SELECT c.*, COUNT(s.id) AS startup_count
     FROM categories c
     LEFT JOIN startups s ON s.category_id = c.id AND s.status = 'published'
     ${where}
     GROUP BY c.id
     ORDER BY startup_count DESC, c.name ASC`,
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
    `UPDATE categories SET ${fields.join(", ")} WHERE id = ?`,
    [...values, id]
  );
  return findById(id);
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  // categories uses ON DELETE RESTRICT — check first
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM startups WHERE category_id = ?", [id]
  );
  if (total > 0) throw new Error("Cannot delete category that has startups.");

  const [result] = await db.execute("DELETE FROM categories WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Category not found.");
  return { message: "Category deleted." };
}

module.exports = { create, findById, findByName, findAll, update, remove };
