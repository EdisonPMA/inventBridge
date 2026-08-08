/**
 * OrgReports — File and track reports on platform content.
 * Target search replaces raw numeric ID input for startups and users.
 */
import { useState, useEffect, useRef, useCallback } from "react";
import {
  Flag, AlertCircle, RefreshCw, Send, CheckCircle,
  X, Search, User, Lightbulb,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import api from "../../services/api";

const TARGET_TYPES = ["startup", "user", "post", "investment"];
const REASONS = [
  "spam", "harassment", "misinformation", "fraud",
  "inappropriate_content", "duplicate", "other",
];
const STATUS_COLORS = {
  pending:      "bg-amber-50 text-amber-700",
  under_review: "bg-blue-50 text-blue-700",
  resolved:     "bg-emerald-50 text-emerald-700",
  dismissed:    "bg-slate-100 text-slate-500",
};

/* ── Target search sub-component ─────────────────── */
function TargetSearch({ targetType, value, onSelect }) {
  const [query,   setQuery]   = useState(value?.name || "");
  const [results, setResults] = useState([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  /* Close on outside click */
  useEffect(() => {
    const fn = e => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  /* Reset when type changes */
  useEffect(() => { setQuery(""); setResults([]); onSelect(null); }, [targetType]); // eslint-disable-line

  const search = useCallback(async (q) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      if (targetType === "startup") {
        const res = await api.get("/startups/discover", { params: { q, limit: 6 } });
        setResults((res.data.data ?? res.data ?? []).map(s => ({
          id: s.id, name: s.name,
          sub: s.industry || s.stage || "",
          icon: "startup",
        })));
      } else if (targetType === "user") {
        const res = await api.get("/search", { params: { q, type: "people", limit: 6 } });
        setResults((res.data.users ?? []).map(u => ({
          id: u.id,
          name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
          sub: u.headline || u.role || "",
          icon: "user",
        })));
      }
    } catch { /* silent */ } finally { setLoading(false); }
  }, [targetType]);

  const handleChange = (e) => {
    const q = e.target.value;
    setQuery(q);
    onSelect(null); // clear selection when typing
    setOpen(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => search(q), 250);
  };

  const handlePick = (item) => {
    setQuery(item.name);
    onSelect(item);
    setOpen(false);
    setResults([]);
  };

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={handleChange} onFocus={() => query && setOpen(true)}
          placeholder={`Search ${targetType} by name…`}
          className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-red-400 focus:outline-none" />
        {value && (
          <button type="button" onClick={() => { setQuery(""); onSelect(null); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (results.length > 0 || loading) && (
        <div className="absolute z-30 left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-4 text-xs text-slate-400">
              <RefreshCw className="h-3 w-3 animate-spin" /> Searching…
            </div>
          )}
          {results.map(item => (
            <button key={item.id} type="button" onClick={() => handlePick(item)}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-slate-50 transition">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                {item.icon === "user"
                  ? <User className="h-3.5 w-3.5" />
                  : <Lightbulb className="h-3.5 w-3.5" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{item.name}</p>
                {item.sub && <p className="truncate text-xs text-slate-400">{item.sub}</p>}
              </div>
              <span className="shrink-0 text-xs text-slate-400">#{item.id}</span>
            </button>
          ))}
        </div>
      )}

      {/* Selected confirmation */}
      {value && (
        <p className="mt-1 text-xs text-emerald-600 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Selected: <span className="font-medium">{value.name}</span> (ID #{value.id})
        </p>
      )}
    </div>
  );
}

/* ── Main page ───────────────────────────────────── */
export default function OrgReports() {
  const [reports,    setReports]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [showForm,   setShowForm]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitOk,   setSubmitOk]   = useState(false);
  const [form,       setForm]       = useState({
    targetType: "startup", reason: "fraud", description: "",
    // for post / investment — raw ID input
    rawId: "",
  });
  const [selectedTarget, setSelectedTarget] = useState(null); // { id, name }
  const [formError,      setFormError]      = useState("");

  const needsSearch = ["startup", "user"].includes(form.targetType);

  async function loadReports() {
    setLoading(true); setError("");
    try {
      const res = await api.get("/reports/mine");
      setReports(res.data.reports ?? res.data ?? []);
    } catch (e) {
      setError(e?.response?.data?.message || e?.message || "Failed to load reports.");
    } finally { setLoading(false); }
  }

  useEffect(() => { loadReports(); }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const targetId = needsSearch ? selectedTarget?.id : parseInt(form.rawId);
    if (!targetId) {
      setFormError(needsSearch ? "Please search and select a target." : "Target ID is required.");
      return;
    }

    setSubmitting(true);
    try {
      await api.post("/reports", {
        targetType:  form.targetType,
        targetId,
        reason:      form.reason,
        description: form.description.trim() || undefined,
      });
      setSubmitOk(true);
      setShowForm(false);
      setForm({ targetType: "startup", reason: "fraud", description: "", rawId: "" });
      setSelectedTarget(null);
      await loadReports();
      setTimeout(() => setSubmitOk(false), 3500);
    } catch (e) {
      setFormError(e?.response?.data?.message || e?.message || "Failed to submit report.");
    } finally { setSubmitting(false); }
  }

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Organization</p>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Flag className="h-5 w-5 text-red-500" />
              Reports
            </h1>
            <p className="text-sm text-slate-500">Submit and track reports on platform content.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadReports}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button onClick={() => { setShowForm(v => !v); setFormError(""); }}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition ${
                showForm
                  ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  : "bg-red-600 text-white hover:bg-red-700"
              }`}>
              {showForm
                ? <><X className="h-4 w-4" /> Cancel</>
                : <><Flag className="h-4 w-4" /> File Report</>}
            </button>
          </div>
        </div>

        {/* Success banner */}
        <AnimatePresence>
          {submitOk && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              <CheckCircle className="h-4 w-4 shrink-0" /> Report submitted successfully.
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
          </div>
        )}

        {/* Report form */}
        <AnimatePresence>
          {showForm && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <form onSubmit={handleSubmit}
                className="rounded-2xl border border-red-100 bg-red-50/50 p-5 space-y-4">
                <h3 className="font-semibold text-slate-800">New Report</h3>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Target type */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Report type</label>
                    <select value={form.targetType}
                      onChange={e => {
                        setForm(p => ({ ...p, targetType: e.target.value, rawId: "" }));
                        setSelectedTarget(null);
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none capitalize">
                      {TARGET_TYPES.map(t => (
                        <option key={t} value={t} className="capitalize">{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-600">Reason</label>
                    <select value={form.reason}
                      onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none">
                      {REASONS.map(r => (
                        <option key={r} value={r}>{r.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target input — search for startup/user, raw ID for post/investment */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Target <span className="text-red-500">*</span>
                  </label>
                  {needsSearch ? (
                    <TargetSearch
                      targetType={form.targetType}
                      value={selectedTarget}
                      onSelect={setSelectedTarget}
                    />
                  ) : (
                    <input
                      value={form.rawId}
                      onChange={e => setForm(p => ({ ...p, rawId: e.target.value }))}
                      placeholder={`Enter ${form.targetType} ID`}
                      type="number" min="1"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none"
                    />
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">
                    Description <span className="text-slate-400">(optional)</span>
                  </label>
                  <textarea value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    rows={3} maxLength={1000}
                    placeholder="Provide additional context…"
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-red-400 focus:outline-none" />
                </div>

                {formError && <p className="text-xs text-red-600">{formError}</p>}

                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition">
                  <Send className="h-4 w-4" />
                  {submitting ? "Submitting…" : "Submit Report"}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reports list */}
        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Flag className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No reports filed yet.</p>
            <p className="text-sm text-slate-400">Use "File Report" to flag an issue on the platform.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(r => (
              <motion.div key={r.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-600 capitalize">
                        {r.reason?.replace(/_/g, " ")}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 capitalize">
                        {r.target_type} #{r.target_id}
                      </span>
                    </div>
                    {r.description && (
                      <p className="text-sm text-slate-600 line-clamp-2">{r.description}</p>
                    )}
                    <p className="mt-1.5 text-xs text-slate-400">
                      {new Date(r.created_at).toLocaleString()}
                    </p>
                    {r.resolution && (
                      <p className="mt-1 text-xs text-emerald-600 italic">
                        Resolution: {r.resolution}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${STATUS_COLORS[r.status] || "bg-slate-100 text-slate-500"}`}>
                    {r.status?.replace(/_/g, " ")}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
