const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const BCRYPT_PREFIX = /^\$2[aby]\$\d{2}\$/;

function isBcryptHash(hash) {
  return typeof hash === "string" && BCRYPT_PREFIX.test(hash);
}

async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
}

/**
 * Verify a password against a stored hash.
 *
 * Supports:
 *   1. bcrypt hashes (normal path)
 *   2. Legacy plain-text passwords (migration path — uses constant-time compare)
 *
 * Returns { valid: boolean, needsUpgrade: boolean }
 * When needsUpgrade is true, the caller should re-hash with bcrypt immediately.
 */
async function verifyPassword(plain, storedHash) {
  if (!storedHash) return { valid: false, needsUpgrade: false };

  if (isBcryptHash(storedHash)) {
    const valid = await bcrypt.compare(plain, storedHash);
    return { valid, needsUpgrade: false };
  }

  // Legacy plain-text path — use constant-time comparison to prevent timing attacks
  try {
    const a = Buffer.from(plain     || "", "utf8");
    const b = Buffer.from(storedHash || "", "utf8");
    // timingSafeEqual requires same-length buffers
    if (a.length !== b.length) return { valid: false, needsUpgrade: false };
    const valid = crypto.timingSafeEqual(a, b);
    return { valid, needsUpgrade: valid }; // upgrade to bcrypt on next login
  } catch {
    return { valid: false, needsUpgrade: false };
  }
}

module.exports = { hashPassword, verifyPassword, isBcryptHash };
