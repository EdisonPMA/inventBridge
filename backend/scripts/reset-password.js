/**
 * Dev utility: reset a user's password by email.
 * Usage: node scripts/reset-password.js user@example.com NewPassword123
 */
require("../config/env");

const User = require("../models/User.model");
const { hashPassword } = require("../utils/password");
const db = require("../config/database");

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: node scripts/reset-password.js <email> <new-password>");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const user = await User.findByEmailWithPassword(email);
  if (!user) {
    console.error(`No user found for ${email}`);
    process.exit(1);
  }

  const password_hash = await hashPassword(password);
  await User.setPasswordHash(user.id, password_hash);
  await db.end();

  console.log(`Password updated for ${user.email} (${user.role})`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
