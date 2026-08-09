/**
 * SavedStartup controller
 * Routes:
 *   GET    /api/saved-startups              (my saved list)
 *   POST   /api/saved-startups/:startupId   (toggle save/unsave)
 *   GET    /api/saved-startups/:startupId/status  (is saved?)
 *   DELETE /api/saved-startups/:startupId   (explicit unsave)
 */
const SavedStartup = require("../models/SavedStartup.model");

/* â”€â”€ GET /api/saved-startups â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
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

/* â”€â”€ POST /api/saved-startups/:startupId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function toggleSave(req, res) {
  try {
    const result = await SavedStartup.toggle(req.user.id, req.params.startupId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/saved-startups/:startupId/status â”€â”€â”€â”€â”€ */
async function getSaveStatus(req, res) {
  try {
    const db = require("../config/database");
    const [[row]] = await db.execute(
      `SELECT COUNT(*) AS total,
              MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) AS is_saved
       FROM saved_startups WHERE startup_id = ?`,
      [req.user.id, req.params.startupId]
    );
    return res.json({ saved: row.is_saved === 1, count: Number(row.total) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/saved-startups/:startupId â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function unsaveStartup(req, res) {
  try {
    const result = await SavedStartup.remove(req.user.id, req.params.startupId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { getMySavedStartups, toggleSave, getSaveStatus, unsaveStartup };

