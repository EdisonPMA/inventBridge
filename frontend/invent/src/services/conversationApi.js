/**
 * conversationApi.js — Chat v2 frontend client
 */
import api from "./api";

/* ── Conversations ───────────────────────────────── */
export async function getMyConversations() {
  const res = await api.get("/conversations");
  return res.data.conversations ?? [];
}

export async function getArchivedConversations() {
  const res = await api.get("/conversations/archived");
  return res.data.conversations ?? [];
}

export async function getOrCreateDm(userId) {
  const res = await api.post(`/conversations/dm/${userId}`);
  return res.data.conversation;
}

export async function createGroupConversation({ title, participantIds, type = "group", startup_id, investment_id }) {
  const res = await api.post("/conversations", {
    title, participant_ids: participantIds, type, startup_id, investment_id,
  });
  return res.data.conversation;
}

export async function getConversationById(id) {
  const res = await api.get(`/conversations/${id}`);
  return res.data.conversation;
}

export async function updateConversationTitle(id, title) {
  const res = await api.put(`/conversations/${id}/title`, { title });
  return res.data.conversation;
}

export async function archiveConversation(id, archive = true) {
  await api.put(`/conversations/${id}/archive`, { archive });
}

export async function muteConversation(id, mute = true) {
  await api.put(`/conversations/${id}/mute`, { mute });
}

/* ── Contact request workflow ────────────────────── */
export async function sendContactRequest({ receiver_id, startup_id, message }) {
  const res = await api.post("/conversations/contact-request", { receiver_id, startup_id, message });
  return res.data.request;
}

export async function getContactRequests() {
  const res = await api.get("/conversations/contact-requests");
  return res.data.requests ?? [];
}

export async function respondContactRequest(id, action) {
  const res = await api.post(`/conversations/contact-requests/${id}/respond`, { action });
  return res.data;
}

/* ── Messages ────────────────────────────────────── */
export async function getMessages(conversationId, { limit = 50, offset = 0 } = {}) {
  const res = await api.get(`/conversations/${conversationId}/messages`, { params: { limit, offset } });
  return res.data; // { rows, total }
}

export async function searchMessages(conversationId, q, limit = 20) {
  const res = await api.get(`/conversations/${conversationId}/messages/search`, { params: { q, limit } });
  return res.data.messages ?? [];
}

export async function getPinnedMessages(conversationId) {
  const res = await api.get(`/conversations/${conversationId}/messages/pinned`);
  return res.data.messages ?? [];
}

export async function sendMessage(conversationId, {
  message, attachment_url, attachment_type,
  mime_type, file_size, file_name, public_id,
  reply_to_id,
} = {}) {
  const res = await api.post(`/conversations/${conversationId}/messages`, {
    message, attachment_url, attachment_type,
    mime_type, file_size, file_name, public_id,
    reply_to_id,
  });
  return res.data.message;
}

export async function editMessage(conversationId, msgId, message) {
  const res = await api.put(`/conversations/${conversationId}/messages/${msgId}`, { message });
  return res.data.message;
}

export async function deleteMessage(conversationId, msgId) {
  const res = await api.delete(`/conversations/${conversationId}/messages/${msgId}`);
  return res.data;
}

export async function markConversationRead(conversationId) {
  await api.put(`/conversations/${conversationId}/messages/0/read`).catch(() => {});
}

export async function pinMessage(conversationId, msgId) {
  const res = await api.put(`/conversations/${conversationId}/messages/${msgId}/pin`);
  return res.data.message;
}

export async function reactToMessage(conversationId, msgId, emoji) {
  const res = await api.post(`/conversations/${conversationId}/messages/${msgId}/react`, { emoji });
  return res.data;
}

/**
 * Upload a file for chat. Returns { url, type, mime_type, file_size, file_name, public_id }
 */
export async function uploadChatFile(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await api.post("/uploads/chat", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}
