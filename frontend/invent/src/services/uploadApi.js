/**
 * uploadApi.js — all file upload API calls
 * Uses multipart/form-data with the shared Axios instance (auto-attaches JWT).
 * Supports upload progress callbacks for showing progress bars.
 *
 * NOTE: CLOUDINARY_API_SECRET is never used here.
 * All uploads go through the backend, which streams to Cloudinary.
 */
import api from "./api";

/* ── Upload config helper ──────────────────────── */
function multipartConfig(onProgress) {
  return {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000, // 2 min for large files
    ...(onProgress && {
      onUploadProgress: (evt) => {
        if (evt.total) {
          onProgress(Math.round((evt.loaded * 100) / evt.total));
        }
      },
    }),
  };
}

/* ════════════════════════════════════════════════
   PROFILE UPLOADS
   ════════════════════════════════════════════════ */

/**
 * Upload profile photo.
 * @param {File} file
 * @param {Function} [onProgress]  — (percent: number) => void
 * @returns {Promise<{success, data: {cloud_url, public_id, mime_type, file_size}}>}
 */
export async function uploadProfilePhoto(file, onProgress) {
  const form = new FormData();
  form.append("photo", file);
  const res = await api.put("/uploads/profile/photo", form, multipartConfig(onProgress));
  return res.data;
}

/**
 * Upload cover photo.
 * @param {File} file
 * @param {Function} [onProgress]
 */
export async function uploadCoverPhoto(file, onProgress) {
  const form = new FormData();
  form.append("cover", file);
  const res = await api.put("/uploads/profile/cover", form, multipartConfig(onProgress));
  return res.data;
}

/* ════════════════════════════════════════════════
   STARTUP UPLOADS
   ════════════════════════════════════════════════ */

/**
 * Upload startup logo.
 * @param {number|string} startupId
 * @param {File} file
 * @param {Function} [onProgress]
 */
export async function uploadStartupLogo(startupId, file, onProgress) {
  const form = new FormData();
  form.append("logo", file);
  const res = await api.put(
    `/uploads/startups/${startupId}/logo`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload startup registration certificate (private document).
 * The response does NOT contain cloud_url — use GET /api/files/:id to access it.
 * @param {number|string} startupId
 * @param {File} file
 * @param {string} [title]
 * @param {Function} [onProgress]
 */
export async function uploadRegistrationCertificate(startupId, file, title, onProgress) {
  const form = new FormData();
  form.append("certificate", file);
  if (title) form.append("title", title);
  const res = await api.post(
    `/uploads/startups/${startupId}/registration-certificate`,
    form,
    multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload pitch deck (PDF/PPT).
 * @param {number|string} startupId
 * @param {File} file
 * @param {string} [title]
 * @param {Function} [onProgress]
 */
export async function uploadPitchDeck(startupId, file, title, onProgress) {
  const form = new FormData();
  form.append("pitch", file);
  if (title) form.append("title", title);
  const res = await api.post(
    `/uploads/startups/${startupId}/pitch`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload a startup document (business plan, legal doc, etc.).
 * @param {number|string} startupId
 * @param {File} file
 * @param {"startup_document"|"financial_report"|"legal_doc"|"business_plan"|"market_research"} fileType
 * @param {string} [title]
 * @param {Function} [onProgress]
 */
export async function uploadStartupDocument(startupId, file, fileType, title, onProgress) {
  const form = new FormData();
  form.append("document", file);
  form.append("file_type", fileType);
  if (title) form.append("title", title);
  const res = await api.post(
    `/uploads/startups/${startupId}/document`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload a startup gallery image.
 * @param {number|string} startupId
 * @param {File} file
 * @param {string} [title]
 * @param {Function} [onProgress]
 */
export async function uploadStartupImage(startupId, file, title, onProgress) {
  const form = new FormData();
  form.append("image", file);
  if (title) form.append("title", title);
  const res = await api.post(
    `/uploads/startups/${startupId}/image`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload a startup demo/pitch video.
 * @param {number|string} startupId
 * @param {File} file
 * @param {string} [title]
 * @param {Function} [onProgress]
 */
export async function uploadStartupVideo(startupId, file, title, onProgress) {
  const form = new FormData();
  form.append("video", file);
  if (title) form.append("title", title);
  const res = await api.post(
    `/uploads/startups/${startupId}/video`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/* ════════════════════════════════════════════════
   VERIFICATION UPLOADS
   ════════════════════════════════════════════════ */

/**
 * Upload a verification document scoped to an existing verification request.
 * Returns request ID and status — NOT the cloud URL.
 * @param {number|string} requestId
 * @param {File} file
 * @param {Function} [onProgress]
 */
export async function uploadVerificationDocument(requestId, file, onProgress) {
  const form = new FormData();
  form.append("document", file);
  const res = await api.put(
    `/uploads/verifications/${requestId}/document`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload investor verification document (creates/updates verification request automatically).
 * @param {File} file
 * @param {Function} [onProgress]
 */
export async function uploadInvestorVerificationDocument(file, onProgress) {
  const form = new FormData();
  form.append("document", file);
  const res = await api.post(
    "/uploads/investor/verification/document", form, multipartConfig(onProgress)
  );
  return res.data;
}

/* ════════════════════════════════════════════════
   OTHER UPLOADS
   ════════════════════════════════════════════════ */

/**
 * Upload post media (image or video).
 * @param {number|string} postId
 * @param {File} file
 * @param {Function} [onProgress]
 */
export async function uploadPostMedia(postId, file, onProgress) {
  const form = new FormData();
  form.append("media", file);
  const res = await api.post(
    `/uploads/posts/${postId}/media`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/**
 * Upload a message attachment.
 * @param {number|string} conversationId
 * @param {File} file
 * @param {string} [message]
 * @param {Function} [onProgress]
 */
export async function uploadMessageAttachment(conversationId, file, message, onProgress) {
  const form = new FormData();
  form.append("attachment", file);
  if (message) form.append("message", message);
  const res = await api.post(
    `/uploads/messages/${conversationId}`, form, multipartConfig(onProgress)
  );
  return res.data;
}

/* ════════════════════════════════════════════════
   SECURE FILE ACCESS
   ════════════════════════════════════════════════ */

/**
 * Get a signed URL for a private file (e.g. registration certificate).
 * Returns a 5-minute signed URL for private files, or the cloud_url for public ones.
 * @param {number|string} fileId
 * @returns {Promise<{success, data: {signed_url?, cloud_url?, mime_type, file_type, title, is_private}}>}
 */
export async function getSecureFileUrl(fileId) {
  const res = await api.get(`/files/${fileId}`);
  return res.data;
}

/**
 * Get secure access to a verification document (owner or admin only).
 * @param {number|string} requestId
 */
export async function getVerificationDocUrl(requestId) {
  const res = await api.get(`/files/verification/${requestId}`);
  return res.data;
}

/* ════════════════════════════════════════════════
   FILE SIZE VALIDATION HELPERS
   ════════════════════════════════════════════════ */

export const FILE_LIMITS = {
  image:    5  * 1024 * 1024,   // 5 MB
  cover:    8  * 1024 * 1024,   // 8 MB
  document: 20 * 1024 * 1024,   // 20 MB
  video:    200 * 1024 * 1024,  // 200 MB
};

export const ALLOWED_TYPES = {
  image:    ["image/jpeg", "image/png", "image/webp"],
  document: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  video:    ["video/mp4", "video/webm", "video/quicktime"],
};

/**
 * Client-side file validation before upload.
 * @param {File} file
 * @param {"image"|"document"|"video"|"cover"} type
 * @returns {{valid: boolean, error?: string}}
 */
export function validateFile(file, type) {
  const allowedTypes = ALLOWED_TYPES[type === "cover" ? "image" : type];
  const maxBytes     = FILE_LIMITS[type];

  if (!file) return { valid: false, error: "No file selected." };

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file type. Allowed: ${allowedTypes.join(", ")}`,
    };
  }

  if (maxBytes && file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { valid: false, error: `File is too large. Maximum size is ${mb} MB.` };
  }

  return { valid: true };
}

/**
 * Format file size for display.
 * @param {number} bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
