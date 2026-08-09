/**
 * VerificationRequest controller
 * Uses verificationService for all business logic so swapping
 * ManualVerificationService â†’ RDBVerificationService requires no change here.
 *
 * Routes (mounted at /api/verifications):
 *   POST   /                              submit a new request
 *   POST   /startup/:startupId            submit startup verification (owner-scoped)
 *   POST   /investor                      submit investor verification
 *   POST   /:id/resubmit                  resubmit after rejection
 *   GET    /                              admin: list all
 *   GET    /mine                          my own requests
 *   GET    /pending/count                 admin: pending count
 *   GET    /startup/:startupId            owner/admin: requests for a startup
 *   GET    /investor/status               investor: my verification status
 *   GET    /:id                           owner or admin: one request
 *   PATCH  /:id/review                    admin: start review
 *   PATCH  /:id/approve                   admin: approve (transactional)
 *   PATCH  /:id/reject                    admin: reject (transactional)
 *   PUT    /:id/document                  owner: update document URL
 *   DELETE /:id                           owner or admin: delete pending request
 */
const db                  = require("../config/database");
const VerificationRequest = require("../models/VerificationRequest.model");
const Profile             = require("../models/Profile.model");
const Startup             = require("../models/Startup.model");
const Notification        = require("../models/Notification.model");
const vs                  = require("../services/verificationService");

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function ok(res, data, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
function fail(res, message, status = 400) {
  return res.status(status).json({ success: false, message });
}

async function notifyUser(user_id, title, message) {
  Notification.create({ user_id, title, message, type: "verification" }).catch(() => {});
}

async function notifyAdmins(title, message) {
  try {
    const [admins] = await db.execute(
      "SELECT id FROM users WHERE role = 'admin' AND status = 'active'"
    );
    for (const admin of admins) {
      Notification.create({ user_id: admin.id, title, message, type: "verification" }).catch(() => {});
    }
  } catch { /* non-critical */ }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   SUBMISSION ENDPOINTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* POST /api/verifications/startup/:startupId â”€â”€â”€â”€â”€â”€â”€ */
async function submitStartupVerification(req, res) {
  try {
    const startupId = parseInt(req.params.startupId);

    // Verify ownership â€” never trust frontend
    const startup = await Startup.findById(startupId);
    if (startup.owner_id !== req.user.id) {
      return fail(res, "You do not own this startup.", 403);
    }

    // Validate required startup fields
    const missing = [];
    if (!startup.name)              missing.push("name");
    if (!startup.description)       missing.push("description");
    if (!startup.stage)             missing.push("stage");
    if (!startup.registration_type) missing.push("registration_type");
    if (missing.length) {
      return res.status(422).json({
        success: false,
        message: "Complete your startup profile before submitting for verification.",
        missing,
      });
    }

    const check = vs.prepareSubmission({
      verification_type: "startup_registration",
      document_url: startup.registration_certificate_url,
    });
    if (!check.ok) return fail(res, check.message, 422);

    const request = await VerificationRequest.create({
      user_id:           req.user.id,
      startup_id:        startupId,
      verification_type: "startup_registration",
      document_url:      startup.registration_certificate_url || null,
    });

    // Update startup to submitted state
    await Startup.updateStatus(startupId, "submitted");
    await Startup.updateVerification(startupId, "pending");

    notifyUser(req.user.id,
      "Startup Verification Submitted",
      `Your startup "${startup.name}" has been submitted for verification.`
    );
    notifyAdmins(
      "New Startup Verification Request",
      `"${startup.name}" requires verification review.`
    );

    return ok(res, { message: "Startup verification submitted.", data: request }, 201);
  } catch (err) {
    const status = err.message.includes("already") ? 409 : 400;
    return fail(res, err.message, status);
  }
}

/* POST /api/verifications/investor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function submitInvestorVerification(req, res) {
  try {
    const {
      investor_type = "individual",  // "individual" | "business"
      business_name, registration_number, registration_type,
      country, province, district, document_url,
    } = req.body;

    if (req.user.role !== "investor") {
      return fail(res, "Only investors can submit investor verification.", 403);
    }

    const check = vs.prepareSubmission({ verification_type: "investor_registration" });
    if (!check.ok) return fail(res, check.message, 422);

    // Store additional investor data in profile headline/bio as JSON (no new table)
    const meta = JSON.stringify({
      investor_type, business_name, registration_number,
      registration_type, country, province, district,
    });
    await Profile.update(req.user.id, { bio: meta });

    const request = await VerificationRequest.create({
      user_id:           req.user.id,
      startup_id:        null,
      verification_type: "investor_registration",
      document_url:      document_url || null,
    });

    notifyUser(req.user.id,
      "Investor Verification Submitted",
      "Your investor verification request has been submitted. We will review it shortly."
    );
    notifyAdmins(
      "New Investor Verification Request",
      `An investor has submitted a verification request.`
    );

    return ok(res, { message: "Investor verification submitted.", data: request }, 201);
  } catch (err) {
    const status = err.message.includes("already") ? 409 : 400;
    return fail(res, err.message, status);
  }
}

/* POST /api/verifications/:id/resubmit â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function resubmit(req, res) {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (request.user_id !== req.user.id) {
      return fail(res, "Not authorized.", 403);
    }
    if (!vs.canResubmit(request)) {
      return fail(res, "Only rejected requests can be resubmitted.", 409);
    }

    const { document_url } = req.body;

    // Reset to pending with updated document
    await db.execute(
      `UPDATE verification_requests
         SET status = 'pending',
             document_url = COALESCE(?, document_url),
             remarks = NULL,
             verified_by = NULL,
             verified_at = NULL
       WHERE id = ?`,
      [document_url || null, request.id]
    );

    // Reset startup verification status if applicable
    if (request.startup_id) {
      await Startup.updateVerification(request.startup_id, "pending");
      await Startup.updateStatus(request.startup_id, "submitted");
    }

    const updated = await VerificationRequest.findById(request.id);

    notifyUser(req.user.id, "Verification Resubmitted", "Your verification request has been resubmitted. Our team will review it shortly.");
    notifyAdmins("Verification Resubmitted", "An applicant has resubmitted a verification request for review.");

    return ok(res, { message: "Verification resubmitted.", data: updated });
  } catch (err) {
    return fail(res, err.message);
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   READ ENDPOINTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* GET /api/verifications  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getAllRequests(req, res) {
  try {
    const {
      status, user_id, startup_id, verification_type,
      limit = 30, offset = 0,
    } = req.query;
    const result = await VerificationRequest.findAll({
      status, user_id, startup_id, verification_type,
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return ok(res, { data: result });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* GET /api/verifications/mine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMyRequests(req, res) {
  try {
    const requests = await VerificationRequest.findByUser(req.user.id);
    return ok(res, { data: requests });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* GET /api/verifications/pending/count  (admin) â”€â”€â”€ */
async function getPendingCount(req, res) {
  try {
    const count = await VerificationRequest.countPending();
    return ok(res, { data: { count } });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* GET /api/verifications/startup/:startupId â”€â”€â”€â”€â”€â”€â”€ */
async function getStartupVerification(req, res) {
  try {
    const startup = await Startup.findById(req.params.startupId);
    const isOwner = startup.owner_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) return fail(res, "Not authorized.", 403);

    // Fetch requests for both submission paths (startup_registration and startup_verification)
    const [rows] = await db.execute(
      `SELECT vr.*,
              p.first_name, p.last_name, p.profile_photo,
              u.email, u.role,
              ap.first_name AS admin_first, ap.last_name AS admin_last
       FROM verification_requests vr
       JOIN users u ON u.id = vr.user_id
       LEFT JOIN profiles p ON p.user_id = vr.user_id
       LEFT JOIN profiles ap ON ap.user_id = vr.verified_by
       WHERE vr.startup_id = ?
         AND vr.verification_type IN ('startup_registration','startup_verification')
       ORDER BY vr.created_at DESC
       LIMIT 10`,
      [req.params.startupId]
    );

    return ok(res, { data: { rows, total: rows.length } });
  } catch (err) {
    return fail(res, err.message, 404);
  }
}

/* GET /api/verifications/investor/status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getInvestorVerificationStatus(req, res) {
  try {
    const requests = await VerificationRequest.findByUser(req.user.id);
    const investorReqs = requests.filter((r) => r.verification_type === "investor_registration");
    const latest = investorReqs[0] || null;
    const profile = await Profile.findByUserId(req.user.id);
    return ok(res, {
      data: {
        status:  latest?.status || "not_submitted",
        request: latest,
        verification_level: profile.verification_level,
        profile_data: profile,
      },
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* GET /api/verifications/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getRequestById(req, res) {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (request.user_id !== req.user.id && req.user.role !== "admin") {
      return fail(res, "Not authorized.", 403);
    }
    // Mask document_url for non-admin non-owners
    const isOwner = request.user_id === req.user.id;
    const isAdmin = req.user.role === "admin";
    if (!isOwner && !isAdmin) {
      request.document_url = null; // never expose to third parties
    }
    return ok(res, { data: request });
  } catch (err) {
    return fail(res, err.message, 404);
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   ADMIN ACTION ENDPOINTS
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* PATCH /api/verifications/:id/review  (admin) â”€â”€â”€â”€ */
async function startReview(req, res) {
  try {
    const request = await VerificationRequest.startReview(req.params.id, req.user.id);
    notifyUser(request.user_id,
      "Verification Under Review",
      "Your verification request is now being reviewed by our team."
    );
    return ok(res, { message: "Review started.", data: request });
  } catch (err) {
    return fail(res, err.message);
  }
}

/* PATCH /api/verifications/:id/approve  (admin) â”€â”€â”€ */
async function approveRequest(req, res) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const request = await VerificationRequest.findById(req.params.id);
    if (!["pending", "under_review"].includes(request.status)) {
      await conn.rollback();
      return fail(res, "Only pending or under_review requests can be approved.", 409);
    }

    const { remarks = null } = req.body;

    // 1. Mark request approved
    await conn.execute(
      `UPDATE verification_requests
         SET status = 'approved', verified_by = ?, remarks = ?,
             verified_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, remarks, request.id]
    );

    // 2. Service-layer side-effects (update startup/profile)
    await vs.onApproved(request, conn);

    await conn.commit();

    const updated = await VerificationRequest.findById(request.id);

    // Fetch startup name for the notification (if this is a startup verification)
    let approvalMessage = "Congratulations! Your verification has been approved by Innovest.";
    if (request.startup_id) {
      try {
        const startup = await Startup.findById(request.startup_id);
        approvalMessage =
          `ðŸŽ‰ Your startup "${startup.name}" has been verified and is now publicly visible to investors!` +
          ` Investors can now discover, save, follow, and make investment offers.`;
      } catch { /* use generic message */ }
    }

    notifyUser(request.user_id, "Verification Approved âœ“", approvalMessage);

    return ok(res, { message: "Verification approved.", data: updated });
  } catch (err) {
    await conn.rollback();
    return fail(res, err.message, 500);
  } finally {
    conn.release();
  }
}

/* PATCH /api/verifications/:id/reject  (admin) â”€â”€â”€â”€ */
async function rejectRequest(req, res) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const request = await VerificationRequest.findById(req.params.id);
    if (!["pending", "under_review"].includes(request.status)) {
      await conn.rollback();
      return fail(res, "Only pending or under_review requests can be rejected.", 409);
    }

    const { remarks } = req.body;
    if (!remarks?.trim()) {
      await conn.rollback();
      return fail(res, "A rejection reason (remarks) is required.", 422);
    }

    // 1. Mark request rejected
    await conn.execute(
      `UPDATE verification_requests
         SET status = 'rejected', verified_by = ?, remarks = ?,
             verified_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [req.user.id, remarks.trim(), request.id]
    );

    // 2. Service-layer side-effects
    await vs.onRejected(request, conn);

    await conn.commit();

    const updated = await VerificationRequest.findById(request.id);

    // Fetch startup name for the notification (if this is a startup verification)
    let rejectionMessage = `Your verification request was not approved. Reason: ${remarks.trim()}. Please fix the issues and resubmit.`;
    if (request.startup_id) {
      try {
        const startup = await Startup.findById(request.startup_id);
        rejectionMessage =
          `Your startup "${startup.name}" verification was not approved. ` +
          `Reason: ${remarks.trim()}. ` +
          `Please fix the issues, update your registration certificate if needed, and resubmit for verification.`;
      } catch { /* use generic message */ }
    }

    notifyUser(request.user_id, "Verification Not Approved", rejectionMessage);

    return ok(res, { message: "Verification rejected.", data: updated });
  } catch (err) {
    await conn.rollback();
    return fail(res, err.message, 500);
  } finally {
    conn.release();
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DOCUMENT & DELETE
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

/* PUT /api/verifications/:id/document â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateDocument(req, res) {
  try {
    const { document_url } = req.body;
    if (!document_url) return fail(res, "document_url is required.", 400);

    const request = await VerificationRequest.findById(req.params.id);
    if (request.user_id !== req.user.id) return fail(res, "Not authorized.", 403);
    if (request.status === "approved") return fail(res, "Cannot modify an approved request.", 409);

    const updated = await VerificationRequest.uploadDocument(req.params.id, document_url);
    return ok(res, { message: "Document updated.", data: updated });
  } catch (err) {
    return fail(res, err.message);
  }
}

/* DELETE /api/verifications/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function deleteRequest(req, res) {
  try {
    const request = await VerificationRequest.findById(req.params.id);
    if (request.user_id !== req.user.id && req.user.role !== "admin") {
      return fail(res, "Not authorized.", 403);
    }
    if (request.status === "approved") {
      return fail(res, "Cannot delete an approved verification request.", 409);
    }
    const result = await VerificationRequest.remove(req.params.id);
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message);
  }
}

module.exports = {
  submitStartupVerification,
  submitInvestorVerification,
  resubmit,
  getAllRequests,
  getMyRequests,
  getPendingCount,
  getStartupVerification,
  getInvestorVerificationStatus,
  getRequestById,
  startReview,
  approveRequest,
  rejectRequest,
  updateDocument,
  deleteRequest,
};

