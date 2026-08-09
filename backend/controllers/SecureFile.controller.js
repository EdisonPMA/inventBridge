/**
 * SecureFile controller â€” granular per-file access control.
 *
 * Access matrix for startup files:
 * â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”
 * â”‚ File type                â”‚ Owner  â”‚ Investor w/ active offer â”‚ Org / other â”‚Admin â”‚
 * â”œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¼â”€â”€â”€â”€â”€â”€â”¤
 * â”‚ logo / image (public)    â”‚  âœ“     â”‚  âœ“                       â”‚  âœ“          â”‚  âœ“   â”‚
 * â”‚ pitch_deck (public)      â”‚  âœ“     â”‚  âœ“                       â”‚  âœ“          â”‚  âœ“   â”‚
 * â”‚ demo_video (public)      â”‚  âœ“     â”‚  âœ“                       â”‚  âœ“          â”‚  âœ“   â”‚
 * â”‚ registration_cert (priv) â”‚  âœ“     â”‚  âœ“ (active offer only)   â”‚  âœ—          â”‚  âœ“   â”‚
 * â”‚ financial docs (priv)    â”‚  âœ“     â”‚  âœ“ (accepted/neg only)   â”‚  âœ—          â”‚  âœ“   â”‚
 * â”‚ any is_private file      â”‚  âœ“     â”‚  âœ“ (active offer only)   â”‚  âœ—          â”‚  âœ“   â”‚
 * â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”´â”€â”€â”€â”€â”€â”€â”˜
 *
 * "Active offer" = status IN ('pending','negotiating','accepted','finalized')
 * "Financial docs" = file_type IN ('financial_statement','business_plan') requires
 *   status IN ('negotiating','accepted','finalized') â€” deeper trust level.
 *
 * Routes:
 *   GET /api/files/:fileId              â€” startup file
 *   GET /api/files/verification/:reqId  â€” verification document (owner or admin)
 */
const db                  = require("../config/database");
const StartupFile         = require("../models/StartupFile.model");
const Startup             = require("../models/Startup.model");
const VerificationRequest = require("../models/VerificationRequest.model");
const cloudStorage        = require("../services/cloudStorageService");

// File types that require a deeper trust level (negotiating or beyond)
const DEEP_TRUST_TYPES = new Set(["financial_statement", "business_plan"]);

/**
 * Determine whether the requesting user may access a given file.
 *
 * @param {object} file    â€” startup_files row
 * @param {object} startup â€” startups row
 * @param {object} user    â€” req.user { id, role }
 * @returns {Promise<{ allowed: boolean, reason?: string }>}
 */
async function canAccessFile(file, startup, user) {
  // Admins can always access
  if (user.role === "admin") return { allowed: true };

  // Owner can always access their own startup's files
  if (startup.owner_id === user.id) return { allowed: true };

  // Public file â€” any authenticated user
  if (!file.is_private) return { allowed: true };

  // From here: file is private. Only investors with qualifying offers may access.
  if (user.role !== "investor") {
    return { allowed: false, reason: "Private files are only accessible to the startup owner, qualifying investors, and admins." };
  }

  // Fetch the investor's offer status for this startup
  const [[offer]] = await db.execute(
    `SELECT status FROM investments
     WHERE startup_id = ? AND investor_id = ?
       AND status IN ('pending','negotiating','accepted','finalized')
     LIMIT 1`,
    [file.startup_id, user.id]
  );

  if (!offer) {
    return { allowed: false, reason: "You must have an active investment offer to access private files." };
  }

  // Deep-trust files require the deal to be in negotiation or beyond
  if (DEEP_TRUST_TYPES.has(file.file_type)) {
    const deepTrustStatuses = new Set(["negotiating", "accepted", "finalized"]);
    if (!deepTrustStatuses.has(offer.status)) {
      return {
        allowed: false,
        reason:  "Financial documents are only available once an offer moves to negotiation or beyond.",
      };
    }
  }

  return { allowed: true };
}

/* â”€â”€ GET /api/files/:fileId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getSecureFileUrl(req, res) {
  try {
    const file    = await StartupFile.findById(req.params.fileId);
    const startup = await Startup.findById(file.startup_id);

    const { allowed, reason } = await canAccessFile(file, startup, req.user);
    if (!allowed) {
      return res.status(403).json({ success: false, message: reason || "Access denied." });
    }

    // Private file â†’ signed URL (5-min TTL, never expose raw Cloudinary URL)
    if (file.is_private) {
      if (!file.public_id) {
        return res.status(404).json({ success: false, message: "File has no cloud reference." });
      }
      const resourceType = file.resource_type || "raw";
      const signedUrl    = cloudStorage.getSignedUrl(file.public_id, resourceType, 300);
      return res.json({
        success: true,
        data: {
          signed_url:  signedUrl,
          expires_in:  300,
          mime_type:   file.mime_type,
          file_type:   file.file_type,
          title:       file.title,
          is_private:  true,
        },
      });
    }

    // Public file â†’ direct URL
    return res.json({
      success: true,
      data: {
        cloud_url:  file.cloud_url,
        mime_type:  file.mime_type,
        file_type:  file.file_type,
        title:      file.title,
        is_private: false,
      },
    });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

/* â”€â”€ GET /api/files/startup/:startupId/list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
   List files for a startup, filtered by what the requester can see.
   Owners + admins see all files. Investors with active offers see private files.
   Others see only public files.
   â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function listStartupFiles(req, res) {
  try {
    const startup = await Startup.findById(req.params.startupId);
    const user    = req.user;

    // Determine the visibility level for this requester
    const isOwner = startup.owner_id === user.id;
    const isAdmin = user.role === "admin";

    let includePrivate = isOwner || isAdmin;

    if (!includePrivate && user.role === "investor") {
      const [[offer]] = await db.execute(
        `SELECT status FROM investments
         WHERE startup_id = ? AND investor_id = ?
           AND status IN ('pending','negotiating','accepted','finalized')
         LIMIT 1`,
        [startup.id, user.id]
      );
      includePrivate = !!offer;
    }

    const files = includePrivate
      ? await StartupFile.findByStartup(startup.id)
      : await StartupFile.findPublicByStartup(startup.id);

    // For private files returned to investors, strip the raw cloud_url
    // so they must go through /api/files/:fileId for the signed URL
    const sanitized = files.map((f) => {
      if (f.is_private && !isOwner && !isAdmin) {
        return { ...f, cloud_url: null }; // signal: use /api/files/:id to access
      }
      return f;
    });

    return res.json({ success: true, files: sanitized, includePrivate });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

/* â”€â”€ GET /api/files/verification/:requestId â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getSecureVerificationDoc(req, res) {
  try {
    const request = await VerificationRequest.findById(req.params.requestId);

    if (request.user_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this document.",
      });
    }

    if (!request.document_url) {
      return res.status(404).json({ success: false, message: "No document attached to this request." });
    }

    return res.json({
      success: true,
      data: {
        document_url:      request.document_url,
        verification_type: request.verification_type,
        status:            request.status,
        is_private:        true,
      },
    });
  } catch (err) {
    return res.status(404).json({ success: false, message: err.message });
  }
}

module.exports = { getSecureFileUrl, listStartupFiles, getSecureVerificationDoc };

