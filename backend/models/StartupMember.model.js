/**
 * StartupMember model — table: startup_members
 * Team members of a startup. Members do NOT need a platform account —
 * they are stored by name/email only. id is the row PK used for updates/deletes.
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function add({ startup_id, name, email = null, position = null, bio = null, ownership_percentage = 0 }) {
  if (!name || !name.trim()) throw new Error("Member name is required.");

  const [result] = await db.execute(
    `INSERT INTO startup_members (startup_id, name, email, position, bio, ownership_percentage)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [startup_id, name.trim(), email || null, position || null, bio || null, ownership_percentage ?? 0]
  );
  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM startup_members WHERE id = ? LIMIT 1",
    [id]
  );
  if (!rows.length) throw new Error("Member not found.");
  return rows[0];
}

async function findByStartup(startup_id) {
  const [rows] = await db.execute(
    `SELECT * FROM startup_members
     WHERE startup_id = ?
     ORDER BY joined_at ASC`,
    [startup_id]
  );
  return rows;
}

/* ── UPDATE ──────────────────────────────────────── */
async function update(id, { name, email, position, bio, ownership_percentage, photo_url, photo_public_id }) {
  const fields = [];
  const values = [];

  if (name                !== undefined) { fields.push("name = ?");                values.push(name?.trim() ?? null); }
  if (email               !== undefined) { fields.push("email = ?");               values.push(email || null); }
  if (position            !== undefined) { fields.push("position = ?");            values.push(position || null); }
  if (bio                 !== undefined) { fields.push("bio = ?");                 values.push(bio || null); }
  if (photo_url           !== undefined) { fields.push("photo_url = ?");           values.push(photo_url || null); }
  if (photo_public_id     !== undefined) { fields.push("photo_public_id = ?");     values.push(photo_public_id || null); }
  if (ownership_percentage !== undefined) { fields.push("ownership_percentage = ?"); values.push(ownership_percentage); }

  if (!fields.length) throw new Error("No fields to update.");

  await db.execute(
    `UPDATE startup_members SET ${fields.join(", ")} WHERE id = ?`,
    [...values, id]
  );
  return findById(id);
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(startup_id, member_id) {
  const [result] = await db.execute(
    "DELETE FROM startup_members WHERE id = ? AND startup_id = ?",
    [member_id, startup_id]
  );
  if (!result.affectedRows) throw new Error("Member not found.");
  return { message: "Member removed." };
}

module.exports = { add, findById, findByStartup, update, remove };
