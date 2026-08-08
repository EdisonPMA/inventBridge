import api from "./api";

/**
 * POST /auth/login
 * Returns { token, user, redirect }
 */
export async function loginUser(email, password) {
  const res = await api.post("/auth/login", { email, password });
  return res.data;
}

/**
 * POST /auth/register
 * Returns { token, user, redirect }
 */
export async function registerUser({ firstName, lastName, email, password, phone, role }) {
  const res = await api.post("/auth/register", {
    firstName,
    lastName,
    email,
    password,
    phone,
    role,
  });
  return res.data;
}

/**
 * GET /auth/stats  — public, used by the landing page
 */
export async function fetchPlatformStats() {
  const res = await api.get("/auth/stats");
  return res.data.stats;
}
