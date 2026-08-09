/**
 * Conversation controller — chat v2
 *
 * REST endpoints:
 *   GET    /api/conversations                         my conversations
 *   GET    /api/conversations/archived               my archived convs
 *   POST   /api/conversations                         create group/team/org conv
 *   POST   /api/conversations/dm/:userId              find-or-create DM
 *   POST   /api/conversations/contact-request         request contact (approve-flow)
 *   GET    /api/conversations/contact-requests        pending requests (receiver)
 *   POST   /api/conversations/contact-requests/:id/respond  accept|decline
 *   GET    /api/conversations/:id                     get single conv
 *   PUT    /api/conversations/:id/title               rename group
 *   PUT    /api/conversations/:id/archive             toggle archive for caller
 *   PUT    /api/conversations/:id/mute                toggle mute for caller
 *   POST   /api/conversations/:id/participants        add participant
 *   DELETE /api/conversations/:id/participants/:uid   remove participant
 *   DELETE /api/conversations/:id                     delete conv
 *
 *   GET    /api/conversations/:id/messages            paginated messages
 *   GET    /api/conversations/:id/messages/search     search messages
 *   GET    /api/conversations/:id/messages/pinned     pinned messages
 *   POST   /api/conversations/:id/messages            send message
 *   PUT    /api/conversations/:id/messages/:msgId     edit message
 *   DELETE /api/conversations/:id/messages/:msgId     soft-delete message
 *   PUT    /api/conversations/:id/messages/:msgId/read  mark read
 *   PUT    /api/conversations/:id/messages/:msgId/pin   toggle pin
 *   POST   /api/conversations/:id/messages/:msgId/react  toggle emoji reaction
 */
const Conversation    = require("../models/Conversation.model");
const Message         = require("../models/Message.model");
const Notification    = require("../models/Notification.model");
const ContactRequest  = require("../models/ContactRequest.model");
const db              = require("../config/database");

/* ── helpers ─────────────────────────────────────── */
async function assertParticipant(conversationId, userId, res) {
  try {
    const participants = await Conversation.getParticipants(conversationId);
    const isMember = participants.some(p => p.user_id === userId);
    if (!isMember) {
      res.status(403).json({ message: "You are not a participant of this conversation." });
      return false;
    }
    return true;
  } catch {
    res.status(404).json({ message: "Conversation not found." });
    return false;
  }
}

function emitToConv(req, event, payload) {
  try {
    const io = req.app.get("io");
    if (io) io.to(`conversation:${payload.conversationId || payload.conversation_id}`).emit(event, payload);
  } catch { /* non-critical */ }
}

function emitToUser(req, userId, event, payload) {
  try {
    const io = req.app.get("io");
    const online = req.app.get("onlineUsers");
    if (io && online) {
      const sockets = online.get(userId);
      if (sockets) sockets.forEach(sid => io.to(sid).emit(event, payload));
    }
  } catch { /* non-critical */ }
}

/* ── GET /api/conversations ──────────────────────── */
async function getMyConversations(req, res) {
  try {
    const conversations = await Conversation.findByUser(req.user.id);
    return res.json({ conversations });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* ── GET /api/conversations/archived ────────────── */
async function getArchivedConversations(req, res) {
  try {
    const conversations = await Conversation.findArchivedByUser(req.user.id);
    return res.json({ conversations });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* ── POST /api/conversations ─────────────────────── */
async function createConversation(req, res) {
  try {
    const { participant_ids, title, type = "group", startup_id, investment_id } = req.body;
    if (!participant_ids?.length) return res.status(400).json({ message: "participant_ids required." });

    const conversation = await Conversation.create({
      type, conv_type: type, title,
      created_by: req.user.id,
      participant_ids,
      startup_id: startup_id || null,
      investment_id: investment_id || null,
    });

    // Notify other participants
    participant_ids.forEach(uid => {
      if (uid !== req.user.id) emitToUser(req, uid, "conversation_created", conversation);
    });

    return res.status(201).json({ message: "Conversation created.", conversation });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── POST /api/conversations/dm/:userId ──────────── */
async function getOrCreateDm(req, res) {
  try {
    const targetId = parseInt(req.params.userId);
    if (isNaN(targetId)) return res.status(400).json({ message: "Invalid userId." });

    // Validate target user exists before attempting DM creation
    const [[targetUser]] = await db.execute(
      "SELECT id FROM users WHERE id = ? AND status = 'active' LIMIT 1",
      [targetId]
    );
    if (!targetUser) return res.status(404).json({ message: "User not found." });

    // Check if target has blocked caller or caller has blocked target
    let blocked = null;
    try {
      [[blocked]] = await db.execute(
        `SELECT id FROM blocked_users
         WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)
         LIMIT 1`,
        [req.user.id, targetId, targetId, req.user.id]
      );
    } catch {
      // blocked_users table may not exist — skip block check gracefully
      blocked = null;
    }
    if (blocked) return res.status(403).json({ message: "Cannot message this user." });

    const conversation = await Conversation.findOrCreatePrivate(req.user.id, targetId);
    return res.json({ conversation });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── POST /api/conversations/contact-request ─────── */
async function sendContactRequest(req, res) {
  try {
    const { receiver_id, startup_id, message } = req.body;
    if (!receiver_id) return res.status(400).json({ message: "receiver_id required." });
    if (receiver_id === req.user.id) return res.status(400).json({ message: "Cannot request contact with yourself." });

    const request = await ContactRequest.create({
      sender_id: req.user.id,
      receiver_id,
      startup_id: startup_id || null,
      message: message || null,
    });

    // Notify receiver in real-time
    emitToUser(req, receiver_id, "contact_request", request);
    Notification.create({
      user_id: receiver_id,
      title:   "New Contact Request",
      message: "Someone wants to connect with you.",
      type:    "contact_request",
    }).catch(() => {});

    return res.status(201).json({ message: "Contact request sent.", request });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── GET /api/conversations/contact-requests ─────── */
async function getContactRequests(req, res) {
  try {
    const requests = await ContactRequest.findPendingForUser(req.user.id);
    return res.json({ requests });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* ── POST /api/conversations/contact-requests/:id/respond */
async function respondContactRequest(req, res) {
  try {
    const { action } = req.body; // "accept" | "decline"
    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ message: "action must be accept or decline." });
    }

    const request = await ContactRequest.findById(req.params.id);
    if (request.receiver_id !== req.user.id) {
      return res.status(403).json({ message: "Not authorized." });
    }
    if (request.status !== "pending") {
      return res.status(409).json({ message: "Request already responded to." });
    }

    const updated = await ContactRequest.respond(req.params.id, action === "accept" ? "accepted" : "declined");

    if (action === "accept") {
      // Auto-create DM now that contact is approved
      const conv = await Conversation.findOrCreatePrivate(request.sender_id, req.user.id);
      emitToUser(req, request.sender_id, "contact_request_accepted", { request: updated, conversation: conv });
      return res.json({ message: "Contact request accepted.", conversation: conv });
    } else {
      emitToUser(req, request.sender_id, "contact_request_declined", { request: updated });
      return res.json({ message: "Contact request declined." });
    }
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── GET /api/conversations/:id ──────────────────── */
async function getConversationById(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const conversation = await Conversation.findById(req.params.id, req.user.id);
    return res.json({ conversation });
  } catch (err) { return res.status(404).json({ message: err.message }); }
}

/* ── PUT /api/conversations/:id/title ────────────── */
async function updateTitle(req, res) {
  try {
    const { title } = req.body;
    if (!title) return res.status(400).json({ message: "title required." });
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const conversation = await Conversation.updateTitle(req.params.id, title);
    emitToConv(req, "conversation_updated", { conversationId: parseInt(req.params.id), title });
    return res.json({ message: "Title updated.", conversation });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PUT /api/conversations/:id/archive ─────────── */
async function toggleArchive(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const { archive } = req.body; // true | false
    await Conversation.setParticipantArchived(req.params.id, req.user.id, archive !== false);
    return res.json({ message: archive !== false ? "Conversation archived." : "Conversation unarchived." });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PUT /api/conversations/:id/mute ────────────── */
async function toggleMute(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const { mute } = req.body;
    await Conversation.setParticipantMuted(req.params.id, req.user.id, mute !== false);
    return res.json({ message: mute !== false ? "Conversation muted." : "Conversation unmuted." });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── POST /api/conversations/:id/participants ─────── */
async function addParticipant(req, res) {
  try {
    const { user_id, role } = req.body;
    if (!user_id) return res.status(400).json({ message: "user_id required." });

    // Only conversation admins can add participants or assign roles
    const participants = await Conversation.getParticipants(req.params.id);
    const caller = participants.find(p => p.user_id === req.user.id);
    if (!caller) return res.status(403).json({ message: "You are not a participant." });
    if (caller.role !== "admin" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only conversation admins can add participants." });
    }
    // Prevent role escalation — only server admins can assign admin role
    const assignedRole = (role === "admin" && req.user.role !== "admin") ? "member" : (role || "member");

    await Conversation.addParticipant(req.params.id, user_id, assignedRole);
    const conv = await Conversation.findById(req.params.id);
    emitToUser(req, user_id, "conversation_created", conv);
    return res.json({ message: "Participant added." });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── DELETE /api/conversations/:id/participants/:uid */
async function removeParticipant(req, res) {
  try {
    const participants = await Conversation.getParticipants(req.params.id);
    const caller = participants.find(p => p.user_id === req.user.id);
    if (!caller) return res.status(403).json({ message: "You are not a participant." });

    const targetId = parseInt(req.params.userId);
    // Allow self-removal, or admin removing anyone
    if (caller.user_id !== targetId && caller.role !== "admin" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only conversation admins can remove participants." });
    }
    await Conversation.removeParticipant(req.params.id, targetId);
    return res.json({ message: "Participant removed." });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── DELETE /api/conversations/:id ──────────────── */
async function deleteConversation(req, res) {
  try {
    // Only participants (and only admins among them) can delete
    const participants = await Conversation.getParticipants(req.params.id);
    const caller = participants.find(p => p.user_id === req.user.id);
    if (!caller) return res.status(403).json({ message: "You are not a participant." });
    if (caller.role !== "admin" && req.user.role !== "admin") {
      return res.status(403).json({ message: "Only conversation admins can delete a conversation." });
    }
    await Conversation.remove(req.params.id);
    return res.json({ message: "Conversation deleted." });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── GET /api/conversations/:id/messages ─────────── */
async function getMessages(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const { limit = 50, offset = 0 } = req.query;
    const result = await Message.findByConversation(req.params.id, {
      limit: Math.min(parseInt(limit) || 50, 100),
      offset: parseInt(offset) || 0,
    });
    Message.markRead(req.params.id, req.user.id).catch(() => {});
    return res.json(result);
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* ── GET /api/conversations/:id/messages/search ──── */
async function searchMessages(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const { q, limit = 20 } = req.query;
    if (!q?.trim()) return res.status(400).json({ message: "q (search term) required." });
    if (q.trim().length > 200) return res.status(400).json({ message: "Search term too long (max 200 chars)." });
    const messages = await Message.search(req.params.id, q.trim(), { limit: Math.min(parseInt(limit) || 20, 50) });
    return res.json({ messages });
  } catch (err) { return res.status(500).json({ message: "Search failed." }); }
}

/* ── GET /api/conversations/:id/messages/pinned ──── */
async function getPinnedMessages(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const messages = await Message.getPinned(req.params.id);
    return res.json({ messages });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* ── POST /api/conversations/:id/messages ────────── */
async function sendMessage(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;

    const { message, attachment_url, attachment_type, mime_type, file_size, file_name, public_id, reply_to_id } = req.body;
    const created = await Message.create({
      conversation_id: req.params.id,
      sender_id: req.user.id,
      message, attachment_url, attachment_type,
      mime_type, file_size, file_name, public_id,
      reply_to_id: reply_to_id ? parseInt(reply_to_id) : null,
    });

    const participants = await Conversation.getParticipants(req.params.id);
    const others = participants.filter(p => p.user_id !== req.user.id && !p.is_muted);
    if (others.length) {
      Notification.createBulk(others.map(p => p.user_id), {
        title: "New Message",
        message: message?.slice(0, 80) || "You received an attachment.",
        type: "message",
      }).catch(() => {});
    }

    return res.status(201).json({ message: created });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PUT /api/conversations/:id/messages/:msgId ──── */
async function editMessage(req, res) {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (msg.sender_id !== req.user.id) {
      return res.status(403).json({ message: "You can only edit your own messages." });
    }
    if (msg.deleted_at) return res.status(400).json({ message: "Cannot edit a deleted message." });

    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "message content required." });

    const updated = await Message.edit(req.params.msgId, message.trim());
    emitToConv(req, "message_edited", {
      conversationId: parseInt(req.params.id),
      message: updated,
    });
    return res.json({ message: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── DELETE /api/conversations/:id/messages/:msgId ─ */
async function deleteMessage(req, res) {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (msg.sender_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized." });
    }
    const deleted = await Message.softDelete(req.params.msgId);
    emitToConv(req, "message_deleted", {
      conversationId: parseInt(req.params.id),
      messageId: parseInt(req.params.msgId),
      message: deleted,
    });
    return res.json({ message: "Message deleted.", deleted });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PUT /api/conversations/:id/messages/:msgId/read */
async function markMessageRead(req, res) {
  try {
    await Message.markRead(req.params.id, req.user.id);
    return res.json({ message: "Marked as read." });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── PUT /api/conversations/:id/messages/:msgId/pin */
async function togglePin(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const updated = await Message.togglePin(req.params.msgId);
    if (updated.is_pinned) {
      await Conversation.setPinnedMessage(req.params.id, parseInt(req.params.msgId));
    }
    emitToConv(req, "message_pinned", {
      conversationId: parseInt(req.params.id),
      message: updated,
    });
    return res.json({ message: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* ── POST /api/conversations/:id/messages/:msgId/react */
async function toggleReaction(req, res) {
  try {
    const ok = await assertParticipant(req.params.id, req.user.id, res);
    if (!ok) return;
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: "emoji required." });

    const result = await Message.toggleReaction(
      parseInt(req.params.msgId),
      req.user.id,
      emoji
    );
    emitToConv(req, "message_reaction", {
      conversationId: parseInt(req.params.id),
      messageId: parseInt(req.params.msgId),
      userId: req.user.id,
      emoji,
      action: result.action,
    });
    return res.json(result);
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

module.exports = {
  getMyConversations, getArchivedConversations,
  createConversation, getOrCreateDm,
  sendContactRequest, getContactRequests, respondContactRequest,
  getConversationById, updateTitle, toggleArchive, toggleMute,
  addParticipant, removeParticipant, deleteConversation,
  getMessages, searchMessages, getPinnedMessages,
  sendMessage, editMessage, deleteMessage,
  markMessageRead, togglePin, toggleReaction,
};
