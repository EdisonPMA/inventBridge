import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, DollarSign, AlertCircle, RefreshCw,
  CheckCircle, XCircle, MessageSquare, ChevronDown,
  History, ArrowRightLeft, FileCheck, MinusCircle, Send, X, Percent,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import {
  getReceivedInvestments,
  acceptInvestment,
  rejectInvestment,
  negotiateInvestment,
  updateOffer,
  getInvestmentHistory,
} from "../../services/investmentApi";
import { getOrCreateDm } from "../../services/conversationApi";
import { getSocket } from "../../services/socket";

const STATUS_STYLES = {
  pending:     "bg-amber-50  text-amber-700  border-amber-200",
  negotiating: "bg-blue-50   text-blue-700   border-blue-200",
  accepted:    "bg-emerald-50 text-emerald-700 border-emerald-200",
  rejected:    "bg-red-50    text-red-600    border-red-200",
  cancelled:   "bg-slate-100 text-slate-600  border-slate-200",
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

/* â”€â”€ History event helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const EVENT_META = {
  initial_offer:    { label: "Initial Offer",    icon: DollarSign,      color: "text-blue-600   bg-blue-50   border-blue-200" },
  counter_offer:    { label: "Counter Offer",    icon: ArrowRightLeft,  color: "text-amber-600  bg-amber-50  border-amber-200" },
  status_change:    { label: "Status Change",    icon: History,         color: "text-slate-500  bg-slate-50  border-slate-200" },
  agreement_signed: { label: "Agreement Signed", icon: FileCheck,       color: "text-violet-600 bg-violet-50 border-violet-200" },
};

const STATUS_LABELS = {
  negotiating: "Moved to Negotiation",
  accepted:    "Offer Accepted",
  rejected:    "Offer Rejected",
  cancelled:   "Offer Cancelled",
  finalized:   "Deal Finalized",
};

function HistoryTimeline({ investmentId }) {
  const [events,  setEvents]  = useState(null); // null = not loaded yet
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    getInvestmentHistory(investmentId)
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [investmentId]);

  if (loading) return (
    <div className="space-y-2 py-2">
      {[1,2].map(i => <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />)}
    </div>
  );

  if (error) return (
    <p className="text-xs text-red-500 py-2">Could not load history.</p>
  );

  if (!events?.length) return (
    <p className="text-xs text-slate-400 py-2 italic">No history recorded yet.</p>
  );

  return (
    <ol className="relative space-y-0 border-l border-slate-200 ml-2">
      {events.map((e, idx) => {
        const meta   = EVENT_META[e.event_type] || EVENT_META.status_change;
        const Icon   = meta.icon;
        const name   = `${e.first_name || ""} ${e.last_name || ""}`.trim() || e.proposer_role;
        const isLast = idx === events.length - 1;

        return (
          <li key={e.id} className={`ml-4 ${isLast ? "pb-0" : "pb-4"}`}>
            {/* dot */}
            <span className={`absolute -left-[9px] flex h-4 w-4 items-center justify-center rounded-full border bg-white ${meta.color.split(" ").slice(2).join(" ")}`}>
              <Icon className={`h-2.5 w-2.5 ${meta.color.split(" ")[0]}`} />
            </span>

            <div className="flex flex-wrap items-start justify-between gap-1">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700">
                  {e.event_type === "status_change"
                    ? (STATUS_LABELS[e.notes] || `Status â†’ ${e.notes}`)
                    : meta.label}
                </p>
                <p className="text-xs text-slate-400">
                  by <span className="font-medium text-slate-600 capitalize">{name}</span>
                  {" Â· "}{new Date(e.created_at).toLocaleString()}
                </p>
                {(e.offered_amount || e.equity_percentage) && (
                  <p className="mt-0.5 text-xs text-slate-600">
                    {e.offered_amount && <span className="font-medium">${Number(e.offered_amount).toLocaleString()}</span>}
                    {e.offered_amount && e.equity_percentage && " Â· "}
                    {e.equity_percentage && <span>{e.equity_percentage}% equity</span>}
                  </p>
                )}
                {e.notes && e.event_type !== "status_change" && e.event_type !== "agreement_signed" && (
                  <p className="mt-0.5 text-xs text-slate-500 italic line-clamp-2">"{e.notes}"</p>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* â”€â”€ Counter Offer Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function CounterOfferModal({ offer, onClose, onSubmit }) {
  const [amount,   setAmount]   = useState(offer.offered_amount || "");
  const [equity,   setEquity]   = useState(offer.equity_percentage || "");
  const [notes,    setNotes]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) { setError("Enter a valid amount."); return; }
    if (!equity || Number(equity) <= 0 || Number(equity) > 100) { setError("Equity must be 0.01â€“100%."); return; }
    setLoading(true); setError("");
    try {
      await onSubmit({ offered_amount: Number(amount), equity_percentage: Number(equity), notes: notes.trim() || undefined });
      onClose();
    } catch (err) { setError(err?.message || "Failed to send counter offer."); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Send Counter Offer</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Proposed Amount (USD)</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
              <input type="number" min="1" step="0.01" required value={amount} onChange={e => setAmount(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Equity (%)</label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400"/>
              <input type="number" min="0.01" max="100" step="0.01" required value={equity} onChange={e => setEquity(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"/>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Message (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
              placeholder="Explain your counter offer termsâ€¦"
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none"/>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm text-slate-600 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={loading}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {loading ? "Sendingâ€¦" : "Send Counter"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* â”€â”€ Offer Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function OfferCard({ offer, onAccept, onReject, onDiscuss, onCounter, actionId }) {
  const [expanded,      setExpanded]      = useState(false);
  const [showHistory,   setShowHistory]   = useState(false);
  const [showCounter,   setShowCounter]   = useState(false);
  const busy = actionId === offer.id;

  const investorName = `${offer.investor_first || ""} ${offer.investor_last || ""}`.trim() || "Investor";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden"
    >
      {/* Summary row */}
      <div className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-sm font-bold text-blue-700 overflow-hidden">
          {offer.investor_photo
            ? <img src={offer.investor_photo} alt={investorName} className="h-full w-full rounded-full object-cover" />
            : investorName.slice(0, 2).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-sm text-slate-900">{investorName}</p>
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLES[offer.status] || STATUS_STYLES.pending}`}>
              {offer.status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{offer.startup_name}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-sm">
            <span className="flex items-center gap-1 font-semibold text-slate-800">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
              ${Number(offer.offered_amount).toLocaleString()}
            </span>
            <span className="text-slate-500">{offer.equity_percentage}% equity</span>
            <span className="text-xs text-slate-400">{new Date(offer.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <button
          onClick={() => { setExpanded(v => !v); if (!expanded) setShowHistory(false); }}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      </div>

      {/* Expanded panel */}
      <AnimatePresence>
        {showCounter && (<CounterOfferModal offer={offer} onClose={() => setShowCounter(false)} onSubmit={(data) => onCounter(offer, data)} />)}{expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* Notes */}
            {offer.notes && (
              <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
                <p className="text-xs font-medium text-slate-500 mb-1">Proposal Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-line">{offer.notes}</p>
              </div>
            )}

            {/* History section */}
            <div className="border-t border-slate-100 px-5 py-3">
              <button
                onClick={() => setShowHistory(v => !v)}
                className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800 transition"
              >
                <History className="h-3.5 w-3.5" />
                Negotiation History
                <ChevronDown className={`h-3 w-3 transition-transform ${showHistory ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showHistory && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden mt-3"
                  >
                    <HistoryTimeline investmentId={offer.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            {["pending", "negotiating"].includes(offer.status) && (
              <div className="flex flex-wrap gap-2 border-t border-slate-100 px-5 py-3">
                {offer.status === "pending" && (
                  <button
                    onClick={() => { setShowCounter(true); }}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 disabled:opacity-50 transition">
                      <ArrowRightLeft className="h-3.5 w-3.5" /> Counter Offer
                    </button>
                  <button
                      onClick={() => onAccept(offer)} disabled={busy} disabled={busy}
                    className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                  >
                    <CheckCircle className="h-3.5 w-3.5" /> Accept
                  </button>
                )}
                <button
                  onClick={() => onReject(offer)} disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-red-300 hover:text-red-600 disabled:opacity-50 transition"
                >
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button
                  onClick={() => onDiscuss(offer)} disabled={busy}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Discuss
                </button>
                {busy && <span className="text-xs text-slate-400 self-center">Processingâ€¦</span>}
              </div>
            )}

            {offer.status === "accepted" && (
              <div className="flex gap-2 border-t border-slate-100 px-5 py-3">
                <button
                  onClick={() => onDiscuss(offer)}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                >
                  <MessageSquare className="h-3.5 w-3.5" /> Open Conversation
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function InvestmentOffersPage() {
  const navigate = useNavigate();
  const [offers,   setOffers]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [filter,   setFilter]   = useState("");
  const [actionId, setActionId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      setOffers(await getReceivedInvestments(filter || undefined));
    } catch (err) {
      setError(err?.message || "Failed to load offers.");
    } finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = ({ investment }) =>
      setOffers(prev => [investment, ...prev.filter(o => o.id !== investment.id)]);
    socket.on("new_investment_offer", handler);
    return () => socket.off("new_investment_offer", handler);
  }, []);

  async function handleAccept(offer) {
    setActionId(offer.id);
    try {
      const res = await acceptInvestment(offer.id);
      setOffers(prev => prev.map(o => o.id === offer.id ? res.investment : o));
    } catch (err) { setError(err?.message || "Failed to accept offer."); }
    finally { setActionId(null); }
  }

  async function handleReject(offer) {
    setActionId(offer.id);
    try {
      const res = await rejectInvestment(offer.id);
      setOffers(prev => prev.map(o => o.id === offer.id ? res.investment : o));
    } catch (err) { setError(err?.message || "Failed to reject offer."); }
    finally { setActionId(null); }
  }

  async function handleDiscuss(offer) {
    setActionId(offer.id);
    try {
      if (offer.status === "pending") {
        const res = await negotiateInvestment(offer.id);
        setOffers(prev => prev.map(o => o.id === offer.id ? res.investment : o));
        if (res.conversation) { navigate(`/messages/${res.conversation.id}`); return; }
      }
      const conv = await getOrCreateDm(offer.investor_id);
      navigate(`/messages/${conv.id}`);
    } catch (err) { setError(err?.message || "Failed to open conversation."); }
    finally { setActionId(null); }
  }

  async function handleCounter(offer, data) {
    setActionId(offer.id);
    try {
      const res = await updateOffer(offer.id, data);
      setOffers(prev => prev.map(o => o.id === offer.id ? res.investment : o));
    } catch (err) { setError(err?.message || "Failed to send counter offer."); }
    finally { setActionId(null); }
  }

  const pending = offers.filter(o => o.status === "pending").length;

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Briefcase className="h-6 w-6 text-blue-600" />
              Investment Offers
              {pending > 0 && (
                <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
                  {pending} new
                </span>
              )}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review, accept, reject, or negotiate investment offers for your startups.
            </p>
          </div>
          <button onClick={load} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {/* Filters */}
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
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Briefcase className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No investment offers yet.</p>
            <p className="text-sm text-slate-400">Offers from investors will appear here when your startup is published and verified.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {offers.map(offer => (
              <OfferCard key={offer.id} offer={offer}
                onAccept={handleAccept} onReject={handleReject}
                onDiscuss={handleDiscuss} onCounter={handleCounter} actionId={actionId} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}


