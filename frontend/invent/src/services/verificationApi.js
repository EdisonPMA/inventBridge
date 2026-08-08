/**
 * verificationApi.js — all verification-domain API calls
 * Uses the shared Axios instance (auto-attaches JWT).
 */
import api from "./api";

/* ── Document upload (returns cloud URL before form submit) ── */
export async function uploadVerificationDocument(file) {
  const form = new FormData();
  form.append("document", file);
  const res = await api.post("/verifications/upload-document", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data.data; // { url, public_id, mime_type, file_size }
}

/* ── Startup verification ──────────────────────── */
export async function submitStartupVerification(startupId) {
  const res = await api.post(`/verifications/startup/${startupId}`);
  return res.data;
}

export async function getStartupVerification(startupId) {
  const res = await api.get(`/verifications/startup/${startupId}`);
  return res.data.data; // { rows, total }
}

/* ── Investor verification ─────────────────────── */
export async function submitInvestorVerification(payload) {
  const res = await api.post("/verifications/investor", payload);
  return res.data;
}

export async function getInvestorVerificationStatus() {
  const res = await api.get("/verifications/investor/status");
  return res.data.data; // { status, request, verification_level, profile_data }
}

/* ── Resubmit after rejection ──────────────────── */
export async function resubmitVerification(requestId, documentUrl = null) {
  const res = await api.post(`/verifications/${requestId}/resubmit`, {
    document_url: documentUrl,
  });
  return res.data;
}

/* ── My requests ───────────────────────────────── */
export async function getMyVerificationRequests() {
  const res = await api.get("/verifications/mine");
  return res.data.data ?? [];
}

/* ── Single request (owner or admin) ───────────── */
export async function getVerificationById(id) {
  const res = await api.get(`/verifications/${id}`);
  return res.data.data;
}

/* ── Admin list ────────────────────────────────── */
export async function adminGetVerifications({
  status, verification_type, limit = 30, offset = 0,
} = {}) {
  const params = { limit, offset };
  if (status)            params.status            = status;
  if (verification_type) params.verification_type = verification_type;
  const res = await api.get("/verifications", { params });
  return res.data.data; // { rows, total }
}

export async function adminGetPendingCount() {
  const res = await api.get("/verifications/pending/count");
  return res.data.data.count;
}

/* ── Admin actions ─────────────────────────────── */
export async function adminStartReview(id) {
  const res = await api.patch(`/verifications/${id}/review`);
  return res.data;
}

export async function adminApproveVerification(id, remarks = null) {
  const res = await api.patch(`/verifications/${id}/approve`, { remarks });
  return res.data;
}

export async function adminRejectVerification(id, remarks) {
  const res = await api.patch(`/verifications/${id}/reject`, { remarks });
  return res.data;
}

/* ── Update document URL on existing request ───── */
export async function updateVerificationDocument(requestId, documentUrl) {
  const res = await api.put(`/verifications/${requestId}/document`, {
    document_url: documentUrl,
  });
  return res.data;
}
