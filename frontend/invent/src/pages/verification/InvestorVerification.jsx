import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, AlertCircle, ShieldCheck, Clock, XCircle, Shield } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import VerificationForm from "../../components/verification/VerificationForm";
import VerificationDocument from "../../components/verification/VerificationDocument";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { useApi } from "../../hooks/useApi";
import {
  getInvestorVerificationStatus,
  submitInvestorVerification,
  resubmitVerification,
  updateVerificationDocument,
} from "../../services/verificationApi";

export default function InvestorVerification() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, refetch } = useApi(getInvestorVerificationStatus, []);

  const [submitting,    setSubmitting]    = useState(false);
  const [actionError,   setActionError]   = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [newDocUrl,     setNewDocUrl]     = useState("");

  const status  = data?.status            || "not_submitted";
  const request = data?.request           || null;
  const level   = data?.verification_level || user?.verificationLevel || "unverified";

  // If approved/verified, patch the context so ProtectedRoute stops redirecting
  if ((status === "approved" || level === "verified") && user?.verificationLevel !== "verified") {
    updateUser({ verificationLevel: "verified" });
  }

  const handleSubmit = async (formData) => {
    setSubmitting(true); setActionError(""); setActionSuccess("");
    try {
      await submitInvestorVerification(formData);
      setActionSuccess("Verification submitted. Our team will review it shortly.");
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!request) return;
    setSubmitting(true); setActionError(""); setActionSuccess("");
    try {
      if (newDocUrl) await updateVerificationDocument(request.id, newDocUrl);
      await resubmitVerification(request.id, newDocUrl || null);
      setActionSuccess("Verification resubmitted. Our team will review it shortly.");
      setNewDocUrl("");
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const isVerified = status === "approved" || level === "verified";

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Investor Verification</h1>
            <p className="mt-1 text-slate-500">
              Complete your verification to access all platform features.
            </p>
          </div>
          <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:text-primary hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* API / action feedback */}
        {(actionError || error) && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {actionError || error}
          </div>
        )}
        {actionSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✅ {actionSuccess}
          </div>
        )}

        {loading ? (
          <div className="flex h-48 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ── VERIFIED ── */}
            {isVerified && (
              <>
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100">
                    <ShieldCheck className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-800">You are a Verified Investor</p>
                    <p className="mt-1 text-sm text-emerald-700">
                      Your account is verified. You can now fully access the platform.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button onClick={() => navigate("/investor/dashboard")}>
                    Go to Dashboard →
                  </Button>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-3">
                  <h2 className="font-semibold text-slate-800">What you can do now</h2>
                  <ul className="space-y-2 text-sm text-slate-600">
                    {[
                      "Discover and browse published, verified startups.",
                      "Save startups and follow their progress.",
                      "Make investment offers directly to founders.",
                      "Connect with other investors and founders.",
                      "Your verified badge is visible on your profile.",
                    ].map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-emerald-500" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {/* ── PENDING / UNDER REVIEW ── */}
            {(status === "pending" || status === "under_review") && !isVerified && (
              <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-6 w-6 text-blue-500 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-800">
                      {status === "under_review" ? "Under Review" : "Verification Pending"}
                    </p>
                    <p className="text-sm text-blue-700">
                      {status === "under_review"
                        ? "Our team is actively reviewing your submission. You'll be notified once complete."
                        : "Your verification request has been submitted. We'll review it shortly."}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-blue-500">
                  Submitted on {request?.created_at ? new Date(request.created_at).toLocaleDateString() : "—"}
                </p>
                <p className="text-sm text-blue-700 border-t border-blue-200 pt-3">
                  You will have full platform access once your verification is approved.
                  For urgent queries, please contact support.
                </p>
              </div>
            )}

            {/* ── REJECTED ── */}
            {status === "rejected" && !isVerified && (
              <>
                <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-6 w-6 text-red-500 shrink-0" />
                    <div>
                      <p className="font-semibold text-red-800">Verification Not Approved</p>
                      {request?.remarks && (
                        <p className="mt-1 text-sm text-red-700">
                          Reason: <em>"{request.remarks}"</em>
                        </p>
                      )}
                    </div>
                  </div>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-red-700 pt-1">
                    <li>Review the rejection reason above.</li>
                    <li>Upload a new/corrected document below.</li>
                    <li>Click "Resubmit Verification".</li>
                  </ol>
                </div>

                {/* New document upload for resubmit */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                  <h2 className="font-semibold text-slate-800">Update Document</h2>
                  <VerificationDocument
                    onUploaded={setNewDocUrl}
                    currentUrl={request?.document_url || null}
                  />
                  <Button
                    onClick={handleResubmit}
                    disabled={submitting}
                  >
                    {submitting
                      ? <><RefreshCw className="h-4 w-4 animate-spin" /> Resubmitting…</>
                      : <><Shield className="h-4 w-4" /> Resubmit Verification</>}
                  </Button>
                </div>
              </>
            )}

            {/* ── NOT SUBMITTED — show the full form ── */}
            {status === "not_submitted" && (
              <>
                {/* Onboarding banner */}
                <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="h-6 w-6 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-amber-800">Complete your verification to get started</p>
                      <p className="mt-1 text-sm text-amber-700">
                        As an investor, you must verify your identity before accessing startups and
                        making investment offers. This keeps the platform safe for all founders.
                      </p>
                    </div>
                  </div>
                </div>

                {/* The full submission form */}
                <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                  <h2 className="mb-5 font-semibold text-slate-800">Verification Information</h2>
                  <VerificationForm
                    onSubmit={handleSubmit}
                    loading={submitting}
                    error={actionError}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
