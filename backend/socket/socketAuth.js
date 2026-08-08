/**
 * Socket.IO authentication middleware.
 * Extracts and verifies the JWT from the socket handshake auth token.
 * Rejects unauthenticated connections before they enter the server.
 */
const { verifyToken } = require("../utils/jwt");

function socketAuth(socket, next) {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace("Bearer ", "");

    if (!token) {
      return next(new Error("Authentication required."));
    }

    const decoded = verifyToken(token);
    // Attach authenticated identity — never trust client-provided userId
    socket.userId = decoded.id;
    socket.userRole = decoded.role;
    socket.userEmail = decoded.email;

    next();
  } catch {
    next(new Error("Invalid or expired token."));
  }
}

module.exports = socketAuth;
