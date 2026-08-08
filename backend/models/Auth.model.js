/**
 * Auth.model.js — kept for backwards compatibility with Auth.controller.js
 * All logic now lives in User.model.js
 */
const User = require("./User.model");
const Profile = require("./Profile.model");

module.exports = {
  // Auth controller expects these exact names
  createUser: async (firstName, lastName, email, password, phone, role) => {
    const user = await User.create({ email, phone, password, role });
    await Profile.upsert({ user_id: user.id, first_name: firstName, last_name: lastName });
    // Verification is done manually for all roles:
    // - Investors must submit verification info and await admin approval
    // - Startup verification is per-startup, not per-user
    return User.findById(user.id);
  },
  getUserByEmail:   User.findByEmailWithPassword,
  getUserById:      User.findById,
  updateLastLogin:  User.touchLastLogin,
  getPlatformStats: User.platformStats,
  getUsers:         User.findAll,
  updateUser:       async (id, firstName, lastName, email, phone, role) => {
    await Profile.update(id, { first_name: firstName, last_name: lastName });
    return User.findById(id);
  },
  updatePassword:   User.updatePassword,
  deleteUser:       User.remove,
};
