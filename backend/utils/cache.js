/**
 * Lightweight in-memory TTL cache.
 * No external dependencies — suitable for single-instance deployments (Render free tier).
 *
 * Usage:
 *   const { getOrSet, invalidate } = require("./cache");
 *   const data = await getOrSet("my_key", () => expensiveQuery(), 60); // 60s TTL
 */

const store = new Map(); // key → { value, expiresAt }

/**
 * Get a cached value or compute and cache it.
 * @param {string}   key     - cache key
 * @param {Function} fn      - async factory called on cache miss
 * @param {number}   ttlSecs - time-to-live in seconds (default 60)
 */
async function getOrSet(key, fn, ttlSecs = 60) {
  const now = Date.now();
  const entry = store.get(key);
  if (entry && entry.expiresAt > now) return entry.value;

  const value = await fn();
  store.set(key, { value, expiresAt: now + ttlSecs * 1000 });
  return value;
}

/**
 * Manually invalidate a cache key.
 * @param {string} key
 */
function invalidate(key) {
  store.delete(key);
}

/**
 * Invalidate all keys matching a prefix.
 * @param {string} prefix
 */
function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

// Sweep expired entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.expiresAt <= now) store.delete(key);
  }
}, 5 * 60 * 1000);

module.exports = { getOrSet, invalidate, invalidatePrefix };
