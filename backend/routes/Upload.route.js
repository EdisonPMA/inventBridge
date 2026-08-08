/**
 * Upload routes — /api/uploads
 *
 * Pipeline per endpoint:
 *   requireAuth → uploadLimiter → multer (memory) → handleUploadError
 *   → validateFile (extra MIME/size guard) → controller
 *
 * All uploads stream directly to Cloudinary — no files written to disk.
 * MySQL stores metadata only (cloud_url, public_id, mime_type, file_size).
 * Private documents (registration certificates, verification docs) never
 * expose their cloud_url publicly — use GET /api/files/:id instead.
 */
const router = require("express").Router();
const ctrl   = require("../controllers/Upload.controller");

const { requireAuth, requireRole }  = require("../middelwares/auth.middleware");
const { uploadLimiter }             = require("../middelwares/rateLimit.middleware");
const {
  handleUploadError,
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
} = require("../middelwares/upload.middleware");
const {
  isImage, isDocument, isVideo, isImageOrVideo, isPdf,
} = require("../middelwares/fileValidation.middleware");

// Apply upload rate limit to every route in this file
router.use(uploadLimiter);

/* ── Profile ─────────────────────────────────────────────────────
   PUT  /api/uploads/profile/photo      field: photo
   PUT  /api/uploads/profile/cover      field: cover
   ─────────────────────────────────────────────────────────────── */
router.put(
  "/profile/photo",
  requireAuth,
  uploadProfilePhoto.single("photo"),
  handleUploadError,
  isImage,
  ctrl.uploadProfilePhoto
);

router.put(
  "/profile/cover",
  requireAuth,
  uploadCoverPhoto.single("cover"),
  handleUploadError,
  isImage,
  ctrl.uploadCoverPhoto
);

/* ── Startup logo ─────────────────────────────────────────────────
   PUT  /api/uploads/startups/:startupId/logo       field: logo
   ─────────────────────────────────────────────────────────────── */
router.put(
  "/startups/:startupId/logo",
  requireAuth,
  uploadStartupLogo.single("logo"),
  handleUploadError,
  isImage,
  ctrl.uploadStartupLogo
);

/* ── Team member photo ────────────────────────────────────────────
   PUT  /api/uploads/startups/:startupId/members/:memberId/photo  field: photo
   ─────────────────────────────────────────────────────────────── */
router.put(
  "/startups/:startupId/members/:memberId/photo",
  requireAuth,
  uploadMemberPhoto.single("photo"),
  handleUploadError,
  isImage,
  ctrl.uploadMemberPhoto
);

/* ── Registration certificate (private) ──────────────────────────
   POST /api/uploads/startups/:startupId/registration-certificate    field: certificate
   Owner only. Document is stored as private — not returned in public listings.
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/startups/:startupId/registration-certificate",
  requireAuth,
  uploadRegistrationCertificate.single("certificate"),
  handleUploadError,
  isDocument,
  ctrl.uploadRegistrationCertificate
);

/* ── Pitch deck ───────────────────────────────────────────────────
   POST /api/uploads/startups/:startupId/pitch      field: pitch
   body: { title? }
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/startups/:startupId/pitch",
  requireAuth,
  uploadPitchDeck.single("pitch"),
  handleUploadError,
  isDocument,
  ctrl.uploadPitchDeck
);

/* ── Startup document ─────────────────────────────────────────────
   POST /api/uploads/startups/:startupId/document   field: document
   body: { file_type: "startup_document"|"financial_report"|"legal_doc"|"business_plan", title? }
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/startups/:startupId/document",
  requireAuth,
  uploadStartupDocument.single("document"),
  handleUploadError,
  isDocument,
  ctrl.uploadStartupDocument
);

/* ── Startup image ────────────────────────────────────────────────
   POST /api/uploads/startups/:startupId/image      field: image
   body: { title? }
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/startups/:startupId/image",
  requireAuth,
  uploadStartupImage.single("image"),
  handleUploadError,
  isImage,
  ctrl.uploadStartupImage
);

/* ── Demo video ───────────────────────────────────────────────────
   POST /api/uploads/startups/:startupId/video      field: video
   body: { title? }
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/startups/:startupId/video",
  requireAuth,
  uploadStartupVideo.single("video"),
  handleUploadError,
  isVideo,
  ctrl.uploadStartupVideo
);

/* ── Post media ───────────────────────────────────────────────────
   POST /api/uploads/posts/:postId/media            field: media
   Accepts image or video. Updates post.image_url / post.video_url.
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/posts/:postId/media",
  requireAuth,
  uploadPostMedia.single("media"),
  handleUploadError,
  isImageOrVideo,
  ctrl.uploadPostMedia
);

/* ── Chat file upload (returns url+type, does NOT create a message) ──
   POST /api/uploads/chat    field: file
   Returns: { url, type }
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/chat",
  requireAuth,
  uploadMessageAttachment.single("file"),
  handleUploadError,
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file provided." });
    try {
      const result = await require("../services/cloudStorageService").uploadMessageAttachment(
        req.file.buffer,
        "chat",
        req.file.mimetype
      );
      const type = req.file.mimetype.startsWith("image/") ? "image"
        : req.file.mimetype.startsWith("video/") ? "video"
        : req.file.mimetype.startsWith("audio/") ? "audio"
        : "file";
      return res.json({ url: result.secure_url, type });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
);

/* ── Message attachment ───────────────────────────────────────────
   POST /api/uploads/messages/:conversationId       field: attachment
   body: { message? }   — creates a new message record with attachment
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/messages/:conversationId",
  requireAuth,
  uploadMessageAttachment.single("attachment"),
  handleUploadError,
  ctrl.uploadMessageAttachment
);

/* ── Investment agreement ─────────────────────────────────────────
   PUT  /api/uploads/investments/:investmentId/agreement  field: agreement
   ─────────────────────────────────────────────────────────────── */
router.put(
  "/investments/:investmentId/agreement",
  requireAuth,
  uploadAgreement.single("agreement"),
  handleUploadError,
  isPdf,
  ctrl.uploadAgreement
);

/* ── Verification document (scoped to existing request) ───────────
   PUT  /api/uploads/verifications/:requestId/document   field: document
   Document is stored privately.
   ─────────────────────────────────────────────────────────────── */
router.put(
  "/verifications/:requestId/document",
  requireAuth,
  uploadVerificationDoc.single("document"),
  handleUploadError,
  isDocument,
  ctrl.uploadVerificationDoc
);

/* ── Investor verification document (standalone) ─────────────────
   POST /api/uploads/investor/verification/document     field: document
   Creates or updates investor verification request with the document.
   ─────────────────────────────────────────────────────────────── */
router.post(
  "/investor/verification/document",
  requireAuth,
  requireRole(["investor", "admin"]),
  uploadVerificationDoc.single("document"),
  handleUploadError,
  isDocument,
  ctrl.uploadInvestorVerificationDoc
);

/* ── Admin: delete from Cloudinary ───────────────────────────────
   DELETE /api/uploads/resource
   body: { public_id, resource_type? }
   ─────────────────────────────────────────────────────────────── */
router.delete(
  "/resource",
  requireAuth,
  requireRole("admin"),
  ctrl.deleteResource
);

module.exports = router;
