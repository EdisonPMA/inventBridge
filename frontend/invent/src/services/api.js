/**
 * Axios singleton with:
 *  - withCredentials: true  — sends the httpOnly refresh cookie on every request
 *  - Request interceptor   — attaches in-memory access token as Bearer header
 *  - Response interceptor  — on 401, silently calls /auth/refresh once, then retries;
 *                            on TOKEN_REVOKED or persistent 401 triggers logout
 */
import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const api = axios.create({
  baseURL:         BASE_URL,
  headers:         { "Content-Type": "application/json" },
  timeout:         60000, // 60s — accounts for Render free-tier cold start (~30-50s)
  withCredentials: true,  // send httpOnly refresh cookie on every request
});

// ── In-memory token store ─────────────────────────
// Token lives ONLY in memory — not in localStorage. This prevents XSS token theft.
// The refresh cookie (httpOnly) is used to silently restore it across page loads.
let _accessToken = null;
let _refreshPromise = null; // deduplicate concurrent refresh calls

export function setAccessToken(token) { _accessToken = token; }
export function getAccessToken()      { return _accessToken; }
export function clearAccessToken()    { _accessToken = null; }

// ── Request interceptor ───────────────────────────
api.interceptors.request.use((config) => {
  if (_accessToken) config.headers.Authorization = `Bearer ${_accessToken}`;
  return config;
});

// ── Response interceptor — silent refresh on 401 ──
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const original = err.config;

    // Surface backend message for all errors except the ones we handle below
    const code    = err.response?.data?.code;
    const status  = err.response?.status;

    // Rate limited — show friendly message, don't attempt refresh
    if (status === 429) {
      const retryAfter = err.response?.headers?.["retry-after"];
      const minutes = retryAfter ? Math.ceil(parseInt(retryAfter) / 60) : 15;
      return Promise.reject(new Error(
        `Too many requests. Please wait ${minutes} minute${minutes !== 1 ? "s" : ""} before trying again.`
      ));
    }

    // TOKEN_REVOKED (suspended / logged out all) — force logout immediately
    if (code === "TOKEN_REVOKED" || code === "ACCOUNT_SUSPENDED") {
      clearAccessToken();
      // Dispatch a custom event so AuthContext can listen and clear user state
      window.dispatchEvent(new CustomEvent("auth:logout", { detail: { code } }));
      return Promise.reject(new Error(err.response?.data?.message || "Session ended."));
    }

    // On 401 — attempt one silent refresh, then retry the original request
    if (status === 401 && !original._retried) {
      original._retried = true;

      // Deduplicate: if a refresh is already in flight, wait for it
      if (!_refreshPromise) {
        _refreshPromise = api
          .post("/auth/refresh", {}, { _retried: true }) // no Bearer header needed — uses cookie
          .then((res) => {
            setAccessToken(res.data.token);
            // Also update stored user if the server returned updated data
            if (res.data.user) {
              window.dispatchEvent(new CustomEvent("auth:user_updated", { detail: res.data.user }));
            }
            return res.data.token;
          })
          .catch((refreshErr) => {
            clearAccessToken();
            window.dispatchEvent(new CustomEvent("auth:logout", { detail: { code: "REFRESH_FAILED" } }));
            return Promise.reject(refreshErr);
          })
          .finally(() => { _refreshPromise = null; });
      }

      try {
        const newToken = await _refreshPromise;
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original); // retry
      } catch {
        // Refresh failed — fall through to reject
      }
    }

    // Friendly message for cold-start timeouts
    if (err.code === "ECONNABORTED" || err.message?.includes("timeout")) {
      return Promise.reject(new Error(
        "The server is waking up — this can take up to 30 seconds on first use. Please try again."
      ));
    }

    if (err.code === "ERR_NETWORK" || err.message?.includes("Network Error")) {
      return Promise.reject(new Error(
        "Unable to reach the server. Please check your connection and try again."
      ));
    }

    const message =
      err.response?.data?.message ||
      err.message ||
      "Something went wrong. Please try again.";
    return Promise.reject(new Error(message));
  }
);

export default api;
