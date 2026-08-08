/**
 * Socket.IO investment handlers.
 * Emits real-time investment events to connected users.
 * Business logic lives in the REST controller; this only handles emission.
 */

/**
 * Emit a real-time investment event to a specific user if they are online.
 * @param {import("socket.io").Server} io
 * @param {Map<number, Set<string>>} onlineUsers
 * @param {number} userId
 * @param {string} event
 * @param {object} payload
 */
function emitToUser(io, onlineUsers, userId, event, payload) {
  const sockets = onlineUsers.get(userId);
  if (sockets && sockets.size > 0) {
    sockets.forEach((sid) => io.to(sid).emit(event, payload));
  }
}

module.exports = { emitToUser };
