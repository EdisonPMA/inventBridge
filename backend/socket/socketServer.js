/**
 * Socket.IO server setup.
 * Attaches to the existing HTTP server.
 * Manages online presence (scoped to connections) and routes message events.
 */
const { Server }                    = require("socket.io");
const socketAuth                    = require("./socketAuth");
const { registerMessageHandlers }   = require("./messageHandlers");
const { emitPresenceToConnections } = require("./presenceHandlers");

/**
 * onlineUsers: Map<userId (number), Set<socketId (string)>>
 * Tracks all active socket connections per user (multi-tab/device safe).
 */
const onlineUsers = new Map();

function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(socketAuth);

  io.on("connection", (socket) => {
    const userId = socket.userId;

    // Track socket
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    // Notify only this user's accepted connections — not the whole platform
    emitPresenceToConnections(io, onlineUsers, userId, "user_online");

    registerMessageHandlers(socket, io, onlineUsers);

    socket.on("disconnect", () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          // Notify connections that user went offline
          emitPresenceToConnections(io, onlineUsers, userId, "user_offline");
        }
      }
    });
  });

  return { io, onlineUsers };
}

module.exports = { createSocketServer, onlineUsers };
