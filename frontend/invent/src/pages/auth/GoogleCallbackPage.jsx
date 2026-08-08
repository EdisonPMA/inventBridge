/**
 * GoogleCallbackPage — /auth/google/callback
 *
 * Backend redirects here with ?code=<one_time_code> (never the JWT in the URL).
 * This page POSTs the code to /api/auth/google/exchange and receives the token
 * in a JSON response body — keeps the token out of browser history / server logs.
 */
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { getDashboardRoute } from "../../services/dashboardApi";
import api from "../../services/api";

export default function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const { login }      = useAuth();
  const handled        = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const code  = searchParams.get("code");
    const error = searchParams.get("error");

    if (error) {
      navigate(`/?error=${encodeURIComponent(error)}`, { replace: true });
      return;
    }
    if (!code) {
      navigate("/?error=Authentication+failed", { replace: true });
      return;
    }

    // Exchange the one-time code for the access token (POST — token never in URL)
    api.post("/auth/google/exchange", { code }, { _retried: true })
      .then(({ data }) => {
        const { token, user } = data;
        if (!token || !user) throw new Error("Invalid exchange response.");
        login(user, token);
        navigate(getDashboardRoute(user.role), { replace: true });
      })
      .catch((err) => {
        const msg = err?.message || "Authentication failed";
        navigate(`/?error=${encodeURIComponent(msg)}`, { replace: true });
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
        <p className="text-sm font-medium text-slate-500">Completing sign-in…</p>
      </div>
    </div>
  );
}
