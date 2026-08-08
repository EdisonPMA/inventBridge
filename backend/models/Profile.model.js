/**
 * Profile model — table: profiles
 * One-to-one extension of users. Auto-created on registration.
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function create({ user_id, first_name, last_name, gender, birth_date,
  country, province, district, headline, bio, website, linkedin,
  profile_photo, cover_photo } = {}) {

  const [result] = await db.execute(
    `INSERT INTO profiles
       (user_id, first_name, last_name, gender, birth_date,
        country, province, district, headline, bio,
        website, linkedin, profile_photo, cover_photo)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [user_id, first_name, last_name, gender ?? null, birth_date ?? null,
     country ?? null, province ?? null, district ?? null, headline ?? null,
     bio ?? null, website ?? null, linkedin ?? null,
     profile_photo ?? null, cover_photo ?? null]
  );
  return findByUserId(user_id);
}

/* ── READ ────────────────────────────────────────── */
async function findByUserId(user_id) {
  const [rows] = await db.execute(
    "SELECT * FROM profiles WHERE user_id = ? LIMIT 1", [user_id]
  );
  if (!rows.length) throw new Error("Profile not found.");
  return rows[0];
}

async function findById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM profiles WHERE id = ? LIMIT 1", [id]
  );
  if (!rows.length) throw new Error("Profile not found.");
  return rows[0];
}

/* ── UPDATE ──────────────────────────────────────── */
async function update(user_id, fields = {}) {
  const allowed = [
    "first_name", "last_name", "gender", "birth_date",
    "country", "province", "district", "headline", "bio",
    "website", "linkedin", "profile_photo", "cover_photo",
  ];

  const updates = Object.entries(fields).filter(([k]) => allowed.includes(k));
  if (!updates.length) throw new Error("No valid fields to update.");

  const set = updates.map(([k]) => `${k} = ?`).join(", ");
  const values = updates.map(([, v]) => v ?? null);

  await db.execute(
    `UPDATE profiles SET ${set} WHERE user_id = ?`,
    [...values, user_id]
  );
  return findByUserId(user_id);
}

async function updateVerificationLevel(user_id, level) {
  await db.execute(
    "UPDATE profiles SET verification_level = ? WHERE user_id = ?",
    [level, user_id]
  );
  return findByUserId(user_id);
}

async function updatePhoto(user_id, { profile_photo, cover_photo } = {}) {
  if (profile_photo) {
    await db.execute(
      "UPDATE profiles SET profile_photo = ? WHERE user_id = ?",
      [profile_photo, user_id]
    );
  }
  if (cover_photo) {
    await db.execute(
      "UPDATE profiles SET cover_photo = ? WHERE user_id = ?",
      [cover_photo, user_id]
    );
  }
  return findByUserId(user_id);
}

/* ── UPSERT (safe for registration flow) ─────────── */
async function upsert({ user_id, first_name, last_name, ...rest }) {
  const [existing] = await db.execute(
    "SELECT id FROM profiles WHERE user_id = ?", [user_id]
  );
  if (existing.length) {
    return update(user_id, { first_name, last_name, ...rest });
  }
  return create({ user_id, first_name, last_name, ...rest });
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(user_id) {
  const [result] = await db.execute(
    "DELETE FROM profiles WHERE user_id = ?", [user_id]
  );
  if (!result.affectedRows) throw new Error("Profile not found.");
  return { message: "Profile deleted." };
}

module.exports = {
  create,
  findById,
  findByUserId,
  update,
  updateVerificationLevel,
  updatePhoto,
  upsert,
  remove,
};
