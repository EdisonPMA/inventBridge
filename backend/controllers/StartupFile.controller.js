/**
 * StartupFile controller
 * Routes:
 *   GET    /api/startups/:startupId/files
 *   POST   /api/startups/:startupId/files      (metadata record only — file already uploaded via /api/uploads)
 *   PUT    /api/startups/:startupId/files/:fileId
 *   DELETE /api/startups/:startupId/files/:fileId  — deletes from Cloudinary + MySQL
 */
const StartupFile    = require("../models/StartupFile.model");
const Startup        = require("../models/Startup.model");
const cloudStorage   = require("../services/cloudStorageService");

/* ── Authorization helper ────────────────────────── */
async function assertOwnerOrAdmin(startupId, req, res) {
  const startup = await Startup.findById(startupId);
  if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ message: "Not authorized to manage this startup's files." });
    return null;
  }
  return startup;
}

/* ── GET /api/startups/:startupId/files ─────────── */
async function getFiles(req, res) {
  try {
    const { file_type } = req.query;
    const startupId     = req.params.startupId;
    const user          = req.user; // populated by optionalAuth when token present

    let includePrivate = false;
    let startup        = null;

    if (user) {
      if (user.role === "admin") {
        includePrivate = true;
      } else {
        startup = await Startup.findById(startupId);
        if (startup.owner_id === user.id) {
          includePrivate = true;
        } else if (user.role === "investor") {
          const [[offer]] = await require("../config/database").execute(
            `SELECT id FROM investments
             WHERE startup_id = ? AND investor_id = ?
               AND status IN ('pending','negotiating','accepted','finalized')
             LIMIT 1`,
            [startup.id, user.id]
          );
          includePrivate = !!offer;
        }
      }
    }

    const files = includePrivate
      ? await StartupFile.findByStartup(startupId, file_type || null)
      : await StartupFile.findPublicByStartup(startupId, file_type || null);

    // Owner and admin get raw cloud_url; everyone else gets null for private files
    // — they must call GET /api/files/:fileId to receive a signed URL
    const isOwnerOrAdmin = user && (
      user.role === "admin" ||
      (startup ? startup.owner_id === user.id : false)
    );

    const sanitized = files.map((f) => {
      if (f.is_private && !isOwnerOrAdmin) {
        return { ...f, cloud_url: null }; // use GET /api/files/:id for signed URL
      }
      return f;
    });

    return res.json({ files: sanitized });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* ── POST /api/startups/:startupId/files ─────────── */
/**
 * Create a metadata record after an upload has already succeeded via /api/uploads.
 * The client provides the cloud_url, public_id etc. from the upload response.
 * The backend re-validates ownership before saving.
 */
async function uploadFile(req, res) {
  try {
    const startup = await assertOwnerOrAdmin(req.params.startupId, req, res);
    if (!startup) return;

    const {
      file_type, title, cloud_url, public_id,
      resource_type, mime_type, file_size,
      original_filename, is_private,
    } = req.body;

    if (!file_type || !cloud_url) {
      return res.status(400).json({ message: "file_type and cloud_url are required." });
    }

    // Private file types — force is_private regardless of client value
    const forcePrivate = ["registration_certificate", "verification_document"].includes(file_type);

    const file = await StartupFile.create({
      startup_id:        startup.id,
      file_type,
      title,
      cloud_url,
      public_id,
      resource_type:     resource_type || "raw",
      mime_type,
      file_size,
      original_filename,
      is_private:        forcePrivate ? 1 : (is_private ? 1 : 0),
    });

    return res.status(201).json({
      success: true,
      message: "File record created.",
      data: {
        cloud_url:    file.cloud_url,
        public_id:    file.public_id,
        mime_type:    file.mime_type,
        file_size:    file.file_size,
        file_type:    file.file_type,
        resource_type: file.resource_type,
        is_private:   file.is_private,
      },
      file,
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── PUT /api/startups/:startupId/files/:fileId ──── */
async function updateFile(req, res) {
  try {
    const startup = await assertOwnerOrAdmin(req.params.startupId, req, res);
    if (!startup) return;

    const file = await StartupFile.update(req.params.fileId, req.body);
    return res.json({ message: "File updated.", file });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── DELETE /api/startups/:startupId/files/:fileId ── */
/**
 * Safe deletion:
 * 1. Verify ownership
 * 2. Fetch file record (to get public_id)
 * 3. Delete from MySQL FIRST only after we have the public_id in memory
 * 4. Delete from Cloudinary using the in-memory public_id
 *
 * Rationale: get public_id before deleting DB row so we can't lose it.
 * If Cloudinary delete fails, log it for admin cleanup — don't fail the user.
 */
async function deleteFile(req, res) {
  try {
    const startup = await assertOwnerOrAdmin(req.params.startupId, req, res);
    if (!startup) return;

    // Fetch file BEFORE deleting to capture public_id + resource_type
    const file = await StartupFile.findById(req.params.fileId);

    // Confirm this file belongs to the given startup
    if (file.startup_id !== startup.id) {
      return res.status(403).json({ message: "File does not belong to this startup." });
    }

    // Delete from MySQL first (preserving public_id in the local `file` variable)
    await require("../config/database").execute(
      "DELETE FROM startup_files WHERE id = ?", [file.id]
    );

    // Now delete from Cloudinary — safe because we have public_id in memory
    if (file.public_id) {
      const cloudResult = await cloudStorage.deleteFile(
        file.public_id,
        file.resource_type || "raw"
      );
      if (!cloudResult.ok) {
        console.warn(
          `[StartupFile] Cloudinary cleanup failed for public_id "${file.public_id}". ` +
          `DB record deleted. Manual Cloudinary cleanup required. Error: ${cloudResult.error}`
        );
        // Still return 200 — the DB record is gone; only cloud cleanup failed
        return res.json({
          message: "File deleted from database. Cloud resource cleanup failed — see server logs.",
          cloud_cleanup: false,
          public_id: file.public_id,
        });
      }
    }

    return res.json({ message: "File deleted.", cloud_cleanup: true });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { getFiles, uploadFile, updateFile, deleteFile };
