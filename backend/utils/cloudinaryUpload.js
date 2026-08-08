/**
 * cloudinaryUpload.js
 * Low-level upload helpers. Each function streams a buffer directly to
 * Cloudinary — no temp files written to disk.
 *
 * Folders / naming convention:
 *   innovest/profiles/photos      — profile photos
 *   innovest/profiles/covers      — cover photos
 *   innovest/startups/{id}/logos  — startup logos
 *   innovest/startups/{id}/pitch  — pitch decks (PDF/PPT)
 *   innovest/startups/{id}/docs   — certificates & legal docs
 *   innovest/startups/{id}/videos — demo / promo videos
 *   innovest/posts/{userId}       — post images / videos
 *   innovest/messages/{convId}    — message attachments
 *   innovest/agreements           — signed investment agreements
 *   innovest/verifications        — verification documents
 */
const cloudinary = require("../config/cloudinary");

/**
 * Upload a buffer to Cloudinary via a promise-wrapped upload_stream.
 * @param {Buffer} buffer
 * @param {Object} options  - cloudinary upload options
 * @returns {Promise<UploadApiResponse>}
 */
function uploadBuffer(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
      if (err) return reject(new Error(err.message || "Cloudinary upload failed."));
      resolve(result);
    });
    stream.end(buffer);
  });
}

/* ── Profile photo ───────────────────────────────── */
async function uploadProfilePhoto(buffer, userId) {
  return uploadBuffer(buffer, {
    folder:          `innovest/profiles/photos`,
    public_id:       `user_${userId}`,
    overwrite:       true,
    resource_type:   "image",
    transformation:  [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto:good", fetch_format: "auto" }],
  });
}

/* ── Cover photo ─────────────────────────────────── */
async function uploadCoverPhoto(buffer, userId) {
  return uploadBuffer(buffer, {
    folder:          `innovest/profiles/covers`,
    public_id:       `cover_${userId}`,
    overwrite:       true,
    resource_type:   "image",
    transformation:  [{ width: 1200, height: 400, crop: "fill", quality: "auto:good", fetch_format: "auto" }],
  });
}

/* ── Startup logo ────────────────────────────────── */
async function uploadStartupLogo(buffer, startupId) {
  return uploadBuffer(buffer, {
    folder:          `innovest/startups/${startupId}/logos`,
    public_id:       `logo_${startupId}`,
    overwrite:       true,
    resource_type:   "image",
    transformation:  [{ width: 400, height: 400, crop: "pad", background: "white", quality: "auto:good", fetch_format: "auto" }],
  });
}

/* ── Pitch deck (PDF / PPT) ─────────────────────── */
async function uploadPitchDeck(buffer, startupId, originalName) {
  const publicId = `pitch_${startupId}_${Date.now()}`;
  return uploadBuffer(buffer, {
    folder:        `innovest/startups/${startupId}/pitch`,
    public_id:     publicId,
    resource_type: "raw",            // PDFs/PPTs uploaded as raw
    use_filename:  false,
    context:       `original_name=${originalName}`,
  });
}

/* ── Startup document (certificate, legal) ───────── */
async function uploadStartupDocument(buffer, startupId, fileType, originalName) {
  const publicId = `${fileType}_${startupId}_${Date.now()}`;
  return uploadBuffer(buffer, {
    folder:        `innovest/startups/${startupId}/docs`,
    public_id:     publicId,
    resource_type: "raw",
    context:       `original_name=${originalName}`,
  });
}

/* ── Startup demo video ──────────────────────────── */
async function uploadStartupVideo(buffer, startupId, originalName) {
  const publicId = `video_${startupId}_${Date.now()}`;
  return uploadBuffer(buffer, {
    folder:          `innovest/startups/${startupId}/videos`,
    public_id:       publicId,
    resource_type:   "video",
    chunk_size:      6000000,   // 6 MB chunks for large files
    eager:           [{ format: "mp4", quality: "auto" }],
    eager_async:     true,
    context:         `original_name=${originalName}`,
  });
}

/* ── Post image ──────────────────────────────────── */
async function uploadPostImage(buffer, userId) {
  return uploadBuffer(buffer, {
    folder:          `innovest/posts/${userId}`,
    public_id:       `post_img_${userId}_${Date.now()}`,
    resource_type:   "image",
    transformation:  [{ width: 1200, quality: "auto:good", fetch_format: "auto" }],
  });
}

/* ── Post video ──────────────────────────────────── */
async function uploadPostVideo(buffer, userId) {
  return uploadBuffer(buffer, {
    folder:          `innovest/posts/${userId}`,
    public_id:       `post_vid_${userId}_${Date.now()}`,
    resource_type:   "video",
    chunk_size:      6000000,
    eager:           [{ format: "mp4", quality: "auto" }],
    eager_async:     true,
  });
}

/* ── Message attachment ──────────────────────────── */
async function uploadMessageAttachment(buffer, conversationId, mimeType) {
  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");
  const resourceType = isVideo ? "video" : isImage ? "image" : "raw";

  return uploadBuffer(buffer, {
    folder:        `innovest/messages/${conversationId}`,
    public_id:     `msg_${conversationId}_${Date.now()}`,
    resource_type: resourceType,
  });
}

/* ── Investment agreement (PDF) ──────────────────── */
async function uploadAgreement(buffer, investmentId, originalName) {
  return uploadBuffer(buffer, {
    folder:        `innovest/agreements`,
    public_id:     `agreement_${investmentId}`,
    overwrite:     true,
    resource_type: "raw",
    context:       `original_name=${originalName}`,
  });
}

/* ── Verification document ───────────────────────── */
async function uploadVerificationDoc(buffer, userId, originalName) {
  return uploadBuffer(buffer, {
    folder:        `innovest/verifications`,
    public_id:     `verify_${userId}_${Date.now()}`,
    resource_type: "raw",
    context:       `original_name=${originalName}`,
  });
}

/* ── Startup member photo ────────────────────────── */
async function uploadMemberPhoto(buffer, startupId, memberId) {
  return uploadBuffer(buffer, {
    folder:         `innovest/startups/${startupId}/members`,
    public_id:      `member_${memberId}`,
    overwrite:      true,
    resource_type:  "image",
    transformation: [{ width: 400, height: 400, crop: "fill", gravity: "face", quality: "auto:good", fetch_format: "auto" }],
  });
}

/* ── Delete a resource from Cloudinary ───────────── */
async function deleteResource(publicId, resourceType = "image") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}

module.exports = {
  uploadBuffer,
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
  deleteResource,
};
