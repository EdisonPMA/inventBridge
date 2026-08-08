const router = require("express").Router();
const c = require("../controllers/VerificationRequest.controller");
const { requireAuth, requireRole } = require("../middelwares/auth.middleware");
const {
  uploadVerificationDoc,
  handleUploadError,
} = require("../middelwares/upload.middleware");
const cloudinaryUpload = require("../utils/cloudinaryUpload");
const VerificationRequest = require("../models/VerificationRequest.model");

/* ── Submission ───────────────────────────────────── */
router.post("/startup/:startupId",    requireAuth, requireRole(["inventor","admin"]), c.submitStartupVerification);
router.post("/investor",              requireAuth, requireRole(["investor"]), c.submitInvestorVerification);
router.post("/:id/resubmit",          requireAuth, c.resubmit);

/* ── Upload verification document (returns URL for form) ── */
router.post(
  "/upload-document",
  requireAuth,
  uploadVerificationDoc.single("document"),
  handleUploadError,
  async (req, res) => {
    if (!req.file) return res.status(400).json({ success: false, message: "No file provided." });
    try {
      const result = await cloudinaryUpload.uploadVerificationDoc(
        req.file.buffer, req.user.id, req.file.originalname
      );
      return res.json({
        success: true,
        data: {
          url:       result.secure_url,
          public_id: result.public_id,
          mime_type: req.file.mimetype,
          file_size: req.file.size,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  }
);

/* ── Read ─────────────────────────────────────────── */
router.get("/",                       requireAuth, requireRole("admin"), c.getAllRequests);
router.get("/mine",                   requireAuth, c.getMyRequests);
router.get("/pending/count",          requireAuth, requireRole("admin"), c.getPendingCount);
router.get("/startup/:startupId",     requireAuth, c.getStartupVerification);
router.get("/investor/status",        requireAuth, requireRole(["investor","admin"]), c.getInvestorVerificationStatus);
router.get("/:id",                    requireAuth, c.getRequestById);

/* ── Admin actions ────────────────────────────────── */
router.patch("/:id/review",           requireAuth, requireRole("admin"), c.startReview);
router.patch("/:id/approve",          requireAuth, requireRole("admin"), c.approveRequest);
router.patch("/:id/reject",           requireAuth, requireRole("admin"), c.rejectRequest);

/* ── Document update ──────────────────────────────── */
router.put("/:id/document",           requireAuth, c.updateDocument);

/* ── Delete ───────────────────────────────────────── */
router.delete("/:id",                 requireAuth, c.deleteRequest);

module.exports = router;
