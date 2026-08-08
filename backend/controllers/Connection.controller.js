/**
 * Connection controller
 * Uses JWT for all identity — never trusts sender_id from the request body.
 */
const Connection   = require("../models/Connection.model");
const Notification = require("../models/Notification.model");
const User         = require("../models/User.model");
const db           = require("../config/database");

/* ── helpers ─────────────────────────────────────── */
function mapConn(conn, myId) {
  const isSender = conn.sender_id === myId;
  return {
    id:          conn.id,
    status:      conn.status,
    sender_id:   conn.sender_id,
    receiver_id: conn.receiver_id,
    created_at:  conn.created_at,
    // Other party details
    otherId:     isSender ? conn.receiver_id : conn.sender_id,
    otherName:   isSender
      ? `${conn.receiver_first || ""} ${conn.receiver_last || ""}`.trim()
      : `${conn.sender_first  || ""} ${conn.sender_last  || ""}`.trim(),
    otherPhoto:  isSender ? conn.receiver_photo : conn.sender_photo,
    otherRole:   isSender ? conn.receiver_role  : conn.sender_role,
    // Keep raw names for legacy consumers
    sender_first:   conn.sender_first,
    sender_last:    conn.sender_last,
    sender_photo:   conn.sender_photo,
    sender_role:    conn.sender_role,
    receiver_first: conn.receiver_first,
    receiver_last:  conn.receiver_last,
    receiver_photo: conn.receiver_photo,
    receiver_role:  conn.receiver_role,
  };
}

/* ── POST /api/connections ───────────────────────── */
async function sendRequest(req, res) {
  try {
    const senderId   = req.user.id;
    const { receiver_id } = req.body;

    if (!receiver_id)
      return res.status(400).json({ message: "receiver_id is required." });

    const receiverId = parseInt(receiver_id, 10);
    if (isNaN(receiverId))
      return res.status(400).json({ message: "receiver_id must be a number." });

    if (senderId === receiverId)
      return res.status(400).json({ message: "You cannot connect with yourself." });

    // Verify target user exists and is not an admin
    const receiver = await User.findById(receiverId);
    if (receiver.role === "admin") {
      return res.status(403).json({ message: "You cannot send a connection request to an administrator." });
    }

    const connection = await Connection.send(senderId, receiverId);

    // Notify receiver — fire-and-forget
    db.execute(
      `SELECT p.first_name, p.last_name FROM profiles p WHERE p.user_id = ? LIMIT 1`,
      [req.user.id]
    ).then(([[row]]) => {
      const senderName = row
        ? `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Someone"
        : "Someone";
      Notification.create({
        user_id: receiverId,
        title:   "New Connection Request",
        message: `${senderName} wants to connect with you.`,
        type:    "connection",
      }).catch(() => {});
    }).catch(() => {});

    return res.status(201).json({
      message:    "Connection request sent.",
      connection: mapConn(connection, senderId),
    });
  } catch (err) {
    const status =
      err.message.toLowerCase().includes("already") ||
      err.message.toLowerCase().includes("pending") ||
      err.message.toLowerCase().includes("connected")
        ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

/* ── GET /api/connections ────────────────────────── */
async function getMyConnections(req, res) {
  try {
    const { status = "accepted" } = req.query;
    const myId       = req.user.id;
    const connections = await Connection.findByUser(myId, status);
    return res.json({
      connections: connections.map((c) => mapConn(c, myId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/connections/pending  (received) ────── */
async function getPendingRequests(req, res) {
  try {
    const myId       = req.user.id;
    const connections = await Connection.pendingReceived(myId);
    return res.json({
      connections: connections.map((c) => mapConn(c, myId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/connections/sent ───────────────────── */
async function getSentRequests(req, res) {
  try {
    const myId       = req.user.id;
    const connections = await Connection.pendingSent(myId);
    return res.json({
      connections: connections.map((c) => mapConn(c, myId)),
    });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── GET /api/connections/between/:userId ────────── */
async function getConnectionBetween(req, res) {
  try {
    const connection = await Connection.findBetween(req.user.id, req.params.userId);
    if (!connection) return res.json({ connection: null });
    return res.json({ connection: mapConn(connection, req.user.id) });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
}

/* ── PATCH /api/connections/:id/accept ───────────── */
async function acceptRequest(req, res) {
  try {
    const conn = await Connection.findById(req.params.id);

    if (conn.receiver_id !== req.user.id)
      return res.status(403).json({ message: "Only the receiver can accept a request." });

    if (conn.status !== "pending")
      return res.status(409).json({ message: `Connection is already ${conn.status}.` });

    const updated = await Connection.updateStatus(req.params.id, "accepted");

    // Notify sender
    db.execute(
      `SELECT p.first_name, p.last_name FROM profiles p WHERE p.user_id = ? LIMIT 1`,
      [req.user.id]
    ).then(([[row]]) => {
      const acceptorName = row
        ? `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Someone"
        : "Someone";
      Notification.create({
        user_id: conn.sender_id,
        title:   "Connection Accepted",
        message: `${acceptorName} accepted your connection request.`,
        type:    "connection",
      }).catch(() => {});
    }).catch(() => {});

    return res.json({
      message:    "Connection accepted.",
      connection: mapConn(updated, req.user.id),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── PATCH /api/connections/:id/reject ───────────── */
async function rejectRequest(req, res) {
  try {
    const conn = await Connection.findById(req.params.id);

    if (conn.receiver_id !== req.user.id)
      return res.status(403).json({ message: "Only the receiver can reject a request." });

    if (conn.status !== "pending")
      return res.status(409).json({ message: `Connection is already ${conn.status}.` });

    const updated = await Connection.updateStatus(req.params.id, "rejected");

    return res.json({
      message:    "Connection rejected.",
      connection: mapConn(updated, req.user.id),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── DELETE /api/connections/:id/request  (cancel) ─ */
async function cancelRequest(req, res) {
  try {
    const conn = await Connection.findById(req.params.id);

    if (conn.sender_id !== req.user.id)
      return res.status(403).json({ message: "Only the sender can cancel a pending request." });

    if (conn.status !== "pending")
      return res.status(409).json({ message: "Only pending requests can be cancelled." });

    const result = await Connection.remove(req.params.id);
    return res.json({ message: "Connection request cancelled.", ...result });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── DELETE /api/connections/:id  (remove accepted) */
async function removeConnection(req, res) {
  try {
    const conn = await Connection.findById(req.params.id);

    if (conn.sender_id !== req.user.id && conn.receiver_id !== req.user.id)
      return res.status(403).json({ message: "Not authorized to remove this connection." });

    const result = await Connection.remove(req.params.id);
    return res.json(result);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

/* ── Legacy: PUT /api/connections/:id ────────────── */
async function updateConnectionStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required." });

    const conn = await Connection.findById(req.params.id);

    if (status !== "blocked" && conn.receiver_id !== req.user.id)
      return res.status(403).json({ message: "Only the receiver can accept or reject a request." });

    const updated = await Connection.updateStatus(req.params.id, status);

    if (status === "accepted") {
      Notification.create({
        user_id: conn.sender_id,
        title:   "Connection Accepted",
        message: "Your connection request was accepted.",
        type:    "connection",
      }).catch(() => {});
    }

    return res.json({
      message:    `Connection ${status}.`,
      connection: mapConn(updated, req.user.id),
    });
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
}

module.exports = {
  sendRequest,
  getMyConnections,
  getPendingRequests,
  getSentRequests,
  getConnectionBetween,
  acceptRequest,
  rejectRequest,
  cancelRequest,
  removeConnection,
  updateConnectionStatus,
};
