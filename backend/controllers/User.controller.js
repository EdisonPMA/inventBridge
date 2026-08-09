/**
 * User controller
 * Routes: GET /api/users, GET /api/users/:id, PUT /api/users/:id/role,
 *         PUT /api/users/:id/status, PUT /api/users/:id/password,
 *         DELETE /api/users/:id, GET /api/users/stats, GET /api/users/me
 */
const User = require("../models/User.model");

/* â”€â”€ GET /api/users/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id);
    return res.json({ user });
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/users  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getAllUsers(req, res) {
  try {
    const { role, status, limit = 50, offset = 0 } = req.query;
    const result = await User.findAll({
      role, status,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/users/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getUserById(req, res) {
  try {
    const user = await User.findById(req.params.id);
    // Strip sensitive fields for non-owners and non-admins
    if (req.user.id !== user.id && req.user.role !== "admin") {
      const { phone, last_login, email_verified, phone_verified, token_version, ...publicUser } = user;
      return res.json({ user: publicUser });
    }
    return res.json({ user });
  } catch (err) {
    return res.status(404).json({ message: "User not found." });
  }
}

/* â”€â”€ PUT /api/users/:id/role  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateRole(req, res) {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ message: "role is required." });
    const user = await User.updateRole(req.params.id, role);
    return res.json({ message: "Role updated.", user });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/users/:id/status  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required." });
    const user = await User.updateStatus(req.params.id, status);
    return res.json({ message: "Status updated.", user });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ PUT /api/users/:id/password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updatePassword(req, res) {
  try {
    // Users can only change their own password; admin can change anyone's
    const targetId = parseInt(req.params.id);
    if (req.user.role !== "admin" && req.user.id !== targetId) {
      return res.status(403).json({ message: "Not authorized." });
    }
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ message: "New password must be at least 8 characters." });
    }
    // Non-admin must provide current password
    if (req.user.role !== "admin") {
      const userRow = await User.findByEmailWithPassword(req.user.email);
      const bcrypt = require("bcryptjs");
      const match = await bcrypt.compare(currentPassword || "", userRow.password_hash);
      if (!match) return res.status(401).json({ message: "Current password is incorrect." });
    }
    const result = await User.updatePassword(targetId, newPassword);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ DELETE /api/users/:id  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function deleteUser(req, res) {
  try {
    const result = await User.remove(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/users/stats  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getPlatformStats(req, res) {
  try {
    const [stats, byRole] = await Promise.all([
      User.platformStats(),
      User.countByRole(),
    ]);
    return res.json({ stats, byRole });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/users/discover â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function discoverPeople(req, res) {
  try {
    const { q, role, country, province, district, page = 1, limit = 12 } = req.query;
    const safeLimit  = (Math.min(Math.max(parseInt(limit) || 12, 1), 50)) | 0;
    const safePage   = Math.max(parseInt(page) || 1, 1);
    const safeOffset = (safePage - 1) * safeLimit;

    const result = await User.discover({ q, role, country, province, district, limit: safeLimit, offset: safeOffset });
    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total: result.total,
        totalPages: Math.ceil(result.total / safeLimit),
      },
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

module.exports = {
  getMe, getAllUsers, getUserById, updateRole, discoverPeople,
  updateStatus, updatePassword, deleteUser, getPlatformStats,
};

