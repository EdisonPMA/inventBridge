/**
 * adminApi.js — Admin moderation, reporting, and audit API calls.
 * All calls require an authenticated admin JWT.
 */
import api from "./api";

/* ── Dashboard ───────────────────────────────────── */
export async function getAdminStats() {
  const res = await api.get("/admin/stats");
  return res.data.stats;
}

/* ── Users ───────────────────────────────────────── */
export async function adminListUsers({ search = "", role = "", status = "", page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  if (role)   params.role   = role;
  if (status) params.status = status;
  const res = await api.get("/admin/users", { params });
  return res.data;
}

export async function adminGetUser(id) {
  const res = await api.get(`/admin/users/${id}`);
  return res.data.user;
}

export async function adminSetUserStatus(id, status, reason) {
  const res = await api.patch(`/admin/users/${id}/status`, { status, reason });
  return res.data;
}

export async function adminSetUserRole(id, role) {
  const res = await api.patch(`/admin/users/${id}/role`, { role });
  return res.data;
}

/* ── Startups ────────────────────────────────────── */
export async function adminListStartups({ search = "", status = "", verification_status = "", page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (search)              params.search              = search;
  if (status)              params.status              = status;
  if (verification_status) params.verification_status = verification_status;
  const res = await api.get("/admin/startups", { params });
  return res.data;
}

export async function adminGetStartupDetail(id) {
  const res = await api.get(`/admin/startups/${id}`);
  return res.data; // { startup, members, files, verificationHistory }
}

export async function adminSetStartupStatus(id, { status, verification_status, reason }) {
  const res = await api.patch(`/admin/startups/${id}/status`, { status, verification_status, reason });
  return res.data;
}

/* ── Investors ───────────────────────────────────── */
export async function adminListInvestors({ search = "", status = "", verification_level = "", page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (search)             params.search             = search;
  if (status)             params.status             = status;
  if (verification_level) params.verification_level = verification_level;
  const res = await api.get("/admin/investors", { params });
  return res.data;
}

/* ── Posts ───────────────────────────────────────── */
export async function adminListPosts({ search = "", page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (search) params.search = search;
  const res = await api.get("/admin/posts", { params });
  return res.data;
}

export async function adminSetPostStatus(id, action, reason) {
  const res = await api.patch(`/admin/posts/${id}/status`, { action, reason });
  return res.data;
}

/* ── Investments ─────────────────────────────────── */
export async function adminListInvestments({ status = "", page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (status) params.status = status;
  const res = await api.get("/admin/investments", { params });
  return res.data;
}

export async function adminSuspendInvestment(id, reason) {
  const res = await api.patch(`/admin/investments/${id}/suspend`, { reason });
  return res.data;
}

/* ── Reports ─────────────────────────────────────── */
export async function adminListReports({ status = "", target_type = "", reason = "", page = 1, limit = 20 } = {}) {
  const params = { page, limit };
  if (status)      params.status      = status;
  if (target_type) params.target_type = target_type;
  if (reason)      params.reason      = reason;
  const res = await api.get("/admin/reports", { params });
  return res.data;
}

export async function adminGetReport(id) {
  const res = await api.get(`/admin/reports/${id}`);
  return res.data.report;
}

export async function adminUpdateReport(id, { status, resolution }) {
  const res = await api.patch(`/admin/reports/${id}`, { status, resolution });
  return res.data;
}

/* ── Suspended accounts ──────────────────────────── */
export async function adminListSuspended({ page = 1, limit = 20 } = {}) {
  const res = await api.get("/admin/suspended", { params: { page, limit } });
  return res.data;
}

/* ── Audit logs ──────────────────────────────────── */
export async function adminGetAuditLogs({ admin_id, action, target_type, page = 1, limit = 30 } = {}) {
  const params = { page, limit };
  if (admin_id)    params.admin_id    = admin_id;
  if (action)      params.action      = action;
  if (target_type) params.target_type = target_type;
  const res = await api.get("/admin/audit-logs", { params });
  return res.data;
}

/* ── User-facing reports ─────────────────────────── */
export async function submitReport({ targetType, targetId, reason, description }) {
  const res = await api.post("/reports", { targetType, targetId, reason, description });
  return res.data;
}

export async function getMyReports() {
  const res = await api.get("/reports/mine");
  return res.data.reports ?? [];
}
