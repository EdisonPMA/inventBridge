/**
 * upload.middleware.js
 * Multer middleware instances for every upload context.
 * All files are stored in memory (buffers) — no disk writes.
 * The actual Cloudinary upload happens in the controller/upload handler.
 *
 * Usage in a route:
 *   const { uploadProfilePhoto } = require('../middelwares/upload.middleware');
 *   router.put('/me/photo', requireAuth, uploadProfilePhoto.single('photo'), handler);
 */
const multer = require("multer");

// ── Shared memory storage ─────────────────────────
const memoryStorage = multer.memoryStorage();

// ── MIME type validators ──────────────────────────
const IMAGES_ONLY = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only JPEG, PNG, WEBP and GIF images are allowed."), false);
};

const DOCS_ONLY = (req, file, cb) => {
  const allowed = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only PDF, Word and PowerPoint files are allowed."), false);
};

const IMAGES_AND_DOCS = (req, file, cb) => {
  const allowed = [
    "image/jpeg", "image/png", "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only images and PDF/Word documents are allowed."), false);
};

const VIDEOS_ONLY = (req, file, cb) => {
  const allowed = ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"];
  if (allowed.includes(file.mimetype)) return cb(null, true);
  cb(new Error("Only MP4, MOV, AVI and WEBM videos are allowed."), false);
};

const IMAGES_AND_VIDEOS = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/")) {
    return cb(null, true);
  }
  cb(new Error("Only images and videos are allowed."), false);
};

const ANY_FILE = (req, file, cb) => cb(null, true);

// ── Factory helper ────────────────────────────────
function make(filter, maxMB, fieldCount = 1) {
  return multer({
    storage:  memoryStorage,
    limits:   { fileSize: maxMB * 1024 * 1024, files: fieldCount },
    fileFilter: filter,
  });
}

// ── Per-context instances ─────────────────────────

/** Single profile photo — 5 MB image */
const uploadProfilePhoto = make(IMAGES_ONLY, 5);

/** Single cover photo — 8 MB image */
const uploadCoverPhoto = make(IMAGES_ONLY, 8);

/** Startup logo — 5 MB image */
const uploadStartupLogo = make(IMAGES_ONLY, 5);

/** Pitch deck — 30 MB PDF/PPT */
const uploadPitchDeck = make(DOCS_ONLY, 30);

/** Startup document (registration certificate, legal doc) — 20 MB */
const uploadStartupDocument = make(IMAGES_AND_DOCS, 20);

/** Demo / promo video — 200 MB */
const uploadStartupVideo = make(VIDEOS_ONLY, 200);

/** Startup image (gallery) — 8 MB image */
const uploadStartupImage = make(IMAGES_ONLY, 8);

/** Registration certificate (PDF/image) — 20 MB */
const uploadRegistrationCertificate = make(IMAGES_AND_DOCS, 20);

/** Post media: image or video — 100 MB, single field */
const uploadPostMedia = make(IMAGES_AND_VIDEOS, 100);

/** Message attachment: any type — 50 MB */
const uploadMessageAttachment = make(ANY_FILE, 50);

/** Investment agreement PDF — 20 MB */
const uploadAgreement = make(DOCS_ONLY, 20);

/** Verification document (ID, certificate) — 20 MB */
const uploadVerificationDoc = make(IMAGES_AND_DOCS, 20);

/** Startup team member photo — 5 MB image */
const uploadMemberPhoto = make(IMAGES_ONLY, 5);

// ── Error handler (use after multer in routes) ────
function handleUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({ message: "File is too large." });
    }
    return res.status(400).json({ message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ message: err.message });
  }
  next();
}

module.exports = {
  uploadProfilePhoto,
  uploadCoverPhoto,
  uploadStartupLogo,
  uploadPitchDeck,
  uploadStartupDocument,
  uploadStartupImage,
  uploadRegistrationCertificate,
  uploadStartupVideo,
  uploadPostMedia,
  uploadMessageAttachment,
  uploadAgreement,
  uploadVerificationDoc,
  uploadMemberPhoto,
  handleUploadError,
};
