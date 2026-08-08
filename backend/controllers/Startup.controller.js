/**
 * Startup controller
 *
 * Key rules enforced here:
 *  1. createStartup   — basic required fields only (name + category).
 *                       Full completeness is gated at submitForVerification.
 *  2. updateStartup   — if the startup is currently "verified" / "published",
 *                       any edit by the owner immediately sets it back to
 *                       draft + verification_status = pending and notifies the
 *                       founder. This ensures no unreviewed content goes live.
 *  3. submitForVerification — validates profile completeness AND checks that
 *                       required supporting documents are uploaded before
 *                       allowing the startup to enter the review queue.
 */
const Startup = require("../models/Startup.model");
const StartupFile = require("../models/StartupFile.model");
const Notification = require("../models/Notification.model");
const StartupView = require("../models/StartupView.model");
const AuditLog = require("../models/AuditLog.model");
const {
  startupVerifiedEmail,
  startupRejectedEmail,
  startupSubmittedEmail,
} = require("../utils/email");
const db = require("../config/database");

/* ── helpers ─────────────────────────────────────── */

/** Required documents that must be uploaded before a startup can be submitted. */
const REQUIRED_DOCS = [
  { file_type: "registration_certificate", label: "Registration Certificate" },
  { file_type: "pitch_deck",               label: "Pitch Deck" },
];

/** Fields required for the startup profile to be submission-ready. */
const PROFILE_FIELDS = [
  { key: "name",           label: "Startup name" },
  { key: "description",    label: "Description" },
  { key: "problem",        label: "Problem statement" },
  { key: "solution",       label: "Solution" },
  { key: "category_id",   label: "Category" },
  { key: "industry",       label: "Industry" },
  { key: "stage",          label: "Stage" },
  { key: "country",        label: "Country" },
  { key: "funding_required", label: "Funding required", check: (v) => Number(v) > 0 },
  { key: "equity_offered",   label: "Equity offered",   check: (v) => Number(v) > 0 },
];

async function getFounderContact(userId) {
  const [[row]] = await db.execute(
    `SELECT u.email, p.first_name, p.last_name
     FROM users u LEFT JOIN profiles p ON p.user_id = u.id
     WHERE u.id = ? LIMIT 1`,
    [userId]
  );
  return row || null;
}

/* ── POST /api/startups ──────────────────────────── */
async function createStartup(req, res) {
  try {
    const { category_id, name } = req.body;
    if (!name?.trim())  return res.status(400).json({ message: "Startup name is required." });
    if (!category_id)   return res.status(400).json({ message: "category_id is required." });

    const startup = await Startup.create({ ...req.body, owner_id: req.user.id });

    AuditLog.log({
      admin_id: req.user.id, action: "startup_created",
      target_type: "startup", target_id: startup.id,
      details: JSON.stringify({ name: startup.name }),
    }).catch(() => {});

    return res.status(201).json({ message: "Startup created.", startup });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── GET /api/startups ───────────────────────────── */
async function getAllStartups(req, res) {
  try {
    const {
      category_id, industry, stage, status = "published",
      verification_status, country, search, limit = 20, offset = 0,
    } = req.query;
    const result = await Startup.findAll({
      category_id, industry, stage, status, verification_status,
      country, search, limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/startups/discover ─────────────────── */
async function discoverStartups(req, res) {
  try {
    const {
      q, category_id, industry, stage, country, province, district,
      minFunding, maxFunding, verificationStatus,
      sort = "newest", page = 1, limit = 12,
    } = req.query;
    const allowedSorts = {
      newest:       "s.created_at DESC",
      oldest:       "s.created_at ASC",
      funding_low:  "s.funding_required ASC",
      funding_high: "s.funding_required DESC",
    };
    const orderBy    = allowedSorts[sort] || allowedSorts.newest;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 12, 1), 50);
    const safePage   = Math.max(parseInt(page) || 1, 1);
    const safeOffset = (safePage - 1) * safeLimit;
    const result = await Startup.discover({
      q, category_id, industry, stage, country, province, district,
      minFunding, maxFunding, verificationStatus, orderBy,
      limit: safeLimit, offset: safeOffset,
    });
    return res.json({
      success: true, data: result.rows,
      pagination: { page: safePage, limit: safeLimit, total: result.total, totalPages: Math.ceil(result.total / safeLimit) },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/startups/mine ──────────────────────── */
async function getMyStartups(req, res) {
  try {
    return res.json({ startups: await Startup.findByOwner(req.user.id) });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* ── GET /api/startups/:id ───────────────────────── */
async function getStartupById(req, res) {
  try {
    const startup     = await Startup.findById(req.params.id);
    const requesterId = req.user?.id;
    const isOwner     = requesterId && startup.owner_id === requesterId;
    const isAdmin     = req.user?.role === "admin";
    if (!isOwner && !isAdmin && startup.status !== "published")
      return res.status(404).json({ message: "Startup not found or is not publicly available." });
    if (!isOwner && !isAdmin) StartupView.record(startup.id, requesterId || null);
    return res.json({ startup });
  } catch (err) { return res.status(404).json({ message: err.message }); }
}

/* ── GET /api/startups/slug/:slug ────────────────── */
async function getStartupBySlug(req, res) {
  try {
    const startup     = await Startup.findBySlug(req.params.slug);
    const requesterId = req.user?.id;
    const isOwner     = requesterId && startup.owner_id === requesterId;
    const isAdmin     = req.user?.role === "admin";
    if (!isOwner && !isAdmin && startup.status !== "published")
      return res.status(404).json({ message: "Startup not found or is not publicly available." });
    if (!isOwner && !isAdmin) StartupView.record(startup.id, requesterId || null);
    return res.json({ startup });
  } catch (err) { return res.status(404).json({ message: err.message }); }
}

/* ── PUT /api/startups/:id ───────────────────────── */
/**
 * If a verified/published startup is edited by its owner, it is automatically
 * pulled from public view (status → draft, verification_status → pending) and
 * the founder is notified that re-verification is required.
 *
 * Admins can edit without triggering re-verification (they are the verifiers).
 */
async function updateStartup(req, res) {
  try {
    const startup = await Startup.findById(req.params.id);
    const isOwner = startup.owner_id === req.user.id;
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin)
      return res.status(403).json({ message: "Not authorized to edit this startup." });

    const updated = await Startup.update(req.params.id, req.body);

    // ── Re-verification gate ────────────────────────
    // If the owner edits a verified/published startup, pull it from public view.
    if (isOwner && !isAdmin &&
        (startup.verification_status === "verified" || startup.status === "published")) {

      await db.execute(
        "UPDATE startups SET status = 'draft', verification_status = 'pending' WHERE id = ?",
        [startup.id]
      );

      Notification.create({
        user_id: startup.owner_id,
        title:   "Startup Unpublished — Re-verification Required",
        message: `Your startup "${startup.name}" was edited and has been temporarily removed from public view. Please re-submit it for verification to make it live again.`,
        type:    "verification",
      }).catch(() => {});

      getFounderContact(startup.owner_id).then((row) => {
        if (!row?.email) return;
        const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email;
        const { sendEmail } = require("../utils/email");
        sendEmail({
          to:      row.email,
          subject: `"${startup.name}" has been unpublished — re-verification required`,
          text:    `Hi ${name},\n\nYou edited your startup "${startup.name}" which was previously verified. For security, it has been temporarily removed from public view.\n\nPlease log in and re-submit it for verification to restore public access.\n\nInventBridge Team`,
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
              <h2 style="color:#d97706">Re-verification Required ⚠️</h2>
              <p>Hi <strong>${name}</strong>,</p>
              <p>You recently edited your startup <strong>"${startup.name}"</strong>, which was previously verified.</p>
              <p>For security, the startup has been <strong>temporarily removed from public view</strong>. Please re-submit it for verification to restore investor access.</p>
              <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/inventor/startups/${startup.id}/edit"
                 style="display:inline-block;background:#d97706;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
                Re-submit for Verification →
              </a>
              <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · Security notification.</p>
            </div>`,
        });
      }).catch(() => {});

      AuditLog.log({
        admin_id: startup.owner_id, action: "startup_unpublished_on_edit",
        target_type: "startup", target_id: startup.id,
        details: JSON.stringify({ editedBy: req.user.id }),
      }).catch(() => {});

      const refreshed = await Startup.findById(startup.id);
      return res.json({
        message: "Startup updated. It has been removed from public view and requires re-verification.",
        startup: refreshed,
        requiresVerification: true,
      });
    }

    return res.json({ message: "Startup updated.", startup: updated });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── PUT /api/startups/:id/status ────────────────── */
async function updateStartupStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required." });
    const startup = await Startup.findById(req.params.id);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized." });
    return res.json({ message: "Status updated.", startup: await Startup.updateStatus(req.params.id, status) });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PUT /api/startups/:id/verify  (admin) ───────── */
async function verifyStartup(req, res) {
  try {
    const { verification_status } = req.body;
    if (!verification_status)
      return res.status(400).json({ message: "verification_status is required." });

    const statusMap = { verified: "published", rejected: "draft" };
    const newStatus = statusMap[verification_status];

    let startup = await Startup.updateVerification(req.params.id, verification_status);
    if (newStatus) startup = await Startup.updateStatus(req.params.id, newStatus);

    const notifyMsg = verification_status === "verified"
      ? `🎉 Your startup "${startup.name}" has been verified and is now publicly visible to investors!`
      : `Your startup "${startup.name}" verification was not approved. Please review and resubmit.`;

    Notification.create({
      user_id: startup.owner_id,
      title:   verification_status === "verified" ? "Startup Verified ✓" : "Startup Verification Update",
      message: notifyMsg, type: "verification",
    }).catch(() => {});

    getFounderContact(startup.owner_id).then((row) => {
      if (!row?.email) return;
      const founderName = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email;
      if (verification_status === "verified") {
        startupVerifiedEmail({ founderEmail: row.email, founderName, startupName: startup.name });
      } else {
        startupRejectedEmail({ founderEmail: row.email, founderName, startupName: startup.name, reason: null });
      }
    }).catch(() => {});

    return res.json({ message: "Verification status updated.", startup });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PATCH /api/startups/:id/archive ─────────────── */
async function archiveStartup(req, res) {
  try {
    const startup = await Startup.findById(req.params.id);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized to archive this startup." });
    return res.json({ message: "Startup archived.", startup: await Startup.updateStatus(req.params.id, "archived") });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── POST /api/startups/:id/submit-verification ─── */
async function submitForVerification(req, res) {
  try {
    const startup = await Startup.findById(req.params.id);

    if (startup.owner_id !== req.user.id)
      return res.status(403).json({ message: "Only the startup owner can submit for verification." });

    // ── 1. Profile completeness check ──────────────
    const missingFields = PROFILE_FIELDS.filter((f) => {
      const val = startup[f.key];
      if (f.check) return !f.check(val);
      return !val || String(val).trim() === "";
    });

    if (missingFields.length) {
      return res.status(422).json({
        message: "Your startup profile is incomplete. Please fill in all required fields before submitting.",
        missing: missingFields.map((f) => f.label),
      });
    }

    // ── 2. Required documents check ────────────────
    const uploadedFiles = await StartupFile.findByStartup(startup.id);
    const uploadedTypes = new Set(uploadedFiles.map((f) => f.file_type));

    const missingDocs = REQUIRED_DOCS.filter((d) => !uploadedTypes.has(d.file_type));
    if (missingDocs.length) {
      return res.status(422).json({
        message: "Required supporting documents are missing. Please upload them before submitting.",
        missing_documents: missingDocs.map((d) => d.label),
        hint: "Go to the Files tab in your startup editor to upload the required documents.",
      });
    }

    // ── 3. Block if already in review ──────────────
    const VerificationRequest = require("../models/VerificationRequest.model");
    const existingReqs = await VerificationRequest.findAll({
      startup_id: startup.id, verification_type: "startup_verification",
    });
    const active = (existingReqs.rows || []).find((r) =>
      ["pending", "under_review"].includes(r.status)
    );
    if (active)
      return res.status(409).json({ message: "A verification request for this startup is already pending." });

    // ── 4. Submit ───────────────────────────────────
    await Startup.updateStatus(startup.id, "submitted");
    await Startup.updateVerification(startup.id, "pending");

    const verReq = await VerificationRequest.create({
      user_id:           startup.owner_id,
      startup_id:        startup.id,
      verification_type: "startup_verification",
      document_url:      startup.registration_certificate_url || null,
    });

    Notification.create({
      user_id: startup.owner_id,
      title:   "Verification Submitted",
      message: `Your startup "${startup.name}" has been submitted for verification. We'll review it shortly.`,
      type:    "verification",
    }).catch(() => {});

    getFounderContact(startup.owner_id).then((row) => {
      if (!row?.email) return;
      const founderName = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email;
      startupSubmittedEmail({ founderEmail: row.email, founderName, startupName: startup.name });
    }).catch(() => {});

    AuditLog.log({
      admin_id: startup.owner_id, action: "startup_submitted_for_verification",
      target_type: "startup", target_id: startup.id, details: null,
    }).catch(() => {});

    return res.status(201).json({
      message: "Startup submitted for verification.",
      startup: await Startup.findById(startup.id),
      verificationRequest: verReq,
    });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── DELETE /api/startups/:id ────────────────────── */
async function deleteStartup(req, res) {
  try {
    const startup = await Startup.findById(req.params.id);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized to delete this startup." });

    AuditLog.log({
      admin_id: req.user.id, action: "startup_deleted",
      target_type: "startup", target_id: startup.id,
      details: JSON.stringify({ name: startup.name }),
    }).catch(() => {});

    return res.json(await Startup.remove(req.params.id));
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── GET /api/startups/admin/all  (admin) ─────────── */
async function adminGetAllStartups(req, res) {
  try {
    const { status, verification_status, category_id, industry, stage, search, limit = 20, offset = 0 } = req.query;
    return res.json(await Startup.findAll({
      status, verification_status, category_id, industry, stage, search,
      limit: parseInt(limit), offset: parseInt(offset),
    }));
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

module.exports = {
  createStartup, getAllStartups, discoverStartups, getMyStartups,
  getStartupById, getStartupBySlug, updateStartup,
  updateStartupStatus, verifyStartup, archiveStartup,
  submitForVerification, adminGetAllStartups, deleteStartup,
};
