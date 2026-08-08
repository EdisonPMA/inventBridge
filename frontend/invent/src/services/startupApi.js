/**
 * startupApi.js — all startup-domain API calls
 * Uses the shared Axios instance (auto-attaches JWT).
 */
import api from "./api";

/* ── Startup CRUD ──────────────────────────────── */
export async function createStartup(data) {
  const res = await api.post("/startups", data);
  return res.data;
}

export async function getMyStartups() {
  const res = await api.get("/startups/mine");
  return res.data.startups ?? [];
}

export async function getStartupById(id) {
  const res = await api.get(`/startups/${id}`);
  return res.data.startup;
}

export async function getStartupBySlug(slug) {
  const res = await api.get(`/startups/slug/${slug}`);
  return res.data.startup;
}

export async function updateStartup(id, data) {
  const res = await api.put(`/startups/${id}`, data);
  return res.data; // includes { startup, message, requiresVerification? }
}

export async function archiveStartup(id) {
  const res = await api.patch(`/startups/${id}/archive`);
  return res.data.startup;
}

export async function deleteStartup(id) {
  const res = await api.delete(`/startups/${id}`);
  return res.data;
}

/* ── Discovery ──────────────────────────────────── */
export async function discoverStartups({
  search, category_id, industry, stage, country,
  verification_status, status = "published",
  page = 1, limit = 12,
} = {}) {
  const params = {
    status,
    limit,
    offset: (page - 1) * limit,
  };
  if (search)              params.search              = search;
  if (category_id)         params.category_id         = category_id;
  if (industry)            params.industry            = industry;
  if (stage)               params.stage               = stage;
  if (country)             params.country             = country;
  if (verification_status) params.verification_status = verification_status;

  const res = await api.get("/startups", { params });
  return res.data; // { rows, total }
}

/* ── Admin ──────────────────────────────────────── */
export async function adminGetAllStartups(params = {}) {
  const res = await api.get("/startups/admin/all", { params });
  return res.data;
}

export async function adminVerifyStartup(id, verification_status, remarks = null) {
  const res = await api.patch(`/startups/${id}/verify`, { verification_status, remarks });
  return res.data.startup;
}

/* ── Verification submission ─────────────────────── */
export async function submitStartupForVerification(id) {
  const res = await api.post(`/startups/${id}/submit-verification`);
  return res.data;
}

/* ── Team members ───────────────────────────────── */
export async function getMembers(startupId) {
  const res = await api.get(`/startups/${startupId}/members`);
  return res.data.members ?? [];
}

export async function addMember(startupId, data) {
  const res = await api.post(`/startups/${startupId}/members`, data);
  return res.data.member;
}

export async function updateMember(startupId, memberId, data) {
  const res = await api.put(`/startups/${startupId}/members/${memberId}`, data);
  return res.data.member;
}

export async function removeMember(startupId, memberId) {
  const res = await api.delete(`/startups/${startupId}/members/${memberId}`);
  return res.data;
}

export async function uploadMemberPhoto(startupId, memberId, file) {
  const form = new FormData();
  form.append("photo", file);
  const res = await api.put(
    `/uploads/startups/${startupId}/members/${memberId}/photo`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return res.data;
}

/* ── Files ──────────────────────────────────────── */
export async function getStartupFiles(startupId, fileType = null) {
  const params = fileType ? { file_type: fileType } : {};
  const res = await api.get(`/startups/${startupId}/files`, { params });
  return res.data.files ?? [];
}

export async function deleteStartupFile(startupId, fileId) {
  const res = await api.delete(`/startups/${startupId}/files/${fileId}`);
  return res.data;
}

/* ── File uploads (multipart) ───────────────────── */
export async function uploadStartupLogo(startupId, file) {
  const form = new FormData();
  form.append("logo", file);
  const res = await api.put(`/uploads/startups/${startupId}/logo`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadPitchDeck(startupId, file, title) {
  const form = new FormData();
  form.append("pitch", file);
  if (title) form.append("title", title);
  const res = await api.post(`/uploads/startups/${startupId}/pitch`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadStartupDocument(startupId, file, fileType, title) {
  const form = new FormData();
  form.append("document", file);
  form.append("file_type", fileType);
  if (title) form.append("title", title);
  const res = await api.post(`/uploads/startups/${startupId}/document`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadRegistrationCertificate(startupId, file, title) {
  const form = new FormData();
  form.append("certificate", file);
  if (title) form.append("title", title);
  const res = await api.post(
    `/uploads/startups/${startupId}/registration-certificate`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return res.data;
}

export async function uploadStartupImage(startupId, file, title) {
  const form = new FormData();
  form.append("image", file);
  if (title) form.append("title", title);
  const res = await api.post(`/uploads/startups/${startupId}/image`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

export async function uploadStartupVideo(startupId, file, title) {
  const form = new FormData();
  form.append("video", file);
  if (title) form.append("title", title);
  const res = await api.post(`/uploads/startups/${startupId}/video`, form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return res.data;
}

/* ── Follow / Save ──────────────────────────────── */
export async function toggleFollow(startupId) {
  const res = await api.post(`/startups/${startupId}/follow`);
  return res.data;
}

export async function getFollowStatus(startupId) {
  const res = await api.get(`/startups/${startupId}/follow/status`);
  return res.data;
}

export async function toggleSaveStartup(startupId) {
  const res = await api.post(`/saved-startups/${startupId}`);
  return res.data;
}

/* ── Categories (reused for create form dropdown) ─ */
export async function getCategories() {
  const res = await api.get("/categories", { params: { status: "active" } });
  return res.data.categories ?? [];
}

/* ── Industries (reused for create/edit form dropdown) ─ */
export async function getIndustries() {
  const res = await api.get("/industries", { params: { status: "active" } });
  return res.data.industries ?? [];
}
