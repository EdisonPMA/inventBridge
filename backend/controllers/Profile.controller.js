/**
 * Profile controller
 * Routes: GET /api/profiles/me, GET /api/profiles/:userId,
 *         PUT /api/profiles/me, PUT /api/profiles/me/photo
 */
const Profile = require("../models/Profile.model");

/* â”€â”€ GET /api/profiles/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMyProfile(req, res) {
  try {
    const profile = await Profile.findByUserId(req.user.id);
    return res.json({ profile });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/profiles/:userId â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getProfileByUserId(req, res) {
  try {
    const profile = await Profile.findByUserId(req.params.userId);
    return res.json({ profile });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/profiles/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateMyProfile(req, res) {
  try {
    const allowed = [
      "first_name", "last_name", "gender", "birth_date",
      "country", "province", "district", "headline", "bio",
      "website", "linkedin",
    ];
    const fields = Object.fromEntries(
      Object.entries(req.body).filter(([k]) => allowed.includes(k))
    );
    if (!Object.keys(fields).length) {
      return res.status(400).json({ message: "No valid fields provided." });
    }
    const profile = await Profile.update(req.user.id, fields);
    return res.json({ message: "Profile updated.", profile });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/profiles/me/photo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updatePhoto(req, res) {
  try {
    const { profile_photo, cover_photo } = req.body;
    if (!profile_photo && !cover_photo) {
      return res.status(400).json({ message: "Provide profile_photo or cover_photo URL." });
    }
    const profile = await Profile.updatePhoto(req.user.id, { profile_photo, cover_photo });
    return res.json({ message: "Photo updated.", profile });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/profiles/:userId/verification  (admin) */
async function updateVerificationLevel(req, res) {
  try {
    const { level } = req.body;
    if (!level) return res.status(400).json({ message: "level is required." });
    const profile = await Profile.updateVerificationLevel(req.params.userId, level);
    return res.json({ message: "Verification level updated.", profile });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = {
  getMyProfile, getProfileByUserId,
  updateMyProfile, updatePhoto, updateVerificationLevel,
};

