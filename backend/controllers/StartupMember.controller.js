/**
 * StartupMember controller
 * Members do NOT require a platform account â€” stored by name/email.
 *
 * Routes:
 *   GET    /api/startups/:startupId/members
 *   POST   /api/startups/:startupId/members
 *   PUT    /api/startups/:startupId/members/:memberId
 *   DELETE /api/startups/:startupId/members/:memberId
 */
const StartupMember = require("../models/StartupMember.model");
const Startup       = require("../models/Startup.model");

/* â”€â”€ auth helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function assertOwnerOrAdmin(startupId, req, res) {
  const startup = await Startup.findById(startupId);
  if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
    res.status(403).json({ message: "Only the startup owner can manage team members." });
    return null;
  }
  return startup;
}

/* â”€â”€ GET /api/startups/:startupId/members â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMembers(req, res) {
  try {
    const members = await StartupMember.findByStartup(req.params.startupId);
    return res.json({ members });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ POST /api/startups/:startupId/members â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function addMember(req, res) {
  try {
    const startup = await assertOwnerOrAdmin(req.params.startupId, req, res);
    if (!startup) return;

    const { name, email, position, bio, ownership_percentage } = req.body;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: "Member name is required." });
    }

    const member = await StartupMember.add({
      startup_id:          startup.id,
      name,
      email,
      position,
      bio,
      ownership_percentage,
    });
    return res.status(201).json({ message: "Member added.", member });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/startups/:startupId/members/:memberId â”€ */
async function updateMember(req, res) {
  try {
    const startup = await assertOwnerOrAdmin(req.params.startupId, req, res);
    if (!startup) return;

    const { name, email, position, bio, ownership_percentage } = req.body;
    const member = await StartupMember.update(req.params.memberId, {
      name, email, position, bio, ownership_percentage,
    });
    return res.json({ message: "Member updated.", member });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/startups/:startupId/members/:memberId â”€ */
async function removeMember(req, res) {
  try {
    const startup = await assertOwnerOrAdmin(req.params.startupId, req, res);
    if (!startup) return;

    const result = await StartupMember.remove(startup.id, req.params.memberId);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = { getMembers, addMember, updateMember, removeMember };

