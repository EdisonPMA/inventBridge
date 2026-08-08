/**
 * SavedStartup controller
 * Routes:
 *   GET    /api/saved-startups              (my saved list)
 *   POST   /api/saved-startups/:startupId   (toggle save/unsave)
 *   GET    /api/saved-startups/:startupId/status  (is saved?)
 *   DELETE /api/saved-startups/:startupId   (explicit unsave)
 */
const SavedStartup = require("../models/SavedStartup.model");

/* ── GET /api/saved-startups ─────────────────────── */
async function getMySavedStartups(req, res) {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const result = await SavedStartup.findByUser(req.user.id, {
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── POST /api/saved-startups/:startupId ─────────── */
async function toggleSave(req, res) {
  try {
    const result = await SavedStartup.toggle(req.user.id, req.params.startupId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── GET /api/saved-startups/:startupId/status ───── */
async function getSaveStatus(req, res) {
  try {
    const saved = await SavedStartup.isSaved(req.user.id, req.params.startupId);
    const count = await SavedStartup.countSaves(req.params.startupId);
    return res.json({ saved, count });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── DELETE /api/saved-startups/:startupId ───────── */
async function unsaveStartup(req, res) {
  try {
    const result = await SavedStartup.remove(req.user.id, req.params.startupId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { getMySavedStartups, toggleSave, getSaveStatus, unsaveStartup };
