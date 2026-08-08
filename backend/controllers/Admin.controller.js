/**
 * Admin controller — centralized moderation, reporting, and audit.
 * Every function verifies admin role via requireAuth + requireRole("admin").
 * Identity always comes from req.user (JWT), never from request body.
 */
const db         = require("../config/database");
const User       = require("../models/User.model");
const Startup    = require("../models/Startup.model");
const Report     = require("../models/Report.model");
const AuditLog   = require("../models/AuditLog.model");
const Post       = require("../models/Post.model");
const Investment = require("../models/Investment.model");
const Notification = require("../models/Notification.model");
const {
  accountSuspendedEmail,
  accountReactivatedEmail,
  startupVerifiedEmail,
  startupRejectedEmail,
} = require("../utils/email");

/* ── helpers ─────────────────────────────────────── */
function ok(res, data, status = 200)   { return res.status(status).json({ success: true,  ...data }); }
function fail(res, msg, status = 400)  { return res.status(status).json({ success: false, message: msg }); }

async function audit(adminId, action, targetType, targetId, details) {
  AuditLog.log({ admin_id: adminId, action, target_type: targetType, target_id: targetId, details }).catch(() => {});
}

/* ════════════════════════════════════════════════
   DASHBOARD STATS
   GET /api/admin/stats
   ════════════════════════════════════════════════ */
async function getDashboardStats(req, res) {
  try {
    const q = async (sql, p = []) => { const [[r]] = await db.execute(sql, p); return r; };

    const [
      totalUsers, activeUsers, suspendedUsers,
      totalStartups, verifiedStartups, pendingStartups, rejectedStartups,
      totalInvestors, verifiedInvestors, pendingInvestors,
      pendingVerifications, pendingReports,
      activeOffers, acceptedOffers, rejectedOffers,
      totalPosts, reportedPosts,
    ] = await Promise.all([
      q("SELECT COUNT(*) AS v FROM users"),
      q("SELECT COUNT(*) AS v FROM users WHERE status = 'active'"),
      q("SELECT COUNT(*) AS v FROM users WHERE status = 'suspended'"),
      q("SELECT COUNT(*) AS v FROM startups"),
      q("SELECT COUNT(*) AS v FROM startups WHERE verification_status = 'verified'"),
      q("SELECT COUNT(*) AS v FROM startups WHERE verification_status = 'pending'"),
      q("SELECT COUNT(*) AS v FROM startups WHERE verification_status = 'rejected'"),
      q("SELECT COUNT(*) AS v FROM users WHERE role = 'investor'"),
      q(`SELECT COUNT(*) AS v FROM users u JOIN profiles p ON p.user_id = u.id
         WHERE u.role = 'investor' AND p.verification_level = 'verified'`),
      q(`SELECT COUNT(*) AS v FROM verification_requests
         WHERE status = 'pending' AND verification_type = 'investor_registration'`),
      q("SELECT COUNT(*) AS v FROM verification_requests WHERE status IN ('pending','under_review')"),
      q("SELECT COUNT(*) AS v FROM reports WHERE status = 'pending'").catch(() => ({ v: 0 })),
      q("SELECT COUNT(*) AS v FROM investments WHERE status IN ('pending','negotiating')"),
      q("SELECT COUNT(*) AS v FROM investments WHERE status = 'accepted'"),
      q("SELECT COUNT(*) AS v FROM investments WHERE status = 'rejected'"),
      q("SELECT COUNT(*) AS v FROM posts"),
      q(`SELECT COUNT(*) AS v FROM reports WHERE target_type = 'post' AND status = 'pending'`).catch(() => ({ v: 0 })),
    ]);

    return ok(res, {
      stats: {
        totalUsers:           totalUsers.v,
        activeUsers:          activeUsers.v,
        suspendedUsers:       suspendedUsers.v,
        totalStartups:        totalStartups.v,
        verifiedStartups:     verifiedStartups.v,
        pendingStartups:      pendingStartups.v,
        rejectedStartups:     rejectedStartups.v,
        totalInvestors:       totalInvestors.v,
        verifiedInvestors:    verifiedInvestors.v,
        pendingInvestors:     pendingInvestors.v,
        pendingVerifications: pendingVerifications.v,
        pendingReports:       pendingReports.v,
        activeOffers:         activeOffers.v,
        acceptedOffers:       acceptedOffers.v,
        rejectedOffers:       rejectedOffers.v,
        totalPosts:           totalPosts.v,
        reportedPosts:        reportedPosts.v,
      },
    });
  } catch (err) {
    console.error("getDashboardStats:", err);
    return fail(res, "Failed to load stats.", 500);
  }
}

/* ════════════════════════════════════════════════
   USER MANAGEMENT
   ════════════════════════════════════════════════ */

/* GET /api/admin/users */
async function listUsers(req, res) {
  try {
    const { search, role, status, page = 1, limit = 20 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const conditions = [];
    const params     = [];
    if (role)   { conditions.push("u.role = ?");   params.push(role); }
    if (status) { conditions.push("u.status = ?"); params.push(status); }
    if (search?.trim()) {
      conditions.push("(p.first_name LIKE ? OR p.last_name LIKE ? OR u.email LIKE ?)");
      const pct = `%${search.trim()}%`;
      params.push(pct, pct, pct);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.execute(
      `SELECT u.id, u.uuid, u.email, u.phone, u.role, u.status,
              u.created_at, u.last_login,
              p.first_name, p.last_name, p.verification_level, p.profile_photo
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${where}`,
      params
    );
    return ok(res, { users: rows, total, page: Math.max(parseInt(page) || 1, 1), limit: safeLimit });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* GET /api/admin/users/:id */
async function getUserDetail(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT u.id, u.uuid, u.email, u.phone, u.role, u.status,
              u.email_verified, u.created_at, u.last_login,
              p.first_name, p.last_name, p.verification_level,
              p.country, p.province, p.headline, p.bio, p.profile_photo
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [req.params.id]
    );
    if (!rows.length) return fail(res, "User not found.", 404);
    return ok(res, { user: rows[0] });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* PATCH /api/admin/users/:id/status */
async function setUserStatus(req, res) {
  try {
    const ALLOWED = ["active", "suspended", "pending"];
    const { status, reason } = req.body;
    if (!ALLOWED.includes(status))
      return fail(res, `Invalid status. Allowed: ${ALLOWED.join(", ")}`, 422);
    if (status === "suspended" && !reason?.trim())
      return fail(res, "A reason is required when suspending an account.", 422);

    const targetId = parseInt(req.params.id, 10);
    // Prevent admin from suspending themselves
    if (targetId === req.user.id)
      return fail(res, "You cannot change your own account status.", 403);

    await db.execute("UPDATE users SET status = ? WHERE id = ?", [status, targetId]);

    // Notify user
    Notification.create({
      user_id: targetId,
      title:   status === "suspended" ? "Account Suspended" : "Account Activated",
      message: status === "suspended"
        ? `Your account has been suspended. Reason: ${reason?.trim()}`
        : "Your account has been reactivated.",
      type: "general",
    }).catch(() => {});

    // Email fallback — user may not be checking the platform
    db.execute(
      `SELECT u.email, p.first_name, p.last_name
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [targetId]
    ).then(([[row]]) => {
      if (!row?.email) return;
      const name = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email;
      if (status === "suspended") {
        accountSuspendedEmail({ recipientEmail: row.email, recipientName: name, reason: reason?.trim() });
      } else if (status === "active") {
        accountReactivatedEmail({ recipientEmail: row.email, recipientName: name });
      }
    }).catch(() => {});

    audit(req.user.id, `user_${status}`, "user", targetId, { reason: reason?.trim() });

    return ok(res, { message: `User ${status}.` });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* PATCH /api/admin/users/:id/role */
async function setUserRole(req, res) {
  try {
    const ALLOWED = ["inventor", "investor", "organization", "admin"];
    const { role } = req.body;
    if (!ALLOWED.includes(role))
      return fail(res, `Invalid role. Allowed: ${ALLOWED.join(", ")}`, 422);

    const targetId = parseInt(req.params.id, 10);
    await db.execute("UPDATE users SET role = ? WHERE id = ?", [role, targetId]);

    audit(req.user.id, "user_role_changed", "user", targetId, { newRole: role });
    return ok(res, { message: `User role updated to ${role}.` });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* ════════════════════════════════════════════════
   STARTUP MODERATION
   ════════════════════════════════════════════════ */

/* ── GET /api/admin/startups ──────────────────────── */
async function listStartups(req, res) {
  try {
    const { search, status, verification_status, page = 1, limit = 20 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const conditions = [];
    const params     = [];
    if (status)              { conditions.push("s.status = ?");              params.push(status); }
    if (verification_status) { conditions.push("s.verification_status = ?"); params.push(verification_status); }
    if (search?.trim()) {
      conditions.push("(s.name LIKE ? OR s.industry LIKE ?)");
      const pct = `%${search.trim()}%`;
      params.push(pct, pct);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.execute(
      `SELECT s.id, s.name, s.slug, s.industry, s.stage, s.status,
              s.verification_status, s.funding_required, s.country, s.created_at,
              c.name AS category_name,
              p.first_name AS owner_first, p.last_name AS owner_last, p.profile_photo AS owner_photo
       FROM startups s
       LEFT JOIN categories c ON c.id = s.category_id
       LEFT JOIN profiles p ON p.user_id = s.owner_id
       ${where}
       ORDER BY s.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM startups s ${where}`, params
    );
    return ok(res, { startups: rows, total, page: Math.max(parseInt(page) || 1, 1), limit: safeLimit });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* ── GET /api/admin/startups/:id ──────────────────── */
async function getStartupDetail(req, res) {
  try {
    const id = parseInt(req.params.id, 10);

    // Full startup row
    const [[startup]] = await db.execute(
      `SELECT s.*,
              c.name  AS category_name,
              u.email AS owner_email,
              p.first_name AS owner_first, p.last_name AS owner_last,
              p.profile_photo AS owner_photo, p.headline AS owner_headline,
              p.country AS owner_country, p.verification_level AS owner_verification_level
       FROM startups s
       LEFT JOIN categories c  ON c.id  = s.category_id
       LEFT JOIN users u       ON u.id  = s.owner_id
       LEFT JOIN profiles p    ON p.user_id = s.owner_id
       WHERE s.id = ?`,
      [id]
    );
    if (!startup) return fail(res, "Startup not found.", 404);

    // Team members
    const [members] = await db.execute(
      `SELECT id, name, email, position, bio, ownership_percentage, photo_url
       FROM startup_members WHERE startup_id = ? ORDER BY id ASC`,
      [id]
    );

    // Files (logo, pitch deck, cert, demo video, etc.)
    const [files] = await db.execute(
      `SELECT id, file_type, title, cloud_url, mime_type, file_size, is_private, uploaded_at
       FROM startup_files WHERE startup_id = ? ORDER BY file_type ASC, uploaded_at DESC`,
      [id]
    );

    // Verification request history for this startup
    const [verRequests] = await db.execute(
      `SELECT vr.id, vr.verification_type, vr.status, vr.document_url,
              vr.remarks, vr.created_at, vr.verified_at,
              ap.first_name AS reviewer_first, ap.last_name AS reviewer_last
       FROM verification_requests vr
       LEFT JOIN profiles ap ON ap.user_id = vr.verified_by
       WHERE vr.startup_id = ?
       ORDER BY vr.created_at DESC`,
      [id]
    );

    return ok(res, {
      startup,
      members,
      files,
      verificationHistory: verRequests,
    });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* PATCH /api/admin/startups/:id/status */
async function setStartupStatus(req, res) {
  try {
    const ALLOWED_STATUS = ["draft","submitted","published","archived","suspended"];
    const ALLOWED_VERIF  = ["pending","verified","rejected"];
    const { status, verification_status, reason } = req.body;

    if (status && !ALLOWED_STATUS.includes(status))
      return fail(res, `Invalid status. Allowed: ${ALLOWED_STATUS.join(", ")}`, 422);
    if (verification_status && !ALLOWED_VERIF.includes(verification_status))
      return fail(res, `Invalid verification_status. Allowed: ${ALLOWED_VERIF.join(", ")}`, 422);
    if ((status === "suspended" || verification_status === "rejected") && !reason?.trim())
      return fail(res, "A reason is required for this action.", 422);

    const startup = await Startup.findById(req.params.id);

    if (status)              await db.execute("UPDATE startups SET status = ? WHERE id = ?", [status, startup.id]);
    if (verification_status) {
      await db.execute("UPDATE startups SET verification_status = ? WHERE id = ?", [verification_status, startup.id]);
      // Keep status in sync with verification outcome
      if (verification_status === "verified") {
        await db.execute("UPDATE startups SET status = 'published' WHERE id = ?", [startup.id]);
      } else if (verification_status === "rejected") {
        // Revert to draft so inventor can edit and resubmit
        await db.execute("UPDATE startups SET status = 'draft' WHERE id = ?", [startup.id]);
      }
      // Refresh ai_score since verification_status is a scoring factor
      Startup.refreshAiScore(startup.id);
    }

    // Notify owner
    const msg = verification_status === "verified"
      ? `🎉 Your startup "${startup.name}" has been verified and is now publicly visible to investors!`
      : reason
      ? `Action taken on "${startup.name}": ${reason.trim()}`
      : `Your startup "${startup.name}" status has been updated.`;
    const title = verification_status === "verified"
      ? "Startup Verified ✓"
      : status === "suspended"
      ? "Startup Suspended"
      : "Startup Update";
    Notification.create({ user_id: startup.owner_id, title, message: msg, type: "verification" }).catch(() => {});

    // Email fallback — founder must know even if not actively using the app
    if (verification_status === "verified" || verification_status === "rejected") {
      db.execute(
        `SELECT u.email, p.first_name, p.last_name
         FROM users u LEFT JOIN profiles p ON p.user_id = u.id
         WHERE u.id = ? LIMIT 1`,
        [startup.owner_id]
      ).then(([[row]]) => {
        if (!row?.email) return;
        const founderName = `${row.first_name || ""} ${row.last_name || ""}`.trim() || row.email;
        if (verification_status === "verified") {
          startupVerifiedEmail({ founderEmail: row.email, founderName, startupName: startup.name });
        } else {
          startupRejectedEmail({ founderEmail: row.email, founderName, startupName: startup.name, reason: reason?.trim() || null });
        }
      }).catch(() => {});
    }

    audit(req.user.id, "startup_status_changed", "startup", startup.id, { status, verification_status, reason: reason?.trim() });

    return ok(res, { message: "Startup updated." });
  } catch (err) {
    return fail(res, err.message, err.message.includes("not found") ? 404 : 500);
  }
}

/* ════════════════════════════════════════════════
   INVESTOR MANAGEMENT
   ════════════════════════════════════════════════ */

/* GET /api/admin/investors */
async function listInvestors(req, res) {
  try {
    const { search, status, verification_level, page = 1, limit = 20 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const conditions = ["u.role = 'investor'"];
    const params     = [];
    if (status)             { conditions.push("u.status = ?");             params.push(status); }
    if (verification_level) { conditions.push("p.verification_level = ?"); params.push(verification_level); }
    if (search?.trim()) {
      conditions.push("(p.first_name LIKE ? OR p.last_name LIKE ? OR u.email LIKE ?)");
      const pct = `%${search.trim()}%`;
      params.push(pct, pct, pct);
    }
    const where = `WHERE ${conditions.join(" AND ")}`;

    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.status, u.created_at,
              p.first_name, p.last_name, p.verification_level, p.country, p.profile_photo,
              (SELECT COUNT(*) FROM investments i WHERE i.investor_id = u.id) AS investment_count
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       ${where}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM users u LEFT JOIN profiles p ON p.user_id = u.id ${where}`, params
    );
    return ok(res, { investors: rows, total, page: Math.max(parseInt(page) || 1, 1), limit: safeLimit });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* ════════════════════════════════════════════════
   POST MODERATION
   ════════════════════════════════════════════════ */

/* GET /api/admin/posts */
async function listPosts(req, res) {
  try {
    const { search, visibility, page = 1, limit = 20 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const conditions = [];
    const params     = [];
    if (visibility) { conditions.push("po.visibility = ?"); params.push(visibility); }
    if (search?.trim()) {
      conditions.push("po.content LIKE ?");
      params.push(`%${search.trim()}%`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.execute(
      `SELECT po.id, po.content, po.visibility, po.created_at,
              p.first_name, p.last_name,
              (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = po.id) AS like_count,
              (SELECT COUNT(*) FROM post_comments pc WHERE pc.post_id = po.id) AS comment_count
       FROM posts po
       JOIN users u ON u.id = po.user_id
       LEFT JOIN profiles p ON p.user_id = po.user_id
       ${where}
       ORDER BY po.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM posts po ${where}`, params
    );
    return ok(res, { posts: rows, total, page: Math.max(parseInt(page) || 1, 1), limit: safeLimit });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* PATCH /api/admin/posts/:id/status */
async function setPostStatus(req, res) {
  try {
    const { action, reason } = req.body;
    const ALLOWED = ["hide", "restore", "remove"];
    if (!ALLOWED.includes(action))
      return fail(res, `Invalid action. Allowed: ${ALLOWED.join(", ")}`, 422);

    const post = await Post.findById(req.params.id);

    if (action === "remove") {
      await Post.remove(post.id);
    } else if (action === "hide") {
      await db.execute("UPDATE posts SET visibility = 'admin_hidden' WHERE id = ?", [post.id]);
    } else if (action === "restore") {
      await db.execute("UPDATE posts SET visibility = 'public' WHERE id = ?", [post.id]);
    }

    audit(req.user.id, `post_${action}`, "post", post.id, { reason: reason?.trim() });
    return ok(res, { message: `Post ${action}d.` });
  } catch (err) {
    return fail(res, err.message, err.message.includes("not found") ? 404 : 500);
  }
}

/* ════════════════════════════════════════════════
   INVESTMENT OFFER MODERATION
   ════════════════════════════════════════════════ */

/* GET /api/admin/investments */
async function listInvestments(req, res) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const params = [];
    const where  = status ? "WHERE i.status = ?" : "";
    if (status) params.push(status);

    const [rows] = await db.execute(
      `SELECT i.id, i.offered_amount, i.equity_percentage, i.status, i.created_at,
              s.name AS startup_name, s.verification_status AS startup_verification,
              ip.first_name AS investor_first, ip.last_name AS investor_last
       FROM investments i
       JOIN startups s ON s.id = i.startup_id
       JOIN users inv ON inv.id = i.investor_id
       LEFT JOIN profiles ip ON ip.user_id = i.investor_id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, safeLimit, safeOffset]
    );
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM investments i ${where}`, params
    );
    return ok(res, { investments: rows, total, page: Math.max(parseInt(page) || 1, 1), limit: safeLimit });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* PATCH /api/admin/investments/:id/suspend */
async function suspendInvestment(req, res) {
  try {
    const { reason } = req.body;
    if (!reason?.trim()) return fail(res, "A reason is required.", 422);

    const targetId = parseInt(req.params.id, 10);
    const [rows] = await db.execute("SELECT * FROM investments WHERE id = ?", [targetId]);
    if (!rows.length) return fail(res, "Investment not found.", 404);

    await db.execute("UPDATE investments SET status = 'cancelled' WHERE id = ?", [targetId]);

    Notification.create({
      user_id: rows[0].investor_id,
      title:   "Investment Offer Suspended",
      message: `Your investment offer has been suspended by an administrator. Reason: ${reason.trim()}`,
      type:    "investment",
    }).catch(() => {});

    audit(req.user.id, "investment_suspended", "investment", targetId, { reason: reason.trim() });
    return ok(res, { message: "Investment offer suspended." });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* ════════════════════════════════════════════════
   REPORTING SYSTEM
   ════════════════════════════════════════════════ */

/* GET /api/admin/reports */
async function listReports(req, res) {
  try {
    const { status, target_type, reason, page = 1, limit = 20 } = req.query;
    const result = await Report.findAll({ status, target_type, reason, page, limit });
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* GET /api/admin/reports/:id */
async function getReport(req, res) {
  try {
    const report = await Report.findById(req.params.id);
    return ok(res, { report });
  } catch (err) {
    return fail(res, err.message, 404);
  }
}

/* PATCH /api/admin/reports/:id */
async function updateReport(req, res) {
  try {
    const { status, resolution } = req.body;
    const report = await Report.updateStatus(req.params.id, {
      status, reviewed_by: req.user.id, resolution,
    });
    audit(req.user.id, "report_reviewed", "report", report.id, { status, resolution });
    return ok(res, { message: "Report updated.", report });
  } catch (err) {
    return fail(res, err.message, 400);
  }
}

/* ════════════════════════════════════════════════
   AUDIT LOGS
   GET /api/admin/audit-logs
   ════════════════════════════════════════════════ */
async function getAuditLogs(req, res) {
  try {
    const { admin_id, action, target_type, page = 1, limit = 30 } = req.query;
    const result = await AuditLog.findAll({ admin_id, action, target_type, page, limit });
    return ok(res, result);
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

/* ════════════════════════════════════════════════
   SUSPENDED ACCOUNTS LIST
   GET /api/admin/suspended
   ════════════════════════════════════════════════ */
async function listSuspended(req, res) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const safeLimit  = Math.min(Math.max(parseInt(limit) || 20, 1), 100);
    const safeOffset = (Math.max(parseInt(page) || 1, 1) - 1) * safeLimit;

    const [rows] = await db.execute(
      `SELECT u.id, u.email, u.role, u.status, u.created_at,
              p.first_name, p.last_name
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.status = 'suspended'
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [safeLimit, safeOffset]
    );
    const [[{ total }]] = await db.execute(
      "SELECT COUNT(*) AS total FROM users WHERE status = 'suspended'"
    );
    return ok(res, { users: rows, total });
  } catch (err) {
    return fail(res, err.message, 500);
  }
}

module.exports = {
  getDashboardStats,
  listUsers, getUserDetail, setUserStatus, setUserRole,
  listStartups, getStartupDetail, setStartupStatus,
  listInvestors,
  listPosts, setPostStatus,
  listInvestments, suspendInvestment,
  listReports, getReport, updateReport,
  getAuditLogs,
  listSuspended,
};
