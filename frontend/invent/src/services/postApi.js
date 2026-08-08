/**
 * postApi.js — Posts, Feed, Likes, Comments
 */
import api from "./api";

/* ── Feed ────────────────────────────────────────── */
export async function getFeed(page = 1, limit = 20) {
  const res = await api.get("/posts", { params: { page, limit } });
  return res.data; // { success, data, pagination }
}

/* ── Post CRUD ───────────────────────────────────── */
export async function createPost({ content, startup_id, image_url, video_url, visibility = "public", tagged_users = [] }) {
  const res = await api.post("/posts", { content, startup_id, image_url, video_url, visibility, tagged_users });
  return res.data;
}

export async function getPostById(id) {
  const res = await api.get(`/posts/${id}`);
  return res.data.post;
}

export async function updatePost(id, data) {
  const res = await api.put(`/posts/${id}`, data);
  return res.data.post;
}

export async function deletePost(id) {
  const res = await api.delete(`/posts/${id}`);
  return res.data;
}

export async function archivePost(id) {
  const res = await api.patch(`/posts/${id}/archive`);
  return res.data;
}

export async function restorePost(id) {
  const res = await api.patch(`/posts/${id}/restore`);
  return res.data;
}

export async function getMyArchivedPosts(offset = 0) {
  const res = await api.get("/posts/mine/archived", { params: { offset } });
  return res.data; // { posts, total }
}

/* ── Likes ───────────────────────────────────────── */
export async function toggleLike(postId) {
  const res = await api.post(`/posts/${postId}/like`);
  return res.data; // { liked, total }
}

export async function getLikedStatus(postId) {
  const res = await api.get(`/posts/${postId}/liked`);
  return res.data; // { liked }
}

/* ── Comments ────────────────────────────────────── */
export async function getComments(postId, page = 1, limit = 20) {
  const offset = (page - 1) * limit;
  const res = await api.get(`/posts/${postId}/comments`, { params: { limit, offset } });
  return res.data; // { rows, total } or array
}

export async function addComment(postId, comment) {
  const res = await api.post(`/posts/${postId}/comments`, { comment });
  return res.data;
}

export async function deleteComment(postId, commentId) {
  const res = await api.delete(`/posts/${postId}/comments/${commentId}`);
  return res.data;
}

/* ── Repost ──────────────────────────────────────── */
export async function repost(postId, caption = "", startupId = null) {
  const res = await api.post(`/posts/${postId}/repost`, {
    caption,
    ...(startupId && { startup_id: startupId }),
  });
  return res.data; // { post }
}
export async function uploadPostMedia(postId, file, onProgress) {
  const form = new FormData();
  form.append("media", file);
  const res = await api.post(`/uploads/posts/${postId}/media`, form, {
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
