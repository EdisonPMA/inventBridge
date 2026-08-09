/**
 * Report controller â€” public user reporting endpoints.
 * Reporter identity always comes from JWT (req.user.id).
 */
const Report       = require("../models/Report.model");
const Notification = require("../models/Notification.model");
const db           = require("../config/database");

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const TARGET_VALIDATORS = {
  startup:    (id) => db.execute("SELECT id FROM startups WHERE id = ?",     [id]),
  user:       (id) => db.execute("SELECT id FROM users WHERE id = ?",         [id]),
  post:       (id) => db.execute("SELECT id FROM posts WHERE id = ?",         [id]),
  investment: (id) => db.execute("SELECT id FROM investments WHERE id = ?",   [id]),
};

async function targetExists(type, id) {
  const validator = TARGET_VALIDATORS[type];
  if (!validator) return false;
  const [rows] = await validator(id);
  return rows.length > 0;
}

async function notifyAdmins(title, message) {
  try {
    const [admins] = await db.execute(
      "SELECT id FROM users WHERE role = 'admin' AND status = 'active'"
    );
    for (const admin of admins) {
      Notification.create({ user_id: admin.id, title, message, type: "general" }).catch(() => {});
    }
  } catch { /* non-critical */ }
}

/* â”€â”€ POST /api/reports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function createReport(req, res) {
  try {
    const { targetType, targetId, reason, description } = req.body;

    if (!targetType) return res.status(400).json({ message: "targetType is required." });
    if (!targetId)   return res.status(400).json({ message: "targetId is required." });
    if (!reason)     return res.status(400).json({ message: "reason is required." });

    if (!Report.ALLOWED_TARGET_TYPES.includes(targetType))
      return res.status(422).json({ message: `Invalid targetType. Allowed: ${Report.ALLOWED_TARGET_TYPES.join(", ")}` });

    if (!Report.ALLOWED_REASONS.includes(reason))
      return res.status(422).json({ message: `Invalid reason. Allowed: ${Report.ALLOWED_REASONS.join(", ")}` });

    if (description && description.trim().length > 1000)
      return res.status(422).json({ message: "Description must be 1000 characters or less." });

    const exists = await targetExists(targetType, parseInt(targetId, 10));
    if (!exists) return res.status(404).json({ message: `${targetType} not found.` });

    // Prevent reporting yourself
    if (targetType === "user" && parseInt(targetId, 10) === req.user.id)
      return res.status(400).json({ message: "You cannot report yourself." });

    const report = await Report.create({
      reporter_id: req.user.id,
      target_type: targetType,
      target_id:   parseInt(targetId, 10),
      reason,
      description: description?.trim() || null,
    });

    notifyAdmins(
      "New Report Submitted",
      `A ${reason.replace(/_/g, " ")} report has been submitted for a ${targetType}.`
    );

    return res.status(201).json({ success: true, message: "Report submitted.", report });
  } catch (err) {
    const status = err.message.includes("already submitted") ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/reports/mine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMyReports(req, res) {
  try {
    const [rows] = await db.execute(
      `SELECT * FROM reports WHERE reporter_id = ? ORDER BY created_at DESC`,
      [req.user.id]
    );
    return res.json({ reports: rows });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = { createReport, getMyReports };

