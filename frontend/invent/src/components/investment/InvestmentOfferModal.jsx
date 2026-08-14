import { useState } from "react";
import { X, DollarSign, Percent, FileText, AlertCircle, CheckCircle } from "lucide-react";
import { createInvestment } from "../../services/investmentApi";
import Button from "../common/Button";

/**
 * InvestmentOfferModal — begins the investment workflow.
 * Submitting does NOT complete or transfer any investment.
 * Status starts as "pending" and requires founder action.
 *
 * Props:
 *   startup   — { id, name, funding_required, equity_offered, verification_status, status }
 *   onClose   — () => void
 *   onSuccess — (investment) => void
 */
export default function InvestmentOfferModal({ startup, onClose, onSuccess }) {
  const [offeredAmount,    setOfferedAmount]    = useState("");
  const [equityPercentage, setEquityPercentage] = useState(startup?.equity_offered || "");
  const [notes,            setNotes]            = useState("");
  const [submitting,       setSubmitting]       = useState(false);
  const [error,            setError]            = useState("");
  const [success,          setSuccess]          = useState(null);

  const canSubmit =
    startup?.status === "published" &&
    startup?.verification_status === "verified";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!offeredAmount || Number(offeredAmount) <= 0) {
      setError("Please enter a valid investment amount.");
      return;
    }
    if (!equityPercentage || Number(equityPercentage) <= 0 || Number(equityPercentage) > 100) {
      setError("Equity must be between 0.01% and 100%.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await createInvestment({
        startup_id:        startup.id,
        offered_amount:    Number(offeredAmount),
        equity_percentage: Number(equityPercentage),
        notes:             notes.trim() || undefined,
      });
      setSuccess(res.investment);
      // Call onSuccess after showing the success screen (not before)
      setTimeout(() => onSuccess?.(res.investment), 100);
    } catch (err) {
      setError(err?.message || "Failed to submit offer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Success state ────────────────────────────── */
  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" />
          <h2 className="mt-4 text-xl font-bold text-slate-900">Offer Submitted!</h2>
          <p className="mt-2 text-sm text-slate-600">
            Your investment offer of{" "}
            <strong>${Number(success.offered_amount).toLocaleString()}</strong> for{" "}
            <strong>{startup.name}</strong> has been submitted.
          </p>
          <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-700 text-left">
            <p className="font-semibold mb-1">What happens next:</p>
            <ol className="space-y-1 list-decimal list-inside">
              <li>The founder has been notified.</li>
              <li>The founder will review and can accept, reject, or negotiate.</li>
              <li>You can negotiate through the messaging system.</li>
              <li>No funds are transferred at this stage.</li>
            </ol>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Status: <span className="font-semibold text-amber-600">Pending</span>
          </p>
          <Button className="mt-6 w-full" onClick={onClose}>Done</Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offer-title"
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 id="offer-title" className="font-bold text-slate-900">Make Investment Offer</h2>
            <p className="text-xs text-slate-500 mt-0.5">{startup?.name}</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {!canSubmit && (
          <div className="mx-6 mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
            <AlertCircle className="inline mr-1 h-3.5 w-3.5" />
            {startup?.verification_status !== "verified"
              ? "This startup is not yet verified. Offers are only available for verified startups."
              : "This startup is not currently accepting offers."}
          </div>
        )}

        {/* Startup context */}
        {(startup?.funding_required > 0 || startup?.equity_offered > 0) && (
          <div className="mx-6 mt-4 flex gap-4 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
            {startup.funding_required > 0 && (
              <div>
                <p className="text-xs text-blue-500 font-medium">Startup Seeking</p>
                <p className="font-bold text-blue-700 text-sm">${Number(startup.funding_required).toLocaleString()}</p>
              </div>
            )}
            {startup.equity_offered > 0 && (
              <div>
                <p className="text-xs text-blue-500 font-medium">Equity Available</p>
                <p className="font-bold text-blue-700 text-sm">{startup.equity_offered}%</p>
              </div>
            )}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Amount */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offer-amount">
              Investment Amount (USD) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="offer-amount"
                type="number"
                min="1"
                step="0.01"
                required
                disabled={!canSubmit}
                value={offeredAmount}
                onChange={(e) => setOfferedAmount(e.target.value)}
                placeholder="e.g. 50000"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Equity */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offer-equity">
              Proposed Equity (%) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                id="offer-equity"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                required
                disabled={!canSubmit}
                value={equityPercentage}
                onChange={(e) => setEquityPercentage(e.target.value)}
                placeholder="e.g. 10"
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="offer-notes">
              Proposal Message
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <textarea
                id="offer-notes"
                value={notes}
                disabled={!canSubmit}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe your investment thesis, value-add, and any conditions…"
                rows={3}
                maxLength={1000}
                className="w-full resize-none rounded-xl border border-slate-200 py-2.5 pl-9 pr-4 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {error}
            </div>
          )}

          <p className="text-xs text-slate-400">
            ⚠ Submitting this form does not transfer any funds. This is a proposal that the founder must review and accept.
          </p>

          <div className="flex gap-3 pt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={submitting || !canSubmit}>
              {submitting ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                  Submitting…
                </span>
              ) : "Submit Offer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
