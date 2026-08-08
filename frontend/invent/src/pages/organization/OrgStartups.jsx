/**
 * OrgStartups — Browse ecosystem startups with filters.
 */
import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Lightbulb, Search, RefreshCw, AlertCircle,
  TrendingUp, MapPin, DollarSign, ShieldCheck,
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import { discoverStartups } from "../../services/discoveryApi";

const STAGES = ["idea", "prototype", "mvp", "growth", "scaling"];

const VER_COLORS = {
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending:  "bg-amber-50 text-amber-700 border-amber-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
};

function Skel() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <div className="flex gap-3">
        <div className="h-11 w-11 rounded-xl animate-pulse bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-3 animate-pulse rounded bg-slate-100" />
      <div className="h-8 w-24 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function OrgStartups() {
  const navigate = useNavigate();
  const [query,      setQuery]      = useState("");
  const [stage,      setStage]      = useState("");
  const [verifFilter,setVerifFilter]= useState(""); // client-side filter
  const [page,       setPage]       = useState(1);
  const [allRows,    setAllRows]    = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true); setError("");
    try {
      const res = await discoverStartups({ q: query, stage, page: pg, limit: 12 });
      const rows = res.data ?? [];
      setAllRows(pg === 1 ? rows : prev => [...prev, ...rows]);
      setPagination(res.pagination);
      setPage(pg);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load startups.");
    } finally { setLoading(false); }
  }, [query, stage]);

  useEffect(() => { load(1); }, [load]);

  /* Client-side verification filter */
  const startups = useMemo(() => {
    if (!verifFilter) return allRows;
    return allRows.filter(s => s.verification_status === verifFilter);
  }, [allRows, verifFilter]);

  const hasMore = pagination && page < pagination.totalPages;

  return (
    <DashboardLayout>
      <div className="max-w-6xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Organization</p>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Lightbulb className="h-5 w-5 text-violet-600" />
              Startups
            </h1>
            <p className="text-sm text-slate-500">
              {pagination?.total?.toLocaleString() ?? "—"} startups in the ecosystem
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search startups…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none" />
          </div>
          <select value={stage} onChange={e => setStage(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none">
            <option value="">All stages</option>
            {STAGES.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
          <select value={verifFilter} onChange={e => setVerifFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none">
            <option value="">All status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
          <button onClick={() => load(1)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={() => load(1)} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Grid */}
        {loading && allRows.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array(6).fill(0).map((_, i) => <Skel key={i} />)}
          </div>
        ) : startups.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Lightbulb className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No startups found.</p>
            {(query || stage || verifFilter) && (
              <button onClick={() => { setQuery(""); setStage(""); setVerifFilter(""); }}
                className="text-sm text-primary hover:underline">Clear filters</button>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {startups.map(s => (
                <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">

                  {/* Logo + name */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 text-sm font-bold text-violet-700 overflow-hidden">
                      {s.logo_file_url || s.logo_url
                        ? <img src={s.logo_file_url || s.logo_url} alt="" className="h-full w-full object-cover rounded-xl" />
                        : (s.name || "S").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 truncate">{s.name}</p>
                      <div className="flex flex-wrap gap-1.5 mt-1 text-xs text-slate-500">
                        {s.industry && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5">{s.industry}</span>
                        )}
                        {s.stage && (
                          <span className="flex items-center gap-0.5">
                            <TrendingUp className="h-3 w-3" />{s.stage}
                          </span>
                        )}
                        {s.country && (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />{s.country}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${VER_COLORS[s.verification_status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {s.verification_status || "—"}
                    </span>
                  </div>

                  {s.description && (
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3">{s.description}</p>
                  )}

                  {Number(s.funding_required) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 rounded-lg px-2.5 py-1.5 mb-3">
                      <DollarSign className="h-3.5 w-3.5" />
                      ${Number(s.funding_required).toLocaleString()} seeking
                      {Number(s.equity_offered) > 0 && (
                        <span className="ml-auto">{s.equity_offered}% equity</span>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <Button size="sm" variant="secondary" className="flex-1"
                      onClick={() => navigate(`/startups/${s.slug || s.id}`)}>
                      View Details
                    </Button>
                    {s.verification_status !== "verified" && (
                      <button
                        onClick={() => navigate("/organization/applications")}
                        title="Go to applications to refer this startup"
                        className="flex items-center gap-1 rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-700 hover:bg-violet-100 transition">
                        <ShieldCheck className="h-3.5 w-3.5" /> Verify
                      </button>
                    )}
                  </div>
                </motion.div>
              ))}
              {loading && hasMore && Array(3).fill(0).map((_, i) => <Skel key={`sk-${i}`} />)}
            </div>

            {hasMore && !loading && (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={() => load(page + 1)}>
                  <RefreshCw className="h-4 w-4" /> Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
