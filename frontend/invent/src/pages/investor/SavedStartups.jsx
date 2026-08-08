import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupCard from "../../components/discovery/StartupCard";
import Button from "../../components/common/Button";
import { getMySavedStartups, toggleSaveStartup } from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-xl animate-pulse bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-3 animate-pulse rounded bg-slate-100" />
      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function SavedStartups() {
  const navigate  = useNavigate();
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [removingId, setRemovingId] = useState(null);

  async function load(pg = 1) {
    setLoading(true);
    setError("");
    try {
      const res = await getMySavedStartups(pg, 12);
      setRows(pg === 1 ? (res.rows ?? []) : (prev) => [...prev, ...(res.rows ?? [])]);
      setTotal(res.total ?? 0);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load saved startups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function handleUnsave(startup) {
    setRemovingId(startup.id || startup.startup_id);
    try {
      await toggleSaveStartup(startup.id || startup.startup_id);
      setRows((prev) => prev.filter((r) => (r.id || r.startup_id) !== (startup.id || startup.startup_id)));
      setTotal((v) => Math.max(0, v - 1));
    } catch { /* silent */ } finally {
      setRemovingId(null);
    }
  }

  async function handleContact(ownerId) {
    try {
      const conv = await getOrCreateDm(ownerId);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
  }

  const hasMore = rows.length < total;

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <BookOpen className="h-6 w-6 text-blue-600" />
              Saved Startups
            </h1>
            <p className="mt-1 text-sm text-slate-500">Your bookmarked investment opportunities.</p>
          </div>
          <p className="text-sm text-slate-500">{total} saved</p>
        </motion.div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => load(1)} className="ml-auto text-xs font-medium underline">Retry</button>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">You haven&rsquo;t saved any startups yet.</p>
            <p className="text-sm text-slate-400">
              Browse the discovery page and save opportunities you want to revisit.
            </p>
            <Button size="sm" onClick={() => navigate("/discover")}>
              Discover Startups
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => {
                // The saved_startups join returns startup columns directly
                const startup = {
                  id:               row.startup_id ?? row.id,
                  name:             row.name,
                  slug:             row.slug,
                  industry:         row.industry,
                  stage:            row.stage,
                  fundingRequired:  row.funding_required,
                  country:          row.country,
                  verificationStatus: row.verification_status,
                  description:      row.description,
                  category_name:    row.category_name,
                  logo_file_url:    row.logo_file_url,
                  logo_url:         row.logo_url,
                };
                return (
                  <StartupCard
                    key={startup.id}
                    startup={startup}
                    saved={true}
                    onView={() => navigate(`/startups/${startup.slug || startup.id}`)}
                    onSave={() => handleUnsave(row)}
                    onContact={row.owner_id ? () => handleContact(row.owner_id) : undefined}
                    savePending={removingId === startup.id}
                  />
                );
              })}
            </div>
            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => load(page + 1)} disabled={loading}>
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
