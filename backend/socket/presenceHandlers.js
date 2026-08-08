/**
 * Scoped presence — emits user_online / user_offline ONLY to the
 * user's accepted connections, not to every socket on the server.
 *
 * Why: broadcasting to io (all clients) is O(n) on every connect/disconnect.
 * On 1 000 concurrent users that's 1 000 emits per event, leaking
 * everyone's online status to everyone else regardless of relationship.
 *
 * Fix: look up accepted connections for the user from the DB once on
 * connect/disconnect and emit only to sockets belonging to those users.
 */
const db = require("../config/database");

/**
 * Fetch the set of user IDs that share an accepted connection with userId.
 * Returns an empty Set on any DB error so presence never blocks a connection.
 * @param {number} userId
 * @returns {Promise<Set<number>>}
 */
async function getConnectionIds(userId) {
  try {
    const [rows] = await db.execute(
      `SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS peer_id
       FROM connections
       WHERE (sender_id = ? OR receiver_id = ?) AND status = 'accepted'`,
      [userId, userId, userId]
    );
    return new Set(rows.map((r) => r.peer_id));
  } catch {
    return new Set();
  }
}

/**
 * Emit a presence event (user_online / user_offline) to every socket
 * belonging to the target user's accepted connections.
 *
 * @param {import("socket.io").Server} io
 * @param {Map<number, Set<string>>} onlineUsers
 * @param {number} userId          - the user whose status changed
 * @param {"user_online"|"user_offline"} event
 */
async function emitPresenceToConnections(io, onlineUsers, userId, event) {
  try {
    const connectionIds = await getConnectionIds(userId);
    if (connectionIds.size === 0) return;

    const payload = { userId };

    for (const peerId of connectionIds) {
      const sockets = onlineUsers.get(peerId);
      if (!sockets || sockets.size === 0) continue;
      sockets.forEach((sid) => io.to(sid).emit(event, payload));
    }
  } catch { /* never block */ }
}

module.exports = { emitPresenceToConnections };
