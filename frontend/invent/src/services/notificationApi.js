/**
 * notificationApi.js — Notifications
 */
import api from "./api";

export async function getMyNotifications({ page = 1, limit = 20, is_read, type } = {}) {
  const offset = (page - 1) * limit;
  const params = { limit, offset };
  if (is_read !== undefined) params.is_read = is_read;
  if (type)                  params.type    = type;
  const res = await api.get("/notifications", { params });
  return res.data; // { rows, total, unread }
}

export async function markNotificationRead(id) {
  const res = await api.put(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead() {
  const res = await api.put("/notifications/read-all");
  return res.data;
}

export async function deleteNotification(id) {
  const res = await api.delete(`/notifications/${id}`);
  return res.data;
}

export async function clearAllNotifications() {
  const res = await api.delete("/notifications");
  return res.data;
}
