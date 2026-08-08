/**
 * VerificationRedirect.jsx
 *
 * Handles the sidebar link "/inventor/startups/verify" which has no startup ID.
 * Fetches the inventor's first startup and redirects to its verification page.
 * If they have no startup, redirects them to create one first.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import { getMyStartups } from "../../services/startupApi";

export default function VerificationRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    getMyStartups()
      .then((startups) => {
        const list = Array.isArray(startups) ? startups : [];
        if (list.length === 0) {
          // No startup yet — send to creation page
          navigate("/inventor/startups/new", { replace: true });
        } else {
          // Use the first (most recent) startup
          navigate(`/inventor/startups/${list[0].id}/verify`, { replace: true });
        }
      })
      .catch(() => {
        // Fallback to startup list on error
        navigate("/inventor/startups", { replace: true });
      });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center gap-3 text-slate-400">
        <RefreshCw className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading verification…</span>
      </div>
    </DashboardLayout>
  );
}
