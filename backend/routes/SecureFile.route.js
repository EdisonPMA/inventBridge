/**
 * Secure file access routes — /api/files
 *
 * Access rules (see SecureFile.controller.js for full matrix):
 *   - Any authenticated user:                    public files (cloud_url returned)
 *   - Startup owner / admin:                     all files incl. private (signed URL)
 *   - Investor with pending/negotiating/accepted/finalized offer:
 *                                                private files (signed URL, 5-min TTL)
 *                                                financial docs require negotiating+
 *   - Everyone else:                             public files only
 */
const router = require("express").Router();
const ctrl   = require("../controllers/SecureFile.controller");
const { requireAuth } = require("../middelwares/auth.middleware");

// NOTE: /verification/:requestId must be declared BEFORE /:fileId
// so Express doesn't try to parse "verification" as a fileId.
router.get("/verification/:requestId",  requireAuth, ctrl.getSecureVerificationDoc);
router.get("/startup/:startupId/list",  requireAuth, ctrl.listStartupFiles);
router.get("/:fileId",                  requireAuth, ctrl.getSecureFileUrl);

module.exports = router;
