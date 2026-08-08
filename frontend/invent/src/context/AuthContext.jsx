/**
 * AuthContext — token lifecycle management.
 *
 * Security changes vs the original:
 *  - Access token NO LONGER stored in localStorage (XSS risk eliminated).
 *    It lives only in the axios singleton (memory). The httpOnly refresh cookie
 *    issued by the server is the persistent credential.
 *  - On app load, AuthContext calls POST /auth/refresh to silently restore the
 *    session using the httpOnly cookie. If the cookie is absent or expired the
 *    user lands on the login page as normal.
 *  - User profile (non-sensitive) is still stored in localStorage for fast
 *    hydration on page reload — it contains no credentials.
 *  - Listens to auth:logout and auth:user_updated custom events dispatched by
 *    the axios interceptor so the UI reacts instantly to server-side revocation.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AuthContext } from "./auth-context";
import { connectSocket, disconnectSocket } from "../services/socket";
import api, { setAccessToken, clearAccessToken } from "../services/api";

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(() => {
    try { return JSON.parse(localStorage.getItem("innovest_user") || "null"); }
    catch { return null; }
  });
  const [bootstrapped, setBootstrapped] = useState(false);
  const logoutLock = useRef(false);

  // isAuthenticated: user is present AND we have an access token in memory.
  // We derive this after bootstrapping; until then show nothing (avoid flash).
  const isAuthenticated = bootstrapped && !!user;

  /* ── Persist user profile (no token) ──────────── */
  useEffect(() => {
    if (user) {
      localStorage.setItem("innovest_user", JSON.stringify(user));
    } else {
      localStorage.removeItem("innovest_user");
    }
  }, [user]);

  /* ── Socket lifecycle ──────────────────────────── */
  useEffect(() => {
    if (isAuthenticated) connectSocket();
    else disconnectSocket();
  }, [isAuthenticated]);

  /* ── Silent session restore on mount ─────────── */
  useEffect(() => {
    let cancelled = false;
    api.post("/auth/refresh", {}, { _retried: true })
      .then((res) => {
        if (cancelled) return;
        setAccessToken(res.data.token);
        if (res.data.user) setUser(res.data.user);
      })
      .catch(() => {
        if (cancelled) return;
        // No valid refresh cookie — clear any stale user from localStorage
        clearAccessToken();
        setUser(null);
      })
      .finally(() => { if (!cancelled) setBootstrapped(true); });
    return () => { cancelled = true; };
  }, []); // runs once on mount

  /* ── Listen for interceptor-dispatched events ── */
  useEffect(() => {
    const handleLogout = () => {
      if (logoutLock.current) return;
      logoutLock.current = true;
      clearAccessToken();
      setUser(null);
      setTimeout(() => { logoutLock.current = false; }, 500);
    };

    const handleUserUpdated = (e) => {
      if (e.detail) setUser(prev => prev ? { ...prev, ...e.detail } : e.detail);
    };

    window.addEventListener("auth:logout",       handleLogout);
    window.addEventListener("auth:user_updated", handleUserUpdated);
    return () => {
      window.removeEventListener("auth:logout",       handleLogout);
      window.removeEventListener("auth:user_updated", handleUserUpdated);
    };
  }, []);

  /* ── Public API ────────────────────────────────── */
  const login = useCallback((userData, accessToken) => {
    setAccessToken(accessToken);
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    disconnectSocket();
    try {
      // Tell the server to increment token_version and clear the refresh cookie
      await api.post("/auth/logout");
    } catch { /* best-effort */ }
    clearAccessToken();
    setUser(null);
  }, []);

  const updateUser = useCallback((patch) => {
    setUser(prev => prev ? { ...prev, ...patch } : prev);
  }, []);

  const value = useMemo(
    () => ({ isAuthenticated, bootstrapped, user, login, logout, updateUser }),
    [isAuthenticated, bootstrapped, user, login, logout, updateUser]
  );

  // Don't render children until we know whether the user is authenticated.
  // Show a minimal spinner instead of a blank screen during the refresh call.
  if (!bootstrapped) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
      </div>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
