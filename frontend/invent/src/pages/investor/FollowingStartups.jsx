import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupCard from "../../components/discovery/StartupCard";
import Button from "../../components/common/Button";
import { getMyFollowedStartups, toggleFollowStartup } from "../../services/discoveryApi";

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

export default function FollowingStartups() {
  const navigate = useNavigate();
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [unfollowingId, setUnfollowingId] = useState(null);

  async function load(pg = 1) {
    setLoading(true);
    setError("");
    try {
      const res = await getMyFollowedStartups(pg, 12);
      setRows(pg === 1 ? (res.rows ?? []) : (prev) => [...prev, ...(res.rows ?? [])]);
      setTotal(res.total ?? 0);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load followed startups.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1); }, []);

  async function handleUnfollow(id) {
    setUnfollowingId(id);
    try {
      await toggleFollowStartup(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setTotal((v) => Math.max(0, v - 1));
    } catch { /* silent */ } finally {
      setUnfollowingId(null);
    }
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
              <Heart className="h-6 w-6 text-red-500" />
              Following
            </h1>
            <p className="mt-1 text-sm text-slate-500">Startups you follow — their updates appear in your feed.</p>
          </div>
          <p className="text-sm text-slate-500">{total} following</p>
        </motion.div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading && rows.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : rows.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <Heart className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">You&rsquo;re not following any startups yet.</p>
            <p className="text-sm text-slate-400">
              Follow startups to see their updates in your feed.
            </p>
            <Button size="sm" onClick={() => navigate("/discover")}>
              Discover Startups
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((row) => {
                const startup = {
                  id:               row.id,
                  name:             row.name,
                  slug:             row.slug,
                  industry:         row.industry,
                  stage:            row.stage,
                  fundingRequired:  row.funding_required,
                  country:          row.country,
                  verificationStatus: row.verification_status,
                  category_name:    row.category_name,
                };
                return (
                  <StartupCard
                    key={row.id}
                    startup={startup}
                    following={true}
                    onView={() => navigate(`/startups/${startup.slug || startup.id}`)}
                    onFollow={() => handleUnfollow(row.id)}
                    followPending={unfollowingId === row.id}
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
