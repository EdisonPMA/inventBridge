/**
 * cloudStorageService.js
 * Reusable cloud storage service layer — wraps cloudinaryUpload utils
 * with safe delete/replace patterns and orphan file protection.
 *
 * All controllers should call this service instead of cloudinaryUpload directly
 * when they need replace or delete logic, so Cloudinary state stays in sync
 * with the database.
 *
 * Upload helpers (uploadProfilePhoto, uploadStartupLogo, etc.) are re-exported
 * from cloudinaryUpload so callers can use a single import:
 *   const cloudStorage = require('../services/cloudStorageService');
 */

const cloudinary = require("../config/cloudinary");
const cu         = require("../utils/cloudinaryUpload");

/* ══════════════════════════════════════════════════
   RE-EXPORT UPLOAD HELPERS
   ══════════════════════════════════════════════════ */
const uploadProfilePhoto      = cu.uploadProfilePhoto;
const uploadCoverPhoto        = cu.uploadCoverPhoto;
const uploadStartupLogo       = cu.uploadStartupLogo;
const uploadPitchDeck         = cu.uploadPitchDeck;
const uploadStartupDocument   = cu.uploadStartupDocument;
const uploadStartupVideo      = cu.uploadStartupVideo;
const uploadPostImage         = cu.uploadPostImage;
const uploadPostVideo         = cu.uploadPostVideo;
const uploadMessageAttachment = cu.uploadMessageAttachment;
const uploadAgreement         = cu.uploadAgreement;
const uploadVerificationDoc   = cu.uploadVerificationDoc;
const uploadMemberPhoto       = cu.uploadMemberPhoto;
const uploadBuffer            = cu.uploadBuffer;

/* ══════════════════════════════════════════════════
   RESOURCE TYPE DETECTION
   ══════════════════════════════════════════════════ */

/**
 * Determine the Cloudinary resource_type from a MIME type.
 * @param {string} mimeType
 * @returns {"image"|"video"|"raw"}
 */
function getResourceType(mimeType) {
  if (!mimeType) return "raw";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  return "raw"; // PDFs, Office docs, etc.
}

/* ══════════════════════════════════════════════════
   SAFE DELETE
   ══════════════════════════════════════════════════ */

/**
 * Delete a single resource from Cloudinary.
 * Logs failures but does not throw — callers can decide
 * whether to block or proceed.
 *
 * @param {string} publicId
 * @param {string} [resourceType="image"]  image | video | raw
 * @returns {Promise<{ok:boolean, result?:any, error?:string}>}
 */
async function deleteFile(publicId, resourceType = "image") {
  if (!publicId) return { ok: true }; // nothing to delete

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    if (result.result === "ok" || result.result === "not found") {
      return { ok: true, result };
    }
    console.warn(`[CloudStorage] Cloudinary delete returned: ${result.result} for ${publicId}`);
    return { ok: false, result, error: result.result };
  } catch (err) {
    console.error(`[CloudStorage] Failed to delete ${publicId} from Cloudinary:`, err.message);
    return { ok: false, error: err.message };
  }
}

/**
 * Delete multiple resources from Cloudinary in parallel.
 * @param {Array<{public_id:string, resource_type?:string}>} resources
 * @returns {Promise<void>}
 */
async function deleteFiles(resources) {
  if (!resources?.length) return;
  await Promise.all(
    resources.map(({ public_id, resource_type = "image" }) =>
      deleteFile(public_id, resource_type)
    )
  );
}

/* ══════════════════════════════════════════════════
   SAFE REPLACE
   ══════════════════════════════════════════════════ */

/**
 * Replace a cloud resource: upload new first, then delete old.
 * If the upload fails, the old file is preserved — no data loss.
 *
 * @param {Buffer}   buffer          — new file buffer
 * @param {Object}   uploadOptions   — cloudinary upload options
 * @param {string}   [oldPublicId]   — public_id of the file to delete after upload
 * @param {string}   [oldResourceType="image"]
 * @returns {Promise<UploadApiResponse>}  — result from the new upload
 */
async function replaceFile(buffer, uploadOptions, oldPublicId = null, oldResourceType = "image") {
  // 1. Upload new file FIRST — if this fails, old file is untouched
  const result = await uploadBuffer(buffer, uploadOptions);

  // 2. Only delete old file after new upload succeeded
  if (oldPublicId && oldPublicId !== result.public_id) {
    const deleteResult = await deleteFile(oldPublicId, oldResourceType);
    if (!deleteResult.ok) {
      // Log for admin cleanup — don't fail the request
      console.warn(
        `[CloudStorage] Orphaned file detected. ` +
        `Old public_id "${oldPublicId}" could not be deleted after replacement. ` +
        `Manual cleanup may be required.`
      );
    }
  }

  return result;
}

/* ══════════════════════════════════════════════════
   PRIVATE FILE URL (Signed URL)
   ══════════════════════════════════════════════════ */

/**
 * Generate a short-lived signed URL for a private/authenticated Cloudinary resource.
 * Use this for sensitive documents (verification docs, registration certificates).
 *
 * @param {string} publicId
 * @param {string} [resourceType="raw"]
 * @param {number} [expiresInSeconds=300]  — default 5 minutes
 * @returns {string}  signed URL
 */
function getPrivateFileUrl(publicId, resourceType = "raw", expiresInSeconds = 300) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.utils.private_download_url(publicId, null, {
    resource_type: resourceType,
    expires_at:    expiresAt,
    attachment:    false,
  });
}

/**
 * Generate a signed URL for a raw (document) resource using url() with sign=true.
 * This is compatible with Cloudinary v1 SDK which may lack private_download_url.
 *
 * @param {string} publicId
 * @param {string} [resourceType="raw"]
 * @param {number} [expiresInSeconds=300]
 * @returns {string}
 */
function getSignedUrl(publicId, resourceType = "raw", expiresInSeconds = 300) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  return cloudinary.url(publicId, {
    resource_type: resourceType,
    sign_url:      true,
    secure:        true,
    expires_at:    expiresAt,
    type:          "upload",
  });
}

/* ══════════════════════════════════════════════════
   GENERIC FILE UPLOAD (category-aware)
   ══════════════════════════════════════════════════ */

/**
 * Controlled upload by file category.
 * Category is set by the backend route — never trusted from client.
 *
 * Supported categories:
 *   profile_photo | cover_photo | startup_logo |
 *   pitch_deck | startup_document | startup_image |
 *   startup_video | registration_certificate |
 *   verification_document | investment_agreement
 *
 * @param {string} category
 * @param {Buffer} buffer
 * @param {Object} context  — { userId?, startupId?, originalName?, fileType? }
 * @returns {Promise<UploadApiResponse>}
 */
async function uploadByCategory(category, buffer, context = {}) {
  const { userId, startupId, originalName = "file", fileType = "document" } = context;

  switch (category) {
    case "profile_photo":
      return uploadProfilePhoto(buffer, userId);

    case "cover_photo":
      return uploadCoverPhoto(buffer, userId);

    case "startup_logo":
      return uploadStartupLogo(buffer, startupId);

    case "pitch_deck":
      return uploadPitchDeck(buffer, startupId, originalName);

    case "startup_document":
      return uploadStartupDocument(buffer, startupId, fileType, originalName);

    case "registration_certificate":
      return uploadStartupDocument(buffer, startupId, "registration_certificate", originalName);

    case "startup_image":
      return uploadBuffer(buffer, {
        folder:         `innovest/startups/${startupId}/images`,
        public_id:      `img_${startupId}_${Date.now()}`,
        resource_type:  "image",
        transformation: [{ width: 1200, quality: "auto:good", fetch_format: "auto" }],
      });

    case "startup_video":
      return uploadStartupVideo(buffer, startupId, originalName);

    case "verification_document":
      return uploadVerificationDoc(buffer, userId, originalName);

    case "investment_agreement":
      return uploadAgreement(buffer, context.investmentId, originalName);

    default:
      throw new Error(`Unsupported file category: "${category}".`);
  }
}

module.exports = {
  // Upload helpers (pass-through)
  uploadProfilePhoto,
  uploadCoverPhoto,
  uploadStartupLogo,
  uploadPitchDeck,
  uploadStartupDocument,
  uploadStartupVideo,
  uploadPostImage,
  uploadPostVideo,
  uploadMessageAttachment,
  uploadAgreement,
  uploadVerificationDoc,
  uploadMemberPhoto,
  uploadBuffer,

  // Category-aware upload
  uploadByCategory,

  // Resource type utility
  getResourceType,

  // Delete helpers
  deleteFile,
  deleteFiles,

  // Replace (upload new, then delete old)
  replaceFile,

  // Private/signed URLs
  getPrivateFileUrl,
  getSignedUrl,
};
