/**
 * OrgApplications — Verification applications management.
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ShieldCheck, RefreshCw, AlertCircle, CheckCircle,
  X, Eye, ChevronDown, ChevronUp, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import api from "../../services/api";

const STATUS_COLORS = {
  pending:      "bg-amber-50 text-amber-700 border-amber-200",
  approved:     "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:     "bg-red-50 text-red-600 border-red-200",
  under_review: "bg-blue-50 text-blue-700 border-blue-200",
};

const TABS = [
  { value: "",             label: "All" },
  { value: "pending",      label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved",     label: "Approved" },
  { value: "rejected",     label: "Rejected" },
];

const PAGE_SIZE = 20;

function Skel() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-2">
      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export default function OrgApplications() {
  const navigate = useNavigate();
  const [all,          setAll]          = useState([]);
  const [total,        setTotal]        = useState(0);
  const [status,       setStatus]       = useState("");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(1);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [actionId,     setActionId]     = useState(null);
  const [rejectModal,  setRejectModal]  = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [expanded,     setExpanded]     = useState(null);

  const load = useCallback(async (pg = 1) => {
    setLoading(true); setError("");
    try {
      const params = { limit: PAGE_SIZE * pg, offset: 0 };
      if (status) params.status = status;
      const res  = await api.get("/verifications", { params });
      const d    = res.data.data ?? res.data ?? {};
      setAll(d.rows ?? []);
      setTotal(d.total ?? 0);
      setPage(pg);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load applications.");
    } finally { setLoading(false); }
  }, [status]);

  useEffect(() => { load(1); }, [load]);

  /* Client-side name search on top of server filter */
  const applications = useMemo(() => {
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter(a => {
      const name = (a.startup_name || `${a.first_name || ""} ${a.last_name || ""}`).toLowerCase();
      return name.includes(q) || (a.email || "").toLowerCase().includes(q);
    });
  }, [all, search]);

  /* Counts for tabs */
  const counts = useMemo(() => {
    const c = { "": all.length, pending: 0, under_review: 0, approved: 0, rejected: 0 };
    all.forEach(a => { if (c[a.status] !== undefined) c[a.status]++; });
    return c;
  }, [all]);

  async function handleApprove(id) {
    setActionId(id);
    try {
      await api.patch(`/verifications/${id}/approve`, { remarks: "Approved by organization." });
      setAll(prev => prev.map(a => a.id === id ? { ...a, status: "approved" } : a));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  async function handleReject() {
    if (!rejectReason.trim() || !rejectModal) return;
    const id = rejectModal;
    setActionId(id); setRejectModal(null);
    try {
      await api.patch(`/verifications/${id}/reject`, { remarks: rejectReason.trim() });
      setAll(prev => prev.map(a => a.id === id ? { ...a, status: "rejected" } : a));
    } catch { /* silent */ } finally { setActionId(null); setRejectReason(""); }
  }

  async function handleStartReview(id) {
    setActionId(id);
    try {
      await api.patch(`/verifications/${id}/review`);
      setAll(prev => prev.map(a => a.id === id ? { ...a, status: "under_review" } : a));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  const hasMore = all.length < total;

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-5">

        {/* Reject modal */}
        <AnimatePresence>
          {rejectModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
                <h3 className="font-semibold text-slate-800">Rejection Reason</h3>
                <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                  rows={3} placeholder="Explain why this application is being rejected…"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-red-400 focus:outline-none" />
                <div className="flex gap-3">
                  <button onClick={() => { setRejectModal(null); setRejectReason(""); }}
                    className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">
                    Cancel
                  </button>
                  <button onClick={handleReject} disabled={!rejectReason.trim()}
                    className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition">
                    Confirm
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Organization</p>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              Verification Applications
            </h1>
            <p className="text-sm text-slate-500">{total} total · {counts.pending || 0} pending</p>
          </div>
          <button onClick={() => load(1)}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={() => load(1)} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Summary counts */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pending",      key: "pending",      color: "text-amber-600   bg-amber-50" },
            { label: "Under Review", key: "under_review", color: "text-blue-600    bg-blue-50" },
            { label: "Approved",     key: "approved",     color: "text-emerald-600 bg-emerald-50" },
            { label: "Rejected",     key: "rejected",     color: "text-red-600     bg-red-50" },
          ].map(c => (
            <button key={c.key} onClick={() => setStatus(c.key)}
              className={`rounded-xl p-3 text-left transition border-2 ${status === c.key ? "border-primary" : "border-transparent"} ${c.color}`}>
              <p className="text-2xl font-bold">{counts[c.key] || 0}</p>
              <p className="text-xs font-medium">{c.label}</p>
            </button>
          ))}
        </div>

        {/* Search + tabs */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by startup or applicant name…"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-blue-400 focus:outline-none" />
          </div>
          <div className="flex flex-wrap gap-2">
            {TABS.map(t => (
              <button key={t.value} onClick={() => { setStatus(t.value); setSearch(""); }}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  status === t.value
                    ? "bg-blue-600 text-white"
                    : "border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
                }`}>
                {t.label}
                <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  status === t.value ? "bg-white/30 text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {counts[t.value] ?? all.length}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        {loading && all.length === 0 ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skel key={i} />)}</div>
        ) : applications.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">
              {search ? `No results for "${search}"` : `No ${status.replace(/_/g, " ") || ""} applications.`}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {applications.map(app => {
              const isOpen = expanded === app.id;
              const busy   = actionId === app.id;
              const canAct = ["pending", "under_review"].includes(app.status);
              const name   = app.startup_name || `${app.first_name || ""} ${app.last_name || ""}`.trim() || "—";
              const initials = name.slice(0, 2).toUpperCase();

              return (
                <motion.div key={app.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition ${
                    isOpen ? "border-blue-200" : "border-slate-100"
                  }`}>
                  {/* Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{name}</p>
                      <p className="text-xs text-slate-400 truncate">
                        {app.email} · {new Date(app.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[app.status] || "bg-slate-100 text-slate-500 border-slate-200"}`}>
                      {app.status?.replace(/_/g, " ")}
                    </span>
                    <button onClick={() => setExpanded(isOpen ? null : app.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
                      {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>

                  {/* Expanded detail */}
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                        className="overflow-hidden">
                        <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                          <div className="grid gap-3 sm:grid-cols-2 text-sm">
                            <div>
                              <p className="text-xs text-slate-400">Type</p>
                              <p className="font-medium capitalize">{app.verification_type?.replace(/_/g, " ") || "—"}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-400">Startup</p>
                              <p className="font-medium">{app.startup_name || "—"}</p>
                            </div>
                            {app.remarks && (
                              <div className="sm:col-span-2">
                                <p className="text-xs text-slate-400">Remarks</p>
                                <p className="text-slate-700 italic">"{app.remarks}"</p>
                              </div>
                            )}
                          </div>

                          {app.document_url && (
                            <a href={app.document_url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">
                              <Eye className="h-4 w-4" /> View Document
                            </a>
                          )}

                          {/* Action buttons */}
                          {canAct && (
                            <div className="flex flex-wrap gap-2">
                              {app.status === "pending" && (
                                <button onClick={() => handleStartReview(app.id)} disabled={busy}
                                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
                                  Mark Under Review
                                </button>
                              )}
                              <button onClick={() => handleApprove(app.id)} disabled={busy}
                                className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                                <CheckCircle className="h-3.5 w-3.5" />
                                {busy ? "Processing…" : "Approve"}
                              </button>
                              <button onClick={() => { setRejectReason(""); setRejectModal(app.id); }} disabled={busy}
                                className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition">
                                <X className="h-3.5 w-3.5" /> Reject
                              </button>
                            </div>
                          )}

                          {app.startup_name && (
                            <button
                              onClick={() => navigate(`/startups/${app.startup_slug || app.startup_id}`)}
                              className="text-xs font-medium text-primary hover:underline">
                              View startup profile →
                            </button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}

            {/* Load more */}
            {hasMore && (
              <div className="flex justify-center pt-2">
                <button onClick={() => load(page + 1)} disabled={loading}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition">
                  {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : null}
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
