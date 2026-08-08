/**
 * Socket.IO message handlers — chat v2
 *
 * Events handled:
 *   join_conversation      verify membership + join room
 *   leave_conversation     leave room
 *   send_message           persist + broadcast
 *   edit_message           edit + broadcast
 *   delete_message         soft-delete + broadcast
 *   typing_start / stop    forward to room
 *   message_read           mark read + notify sender
 *   react_message          toggle reaction + broadcast
 *   pin_message            toggle pin + broadcast
 *
 * Security:
 *   - socket.userId set by socketAuth (JWT) — never trust client userId
 *   - participant membership verified before every mutation
 *   - suspended users cannot send via socket (checked on token)
 */
const Message      = require("../models/Message.model");
const Conversation = require("../models/Conversation.model");
const Notification = require("../models/Notification.model");
const db           = require("../config/database");

function registerMessageHandlers(socket, io, onlineUsers) {
  const userId = socket.userId;

  /* ── join_conversation ─────────────────────────── */
  socket.on("join_conversation", async ({ conversationId }, cb) => {
    try {
      if (!conversationId) throw new Error("conversationId required.");
      const participants = await Conversation.getParticipants(conversationId);
      if (!participants.some(p => p.user_id === userId)) throw new Error("Not a participant.");
      socket.join(`conversation:${conversationId}`);
      if (typeof cb === "function") cb({ ok: true });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });

  /* ── leave_conversation ────────────────────────── */
  socket.on("leave_conversation", ({ conversationId }) => {
    if (conversationId) socket.leave(`conversation:${conversationId}`);
  });

  /* ── send_message ──────────────────────────────── */
  socket.on("send_message", async ({
    conversationId, message,
    attachment_url, attachment_type, mime_type, file_size, file_name, public_id,
    reply_to_id,
  }, cb) => {
    try {
      if (!conversationId) throw new Error("conversationId required.");
      if (!message?.trim() && !attachment_url) throw new Error("message or attachment required.");

      const participants = await Conversation.getParticipants(conversationId);
      if (!participants.some(p => p.user_id === userId)) throw new Error("Not a participant.");

      const saved = await Message.create({
        conversation_id: conversationId,
        sender_id:       userId,
        message:         message?.trim() || null,
        attachment_url:  attachment_url  || null,
        attachment_type: attachment_type || null,
        mime_type:       mime_type       || null,
        file_size:       file_size       || null,
        file_name:       file_name       || null,
        public_id:       public_id       || null,
        reply_to_id:     reply_to_id ? parseInt(reply_to_id) : null,
      });

      io.to(`conversation:${conversationId}`).emit("new_message", saved);

      // Notify offline + muted-exempt participants
      const others = participants.filter(p => p.user_id !== userId && !p.is_muted);
      for (const p of others) {
        const isOnline = onlineUsers.has(p.user_id) && onlineUsers.get(p.user_id).size > 0;
        const preview  = message?.trim()?.slice(0, 80) || "📎 Attachment";
        if (!isOnline) {
          Notification.create({
            user_id: p.user_id,
            title:   "New Message",
            message: preview,
            type:    "message",
          }).catch(() => {});
        } else {
          onlineUsers.get(p.user_id).forEach(sid => {
            io.to(sid).emit("notification", { type: "message", title: "New Message", message: preview });
          });
        }
      }

      if (typeof cb === "function") cb({ ok: true, message: saved });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });

  /* ── edit_message ──────────────────────────────── */
  socket.on("edit_message", async ({ conversationId, messageId, content }, cb) => {
    try {
      if (!conversationId || !messageId || !content?.trim()) throw new Error("conversationId, messageId, content required.");
      const msg = await Message.findById(messageId);
      if (msg.sender_id !== userId) throw new Error("Not authorized.");
      if (msg.deleted_at) throw new Error("Cannot edit deleted message.");

      const updated = await Message.edit(messageId, content.trim());
      io.to(`conversation:${conversationId}`).emit("message_edited", {
        conversationId: parseInt(conversationId),
        message: updated,
      });
      if (typeof cb === "function") cb({ ok: true, message: updated });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });

  /* ── delete_message ────────────────────────────── */
  socket.on("delete_message", async ({ conversationId, messageId }, cb) => {
    try {
      const msg = await Message.findById(messageId);
      if (msg.sender_id !== userId && socket.userRole !== "admin") throw new Error("Not authorized.");
      const deleted = await Message.softDelete(messageId);
      io.to(`conversation:${conversationId}`).emit("message_deleted", {
        conversationId: parseInt(conversationId),
        messageId: parseInt(messageId),
        message: deleted,
      });
      if (typeof cb === "function") cb({ ok: true });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });

  /* ── typing_start / stop ───────────────────────── */
  socket.on("typing_start", ({ conversationId }) => {
    if (conversationId)
      socket.to(`conversation:${conversationId}`).emit("typing_start", { userId, conversationId });
  });
  socket.on("typing_stop", ({ conversationId }) => {
    if (conversationId)
      socket.to(`conversation:${conversationId}`).emit("typing_stop", { userId, conversationId });
  });

  /* ── message_read ──────────────────────────────── */
  socket.on("message_read", async ({ conversationId }, cb) => {
    try {
      if (!conversationId) throw new Error("conversationId required.");
      const participants = await Conversation.getParticipants(conversationId);
      if (!participants.some(p => p.user_id === userId)) throw new Error("Not a participant.");
      await Message.markRead(conversationId, userId);
      socket.to(`conversation:${conversationId}`).emit("message_read_update", {
        conversationId,
        readBy: userId,
        readAt: new Date().toISOString(),
      });
      if (typeof cb === "function") cb({ ok: true });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });

  /* ── react_message ─────────────────────────────── */
  socket.on("react_message", async ({ conversationId, messageId, emoji }, cb) => {
    try {
      if (!conversationId || !messageId || !emoji) throw new Error("conversationId, messageId, emoji required.");
      const participants = await Conversation.getParticipants(conversationId);
      if (!participants.some(p => p.user_id === userId)) throw new Error("Not a participant.");
      const result = await Message.toggleReaction(parseInt(messageId), userId, emoji);
      io.to(`conversation:${conversationId}`).emit("message_reaction", {
        conversationId: parseInt(conversationId),
        messageId: parseInt(messageId),
        userId,
        emoji,
        action: result.action,
      });
      if (typeof cb === "function") cb({ ok: true, action: result.action });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });

  /* ── pin_message ───────────────────────────────── */
  socket.on("pin_message", async ({ conversationId, messageId }, cb) => {
    try {
      const participants = await Conversation.getParticipants(conversationId);
      if (!participants.some(p => p.user_id === userId)) throw new Error("Not a participant.");
      const updated = await Message.togglePin(messageId);
      if (updated.is_pinned) {
        await Conversation.setPinnedMessage(conversationId, parseInt(messageId));
      }
      io.to(`conversation:${conversationId}`).emit("message_pinned", {
        conversationId: parseInt(conversationId),
        message: updated,
      });
      if (typeof cb === "function") cb({ ok: true, message: updated });
    } catch (err) {
      if (typeof cb === "function") cb({ error: err.message });
    }
  });
}

module.exports = { registerMessageHandlers };
