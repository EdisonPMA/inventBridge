/**
 * Notification controller
 * Routes:
 *   GET    /api/notifications              (my notifications)
 *   PUT    /api/notifications/:id/read     (mark one read)
 *   PUT    /api/notifications/read-all     (mark all read)
 *   DELETE /api/notifications/:id
 *   DELETE /api/notifications              (clear all mine)
 */
const Notification = require("../models/Notification.model");

/* ── GET /api/notifications ──────────────────────── */
async function getMyNotifications(req, res) {
  try {
    const { is_read, type, limit = 30, offset = 0 } = req.query;
    const result = await Notification.findByUser(req.user.id, {
      is_read: is_read !== undefined ? is_read === "true" : undefined,
      type,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── PUT /api/notifications/:id/read ─────────────── */
async function markOneRead(req, res) {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }
    const updated = await Notification.markRead(req.params.id);
    return res.json({ notification: updated });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* ── PUT /api/notifications/read-all ─────────────── */
async function markAllRead(req, res) {
  try {
    const result = await Notification.markAllRead(req.user.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── DELETE /api/notifications/:id ──────────────── */
async function deleteNotification(req, res) {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification.user_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }
    const result = await Notification.remove(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* ── DELETE /api/notifications (clear all) ───────── */
async function clearAllNotifications(req, res) {
  try {
    const result = await Notification.clearAll(req.user.id);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getMyNotifications, markOneRead, markAllRead,
  deleteNotification, clearAllNotifications,
};
