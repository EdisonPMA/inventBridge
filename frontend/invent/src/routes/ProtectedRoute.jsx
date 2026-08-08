import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

/**
 * ProtectedRoute — guards routes by authentication + role.
 *
 * Security note: role enforcement here is frontend-only (UX convenience).
 * All backend API endpoints enforce roles independently via JWT middleware.
 *
 * @param {string|string[]} roles — allowed role(s). Omit to allow any authenticated user.
 */

const INVESTOR_VERIFICATION_PATH = "/investor/verification";

// Exact paths (or prefix + "/") that unverified investors can still access
const INVESTOR_ALWAYS_ALLOWED = [
  INVESTOR_VERIFICATION_PATH,
  "/settings/profile",
  "/messages",
  "/notifications",
];

function isAllowedForUnverifiedInvestor(pathname) {
  return INVESTOR_ALWAYS_ALLOWED.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );
}

export default function ProtectedRoute({ children, roles }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  // Not logged in — send to auth page, preserving intended destination
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Unverified investors can only access whitelisted paths
  if (
    user?.role === "investor" &&
    user?.verificationLevel !== "verified" &&
    !isAllowedForUnverifiedInvestor(location.pathname)
  ) {
    return <Navigate to={INVESTOR_VERIFICATION_PATH} replace />;
  }

  // Role check
  if (roles) {
    const allowed  = Array.isArray(roles) ? roles : [roles];
    const userRole = (user?.role || "").toLowerCase();
    const isAllowed = allowed.map((r) => r.toLowerCase()).includes(userRole);

    if (!isAllowed) {
      // Admin redirect to their own dashboard; others to /unauthorized
      // Avoid redirect loop: don't redirect admin to /admin/dashboard if that's already blocked
      if (userRole === "admin" && location.pathname !== "/admin/dashboard") {
        return <Navigate to="/admin/dashboard" replace />;
      }
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return children;
}
