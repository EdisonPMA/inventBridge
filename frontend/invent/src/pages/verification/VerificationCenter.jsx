import { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck, Clock, XCircle, CheckCircle,
  RefreshCw, AlertCircle, Search, SlidersHorizontal,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatCard from "../../components/dashboard/StatCard";
import VerificationReviewCard from "../../components/verification/VerificationReviewCard";
import Button from "../../components/common/Button";
import { useApi } from "../../hooks/useApi";
import { adminGetVerifications, adminGetPendingCount } from "../../services/verificationApi";

const TYPE_FILTERS = [
  { value: "",                       label: "All Types" },
  { value: "startup_registration",   label: "Startups" },
  { value: "investor_registration",  label: "Investors" },
];

const STATUS_FILTERS = [
  { value: "",             label: "All Statuses" },
  { value: "pending",      label: "Pending" },
  { value: "under_review", label: "Under Review" },
  { value: "approved",     label: "Approved" },
  { value: "rejected",     label: "Rejected" },
];

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item:      { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

function Skeleton() {
  return <div className="animate-pulse h-24 rounded-2xl bg-slate-100" />;
}

export default function VerificationCenter() {
  const [typeFilter,   setTypeFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [search,       setSearch]       = useState("");
  const [page,         setPage]         = useState(0);
  const LIMIT = 15;

  const { data, loading, error, refetch } = useApi(
    () => adminGetVerifications({
      verification_type: typeFilter || undefined,
      status:            statusFilter || undefined,
      limit:             LIMIT,
      offset:            page * LIMIT,
    }),
    [typeFilter, statusFilter, page]
  );

  const { data: pendingCount, refetch: refetchCount } = useApi(adminGetPendingCount, []);

  const rows  = data?.rows  ?? [];
  const total = data?.total ?? 0;

  const filtered = search.trim()
    ? rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          (r.startup_name  || "").toLowerCase().includes(q) ||
          (r.first_name    || "").toLowerCase().includes(q) ||
          (r.last_name     || "").toLowerCase().includes(q) ||
          (r.email         || "").toLowerCase().includes(q)
        );
      })
    : rows;

  const handleUpdate = () => { refetch(); refetchCount(); };

  // Status counts from current page (approximate)
  const counts = rows.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <DashboardLayout>
      <motion.div variants={stagger.container} initial="hidden" animate="visible" className="max-w-5xl space-y-6">

        {/* Header */}
        <motion.div variants={stagger.item} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Verification Center</h1>
            <p className="mt-1 text-slate-500">Review and process all verification requests.</p>
          </div>
          <button onClick={handleUpdate} className="self-start rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div variants={stagger.item} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Pending" value={pendingCount ?? "…"}
            icon={Clock} iconBg="bg-amber-50" iconColor="text-amber-600" />
          <StatCard title="Under Review" value={counts.under_review ?? 0}
            icon={ShieldCheck} iconBg="bg-blue-50" iconColor="text-blue-600" />
          <StatCard title="Approved" value={counts.approved ?? 0}
            icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
          <StatCard title="Rejected" value={counts.rejected ?? 0}
            icon={XCircle} iconBg="bg-red-50" iconColor="text-red-500" />
        </motion.div>

        {/* Filters */}
        <motion.div variants={stagger.item} className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input type="search" placeholder="Search by name or email…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary">
            {TYPE_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-primary">
            {STATUS_FILTERS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </motion.div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={handleUpdate} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* List */}
        <motion.div variants={stagger.item} className="space-y-4">
          {loading
            ? Array(5).fill(0).map((_, i) => <Skeleton key={i} />)
            : filtered.length === 0
            ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center">
                <ShieldCheck className="h-10 w-10 text-slate-300" />
                <p className="text-slate-500">No verification requests match your filters.</p>
                <Button variant="secondary" size="sm" onClick={() => { setStatusFilter(""); setTypeFilter(""); setSearch(""); }}>
                  Clear Filters
                </Button>
              </div>
            )
            : filtered.map((request) => (
              <VerificationReviewCard key={request.id} request={request} onUpdate={handleUpdate} />
            ))
          }
        </motion.div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-slate-500">
              Showing {page * LIMIT + 1}–{Math.min((page + 1) * LIMIT, total)} of {total}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                Previous
              </Button>
              <Button variant="secondary" size="sm" disabled={(page + 1) * LIMIT >= total} onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            </div>
          </div>
        )}

      </motion.div>
    </DashboardLayout>
  );
}
