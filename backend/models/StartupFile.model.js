/**
 * StartupFile model — table: startup_files
 * Pitch decks, certificates, videos and other documents.
 * Files are stored in Cloudinary; only metadata lives here.
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function create({
  startup_id, file_type, title = null, cloud_url,
  public_id = null, resource_type = "raw", mime_type = null,
  file_size = 0, original_filename = null, is_private = 0,
}) {
  const [result] = await db.execute(
    `INSERT INTO startup_files
       (startup_id, file_type, title, cloud_url, public_id, resource_type,
        mime_type, file_size, original_filename, is_private)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [startup_id, file_type, title, cloud_url, public_id, resource_type,
     mime_type, file_size, original_filename, is_private ? 1 : 0]
  );
  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    "SELECT * FROM startup_files WHERE id = ? LIMIT 1", [id]
  );
  if (!rows.length) throw new Error("File not found.");
  return rows[0];
}

async function findByStartup(startup_id, file_type = null) {
  const where = file_type
    ? "WHERE startup_id = ? AND file_type = ?"
    : "WHERE startup_id = ?";
  const params = file_type ? [startup_id, file_type] : [startup_id];

  const [rows] = await db.execute(
    `SELECT * FROM startup_files ${where} ORDER BY uploaded_at DESC`,
    params
  );
  return rows;
}

/**
 * Find public files only — exclude private/sensitive documents from public listings.
 */
async function findPublicByStartup(startup_id, file_type = null) {
  const conditions = ["startup_id = ?", "is_private = 0"];
  const params = [startup_id];

  if (file_type) {
    conditions.push("file_type = ?");
    params.push(file_type);
  }

  const [rows] = await db.execute(
    `SELECT * FROM startup_files WHERE ${conditions.join(" AND ")} ORDER BY uploaded_at DESC`,
    params
  );
  return rows;
}

/* ── UPDATE ──────────────────────────────────────── */
async function update(id, {
  title, cloud_url, public_id, resource_type,
  mime_type, file_size, original_filename, is_private,
}) {
  const fields = [];
  const values = [];

  if (title             !== undefined) { fields.push("title = ?");             values.push(title); }
  if (cloud_url         !== undefined) { fields.push("cloud_url = ?");         values.push(cloud_url); }
  if (public_id         !== undefined) { fields.push("public_id = ?");         values.push(public_id); }
  if (resource_type     !== undefined) { fields.push("resource_type = ?");     values.push(resource_type); }
  if (mime_type         !== undefined) { fields.push("mime_type = ?");         values.push(mime_type); }
  if (file_size         !== undefined) { fields.push("file_size = ?");         values.push(file_size); }
  if (original_filename !== undefined) { fields.push("original_filename = ?"); values.push(original_filename); }
  if (is_private        !== undefined) { fields.push("is_private = ?");        values.push(is_private ? 1 : 0); }

  if (!fields.length) throw new Error("No fields to update.");

  await db.execute(
    `UPDATE startup_files SET ${fields.join(", ")} WHERE id = ?`,
    [...values, id]
  );
  return findById(id);
}

/* ── DELETE ──────────────────────────────────────── */
/**
 * Remove a file record by ID.
 * Returns the file metadata so the caller can delete the cloud resource.
 */
async function remove(id) {
  const file = await findById(id);
  await db.execute("DELETE FROM startup_files WHERE id = ?", [id]);
  // Return file metadata — caller is responsible for Cloudinary cleanup
  return {
    message:       "File deleted.",
    public_id:     file.public_id,
    resource_type: file.resource_type || "raw",
  };
}

async function removeAllByStartup(startup_id) {
  const [rows] = await db.execute(
    "SELECT public_id, resource_type FROM startup_files WHERE startup_id = ?", [startup_id]
  );
  await db.execute("DELETE FROM startup_files WHERE startup_id = ?", [startup_id]);
  return rows
    .filter((r) => r.public_id)
    .map((r) => ({ public_id: r.public_id, resource_type: r.resource_type || "raw" }));
}

module.exports = {
  create,
  findById,
  findByStartup,
  findPublicByStartup,
  update,
  remove,
  removeAllByStartup,
};
