import { useState } from "react";
import { CheckCircle, XCircle, Eye, Clock, FileText, ExternalLink, AlertCircle, Building2 } from "lucide-react";
import { Link } from "react-router-dom";
import VerificationBadge from "./VerificationBadge";
import Button from "../common/Button";
import { adminStartReview, adminApproveVerification, adminRejectVerification } from "../../services/verificationApi";

/**
 * Admin review card for a single verification request.
 * Handles approve/reject with remarks inline.
 *
 * @param {object}   request    - verification_request row with joined data
 * @param {Function} onUpdate   - called after any status change
 */
export default function VerificationReviewCard({ request, onUpdate }) {
  const [expanded,     setExpanded]    = useState(false);
  const [actionMode,   setActionMode]  = useState(null); // "approve" | "reject"
  const [remarks,      setRemarks]     = useState("");
  const [loading,      setLoading]     = useState(false);
  const [error,        setError]       = useState("");

  const isStartup   = request.verification_type === "startup_registration";
  const canAct      = ["pending", "under_review"].includes(request.status);
  const type        = isStartup ? "startup" : "investor";

  const handleStartReview = async () => {
    setLoading(true);
    try {
      await adminStartReview(request.id);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    setLoading(true); setError("");
    try {
      await adminApproveVerification(request.id, remarks || null);
      setActionMode(null);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!remarks.trim()) { setError("Rejection reason is required."); return; }
    setLoading(true); setError("");
    try {
      await adminRejectVerification(request.id, remarks.trim());
      setActionMode(null);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const applicantName = request.startup_name
    ? request.startup_name
    : `${request.first_name || ""} ${request.last_name || ""}`.trim() || request.email;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      {/* Header row */}
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center">
        {/* Avatar */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary">
          {applicantName.slice(0, 2).toUpperCase()}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900">{applicantName}</p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 capitalize">
              {isStartup ? "Startup" : "Investor"}
            </span>
            <VerificationBadge status={request.status} type={type} size="sm" />
          </div>
          <p className="mt-0.5 text-xs text-slate-500">
            {request.email}
            {" · "}
            Submitted {new Date(request.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {request.status === "pending" && (
            <Button size="sm" variant="secondary" disabled={loading} onClick={handleStartReview}>
              <Eye className="h-3.5 w-3.5" />{loading ? "…" : "Start Review"}
            </Button>
          )}
          {canAct && actionMode === null && (
            <>
              <Button size="sm" onClick={() => { setActionMode("approve"); setRemarks(""); setError(""); }}>
                <CheckCircle className="h-3.5 w-3.5" /> Approve
              </Button>
              <Button size="sm" variant="ghost"
                className="text-red-600 hover:bg-red-50"
                onClick={() => { setActionMode("reject"); setRemarks(""); setError(""); }}>
                <XCircle className="h-3.5 w-3.5" /> Reject
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setExpanded((v) => !v)}>
            {expanded ? "Hide Details" : "View Details"}
          </Button>
        </div>
      </div>

      {/* Inline approve / reject form */}
      {actionMode && (
        <div className="border-t border-slate-100 bg-slate-50 px-5 py-4 space-y-3">
          <p className="text-sm font-medium text-slate-700">
            {actionMode === "approve" ? "Approve verification" : "Reject verification"}
          </p>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            placeholder={
              actionMode === "approve"
                ? "Optional: add a note for the applicant"
                : "Required: reason for rejection (visible to applicant)"
            }
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none"
          />
          {error && (
            <div className="flex items-center gap-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5" /> {error}
            </div>
          )}
          <div className="flex gap-2">
            {actionMode === "approve" ? (
              <Button size="sm" disabled={loading} onClick={handleApprove}>
                {loading ? "Approving…" : <><CheckCircle className="h-3.5 w-3.5" /> Confirm Approve</>}
              </Button>
            ) : (
              <Button size="sm" disabled={loading}
                className="bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500"
                onClick={handleReject}>
                {loading ? "Rejecting…" : <><XCircle className="h-3.5 w-3.5" /> Confirm Reject</>}
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => { setActionMode(null); setError(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ["Verification Type",   request.verification_type?.replace(/_/g, " ")],
              ["Applicant Email",     request.email],
              ["Role",                request.role],
              ["Startup",             request.startup_name || "—"],
              ["Submitted",           new Date(request.created_at).toLocaleString()],
              ["Status",              request.status],
              ["Reviewed By",         request.admin_first ? `${request.admin_first} ${request.admin_last}` : "—"],
              ["Reviewed At",         request.verified_at ? new Date(request.verified_at).toLocaleString() : "—"],
            ].map(([label, value]) => value ? (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-slate-400">{label}</span>
                <span className="text-sm text-slate-800 capitalize">{value}</span>
              </div>
            ) : null)}
          </div>

          {/* View startup link for startup verifications */}
          {isStartup && request.startup_slug && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-blue-800">{request.startup_name}</p>
                  <p className="text-xs text-blue-500">View startup profile (admin access)</p>
                </div>
              </div>
              <Link
                to={`/startups/${request.startup_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 transition"
              >
                <ExternalLink className="h-3.5 w-3.5" /> View Startup
              </Link>
            </div>
          )}

          {/* Document */}
          {request.document_url && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">Registration Certificate</p>
                    <p className="text-xs text-slate-400">Click to open in new tab</p>
                  </div>
                </div>
                <a href={request.document_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition">
                  <ExternalLink className="h-3.5 w-3.5" /> Open
                </a>
              </div>
            </div>
          )}

          {/* Admin remarks */}
          {request.remarks && (
            <div className={`rounded-xl border p-3 text-sm ${
              request.status === "rejected"
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}>
              <p className="text-xs font-semibold uppercase mb-1">Admin Remarks</p>
              {request.remarks}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
