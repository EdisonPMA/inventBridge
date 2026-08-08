import api from "./api";

/* ── Role redirect helper ────────────────────────── */
export function getDashboardRoute(role) {
  const map = {
    inventor:     "/inventor/dashboard",
    investor:     "/investor/dashboard",
    organization: "/organization/dashboard",
    admin:        "/admin/dashboard",
  };
  const route = map[role?.toLowerCase()];
  if (!route) {
    console.warn(`[getDashboardRoute] Unknown role "${role}" — falling back to /home`);
  }
  return route || "/home";
}

/* ── Dashboard aggregators (backend /api/dashboard/*) ── */
export async function getInventorDashboard() {
  const res = await api.get("/dashboard/inventor");
  return res.data;
}

export async function getInvestorDashboard() {
  const res = await api.get("/dashboard/investor");
  return res.data;
}

export async function getOrganizationDashboard() {
  const res = await api.get("/dashboard/organization");
  return res.data;
}

export async function getAdminDashboard() {
  const res = await api.get("/dashboard/admin");
  return res.data;
}

/* ── Granular API helpers (for future use) ─────── */
export async function getMyStartups() {
  const res = await api.get("/startups/mine");
  return res.data;
}

export async function getRecommendedStartups(filters = {}) {
  const res = await api.get("/startups", { params: { status: "published", ...filters } });
  return res.data;
}

export async function getSavedStartups() {
  const res = await api.get("/saved-startups");
  return res.data;
}

export async function getMyInvestments() {
  const res = await api.get("/investments/mine");
  return res.data;
}

export async function getPendingVerifications() {
  const res = await api.get("/verifications", { params: { status: "pending" } });
  return res.data;
}

export async function approveVerification(id) {
  const res = await api.put(`/verifications/${id}/approve`);
  return res.data;
}

export async function rejectVerification(id, reason) {
  const res = await api.put(`/verifications/${id}/reject`, { reason });
  return res.data;
}

export async function getAllUsers(params = {}) {
  const res = await api.get("/users", { params });
  return res.data;
}

export async function updateUserRole(id, role) {
  const res = await api.put(`/users/${id}/role`, { role });
  return res.data;
}

export async function suspendUser(id) {
  const res = await api.put(`/users/${id}/status`, { status: "suspended" });
  return res.data;
}

export async function getAllStartups(params = {}) {
  const res = await api.get("/startups", { params });
  return res.data;
}

export async function verifyStartup(id) {
  const res = await api.put(`/startups/${id}/verify`, { verification_status: "verified" });
  return res.data;
}
