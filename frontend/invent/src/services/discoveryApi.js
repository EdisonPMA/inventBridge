/**
 * discoveryApi.js — Startup Discovery & People Discovery API calls
 */
import api from "./api";

/* ── Startup Discovery ───────────────────────────── */

/**
 * GET /api/startups/discover
 * Investor-facing startup discovery with search, filters, pagination, sorting.
 */
export async function discoverStartups({
  q = "",
  category_id = "",
  industry = "",
  stage = "",
  country = "",
  province = "",
  district = "",
  minFunding = "",
  maxFunding = "",
  verificationStatus = "",
  sort = "newest",
  page = 1,
  limit = 12,
} = {}) {
  const params = { sort, page, limit };
  if (q)                  params.q                  = q;
  if (category_id)        params.category_id        = category_id;
  if (industry)           params.industry           = industry;
  if (stage)              params.stage              = stage;
  if (country)            params.country            = country;
  if (province)           params.province           = province;
  if (district)           params.district           = district;
  if (minFunding)         params.minFunding         = minFunding;
  if (maxFunding)         params.maxFunding         = maxFunding;
  if (verificationStatus) params.verificationStatus = verificationStatus;

  const res = await api.get("/startups/discover", { params });
  return res.data; // { success, data, pagination }
}

/* ── People Discovery ─────────────────────────────── */

/**
 * GET /api/users/discover
 * Search/browse users by name, headline, role, location.
 */
export async function discoverPeople({
  q = "",
  role = "",
  country = "",
  province = "",
  district = "",
  page = 1,
  limit = 12,
} = {}) {
  const params = { page, limit };
  if (q)        params.q        = q;
  if (role)     params.role     = role;
  if (country)  params.country  = country;
  if (province) params.province = province;
  if (district) params.district = district;

  const res = await api.get("/users/discover", { params });
  return res.data; // { success, data, pagination }
}

/* ── Connections ──────────────────────────────────── */

export async function sendConnectionRequest(receiverId) {
  const res = await api.post("/connections", { receiver_id: receiverId });
  return res.data;
}

export async function getMyConnections(status = "accepted") {
  const res = await api.get("/connections", { params: { status } });
  return res.data.connections ?? [];
}

export async function getPendingRequests() {
  const res = await api.get("/connections/pending");
  return res.data.connections ?? [];
}

export async function getSentRequests() {
  const res = await api.get("/connections/sent");
  return res.data.connections ?? [];
}

export async function getConnectionBetween(userId) {
  const res = await api.get(`/connections/between/${userId}`);
  return res.data.connection; // null if none
}

export async function acceptConnection(connectionId) {
  const res = await api.patch(`/connections/${connectionId}/accept`);
  return res.data;
}

export async function rejectConnection(connectionId) {
  const res = await api.patch(`/connections/${connectionId}/reject`);
  return res.data;
}

export async function cancelConnectionRequest(connectionId) {
  const res = await api.delete(`/connections/${connectionId}/request`);
  return res.data;
}

export async function removeConnection(connectionId) {
  const res = await api.delete(`/connections/${connectionId}`);
  return res.data;
}

/* ── Saved Startups ────────────────────────────────── */

export async function getMySavedStartups(page = 1, limit = 12) {
  const offset = (page - 1) * limit;
  const res = await api.get("/saved-startups", { params: { limit, offset } });
  return res.data; // { rows, total }
}

export async function toggleSaveStartup(startupId) {
  const res = await api.post(`/saved-startups/${startupId}`);
  return res.data; // { saved }
}

export async function getSaveStatus(startupId) {
  const res = await api.get(`/saved-startups/${startupId}/status`);
  return res.data; // { saved, count }
}

/* ── Startup Following ─────────────────────────────── */

export async function getMyFollowedStartups(page = 1, limit = 12) {
  const offset = (page - 1) * limit;
  const res = await api.get("/following/me/following", { params: { limit, offset } });
  return res.data; // { rows, total }
}

export async function toggleFollowStartup(startupId) {
  const res = await api.post(`/startups/${startupId}/follow`);
  return res.data; // { following, count }
}

export async function getFollowStatus(startupId) {
  const res = await api.get(`/startups/${startupId}/follow/status`);
  return res.data; // { following, count }
}
