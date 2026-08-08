/**
 * profileApi.js — Profile CRUD
 */
import api from "./api";

export async function getMyProfile() {
  const res = await api.get("/profiles/me");
  return res.data.profile;
}

export async function getProfileByUserId(userId) {
  const res = await api.get(`/profiles/${userId}`);
  return res.data.profile;
}

export async function updateMyProfile(fields) {
  const res = await api.put("/profiles/me", fields);
  return res.data.profile;
}

export async function uploadProfilePhoto(file, onProgress) {
  const form = new FormData();
  form.append("photo", file);
  const res = await api.put("/uploads/profile/photo", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
    ...(onProgress && {
      onUploadProgress: (evt) => {
        if (evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    }),
  });
  return res.data;
}

export async function uploadCoverPhoto(file, onProgress) {
  const form = new FormData();
  form.append("cover", file);
  const res = await api.put("/uploads/profile/cover", form, {
    headers: { "Content-Type": "multipart/form-data" },
    timeout: 120000,
    ...(onProgress && {
      onUploadProgress: (evt) => {
        if (evt.total) onProgress(Math.round((evt.loaded * 100) / evt.total));
      },
    }),
  });
  return res.data;
}
