import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, DollarSign, AlertCircle, RefreshCw,
  MessageSquare, X, ChevronDown, History,
  ArrowRightLeft, FileCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import {
  getMyInvestments,
  cancelInvestment,
  getInvestmentHistory,
} from "../../services/investmentApi";
import { getOrCreateDm } from "../../services/conversationApi";
import { getSocket } from "../../services/socket";

const STATUS_STYLES = {
  pending:     "bg-amber-50  text-amber-700  border-amber-200",
  negotiating: "bg-blue-50   text-blue-700   border-blue-200",
  accepted:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-red-50    text-red-600    border-red-200",
  cancelled:   "bg-slate-100 text-slate-500  border-slate-200",
  finalized:   "bg-violet-50 text-violet-700 border-violet-200",
};

const FILTER_OPTS = [
  { value: "", label: "All" },
  { value: "pending",     label: "Pending" },
  { value: "negotiating", label: "Negotiating" },
  { value: "accepted",    label: "Accepted" },
  { value: "rejected",    label: "Rejected" },
  { value: "cancelled",   label: "Cancelled" },
];

/* ── History helpers (shared with InvestmentOffers) ─ */
const EVENT_META = {
  initial_offer:    { label: "Initial Offer",    icon: DollarSign,     color: "text-blue-600   bg-blue-50   border-blue-200" },
  counter_offer:    { label: "Counter Offer",    icon: ArrowRightLeft, color: "text-amber-600  bg-amber-50  border-amber-200" },
  status_change:    { label: "Status Change",    icon: History,        color: "text-slate-500  bg-slate-50  border-slate-200" },
  agreement_signed: { label: "Agreement Signed", icon: FileCheck,      color: "text-violet-600 bg-violet-50 border-violet-200" },
};

const STATUS_LABELS = {
  negotiating: "Moved to Negotiation",
  accepted:    "Offer Accepted",
  rejected:    "Offer Rejected",
  cancelled:   "Offer Cancelled",
  finalized:   "Deal Finalized",
};

function HistoryTimeline({ investmentId }) {
  const [events,  setEvents]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getInvestmentHistory(investmentId)
      .then(setEvents)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [investmentId]);

  if (loading) return (
    <div className="space-y-2 py-2">
      {[1,2].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}
    </div>
  );
  if (error)        return <p className="text-xs text-red-500 py-2">Could not load history.</p>;
  if (!events?.length) return <p className="text-xs text-slate-400 py-2 italic">No history recorded yet.</p>;

  return (
    <ol className="relative space-y-0 border-l border-slate-200 ml-2">
      {events.map((e, idx) => {
        const meta   = EVENT_META[e.event_type] || EVENT_META.status_change;
        const Icon   = meta.icon;
        const name   = `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.proposer_role;
        const isLast = idx === events.length - 1;
        return (
          <li key={e.id} className={`ml-4 ${isLast ? "pb-0" : "pb-4"}`}>
            <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border bg-white ${meta.color.split(" ").slice(2).join(" ")}`}>
              <Icon className={`h-2.5 w-2.5 ${meta.color.split(" ")[0]}`} />
            </span>
            <div>
              <p className="text-xs font-semibold text-slate-700">
                {e.event_type === "status_change"
                  ? (STATUS_LABELS[e.notes] || `Status → ${e.notes}`)
                  : meta.label}
              </p>
              <p className="text-xs text-slate-400">
                by <span className="font-medium text-slate-600 capitalize">{name}</span>
                {" · "}{new Date(e.created_at).toLocaleString()}
              </p>
              {(e.offered_amount || e.equity_percentage) && (
                <p className="mt-0.5 text-xs text-slate-600">
                  {e.offered_amount && <span className="font-medium">${Number(e.offered_amount).toLocaleString()}</span>}
                  {e.offered_amount && e.equity_percentage && " · "}
                  {e.equity_percentage && <span>{e.equity_percentage}% equity</span>}
                </p>
              )}
              {e.notes && e.event_type !== "status_change" && e.event_type !== "agreement_signed" && (
                <p className="mt-0.5 text-xs text-slate-500 italic line-clamp-2">"{e.notes}"</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── Investment row with expandable history ──────── */
function InvestmentRow({ inv, onCancel, onMessage, actionId }) {
  const navigate = useNavigate();
  const [expanded,    setExpanded]    = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const busy = actionId === inv.id;

  return (
    <>
      {/* Main row */}
      <tr className={`hover:bg-slate-50 transition ${expanded ? "bg-slate-50/60" : ""}`}>
        <td className="px-4 py-3">
          <button
            onClick={() => navigate(`/startups/${inv.startup_slug || inv.startup_id}`)}
            className="font-medium text-slate-900 hover:text-blue-600 transition text-left"
          >
            {inv.startup_name}
          </button>
          <p className="text-xs text-slate-400 mt-0.5">{inv.stage} · {inv.industry}</p>
        </td>
        <td className="px-4 py-3 text-slate-700 hidden sm:table-cell">
          ${Number(inv.offered_amount).toLocaleString()}
        </td>
        <td className="px-4 py-3 text-slate-600 hidden md:table-cell">
          {inv.equity_percentage}%
        </td>
        <td className="px-4 py-3">
          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[inv.status] || STATUS_STYLES.pending}`}>
            {inv.status}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
          {new Date(inv.created_at).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-1">
            {/* History toggle */}
            <button
              onClick={() => { setExpanded(v => !v); setShowHistory(false); }}
              title="View history"
              className={`rounded-lg border p-1.5 transition ${expanded ? "border-blue-300 bg-blue-50 text-blue-600" : "border-slate-200 text-slate-400 hover:border-blue-300 hover:text-blue-600"}`}
            >
              <History className="h-3.5 w-3.5" />
            </button>
            {["pending","negotiating","accepted"].includes(inv.status) && (
              <button onClick={() => onMessage(inv)} disabled={busy}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition"
                aria-label="Open conversation">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
            )}
            {inv.status === "pending" && (
              <button onClick={() => onCancel(inv)} disabled={busy}
                className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                aria-label="Cancel offer">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded history row */}
      {expanded && (
        <tr>
          <td colSpan={6} className="px-6 py-0 bg-slate-50/80 border-b border-slate-100">
            <AnimatePresence>
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden py-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Negotiation History
                  </span>
                </div>
                <HistoryTimeline investmentId={inv.id} />
              </motion.div>
            </AnimatePresence>
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Page ────────────────────────────────────────── */
export default function MyInvestments() {
  const navigate = useNavigate();

  const [investments, setInvestments] = useState([]);
  const [filter,      setFilter]      = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [actionId,    setActionId]    = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setInvestments(await getMyInvestments(filter || undefined));
    } catch (err) {
      setError(err?.message || "Failed to load investments.");
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const update = ({ investment }) =>
      setInvestments(prev => prev.map(i => i.id === investment.id ? investment : i));
    socket.on("investment_offer_accepted",    update);
    socket.on("investment_offer_rejected",    update);
    socket.on("investment_offer_negotiating", update);
    socket.on("investment_finalized",         update);
    return () => {
      socket.off("investment_offer_accepted");
      socket.off("investment_offer_rejected");
      socket.off("investment_offer_negotiating");
      socket.off("investment_finalized");
    };
  }, []);

  async function handleCancel(inv) {
    if (!window.confirm("Cancel this investment offer?")) return;
    setActionId(inv.id);
    try {
      const res = await cancelInvestment(inv.id);
      setInvestments(prev => prev.map(i => i.id === inv.id ? res.investment : i));
    } catch (err) { setError(err?.message || "Failed to cancel."); }
    finally { setActionId(null); }
  }

  async function handleMessage(inv) {
    try {
      const conv = await getOrCreateDm(inv.startup_owner_id || inv.startup_id);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
  }

  const totalDeployed = investments
    .filter(i => ["accepted","finalized"].includes(i.status))
    .reduce((s, i) => s + Number(i.offered_amount || 0), 0);

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Briefcase className="h-6 w-6 text-blue-600" /> My Investments
            </h1>
            <p className="mt-1 text-sm text-slate-500">Track all your investment offers and deal flow.</p>
          </div>
          <div className="flex items-center gap-3">
            {totalDeployed > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2">
                <DollarSign className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">${totalDeployed.toLocaleString()} accepted</span>
              </div>
            )}
            <button onClick={load} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTS.map(f => (
            <button key={f.value} onClick={() => setFilter(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f.value
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
              }`}>
              {f.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
            <button onClick={load} className="ml-auto text-xs font-medium underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array(4).fill(0).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : investments.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <Briefcase className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No investment offers yet.</p>
            <p className="text-sm text-slate-400">Discover verified startups and make your first investment offer.</p>
            <Button size="sm" onClick={() => navigate("/discover")}>Discover Startups</Button>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs">
                  <th className="px-4 py-3 font-medium text-slate-500">Startup</th>
                  <th className="px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">Amount</th>
                  <th className="px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Equity</th>
                  <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-500 hidden lg:table-cell">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {investments.map(inv => (
                  <InvestmentRow
                    key={inv.id}
                    inv={inv}
                    onCancel={handleCancel}
                    onMessage={handleMessage}
                    actionId={actionId}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
