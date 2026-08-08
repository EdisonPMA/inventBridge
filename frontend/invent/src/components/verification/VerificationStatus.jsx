import { ShieldCheck, Clock, ShieldX, Shield, RefreshCw, FileText, AlertCircle } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import Button from "../common/Button";

const STEP_MAP = {
  not_submitted: 0,
  pending:       1,
  under_review:  2,
  approved:      3,
  verified:      3,
  rejected:      -1,
};

const steps = [
  { label: "Submitted",    icon: FileText },
  { label: "Pending",      icon: Clock },
  { label: "Under Review", icon: ShieldCheck },
  { label: "Verified",     icon: ShieldCheck },
];

/**
 * @param {string}   status           - current verification status
 * @param {string}   type             - "startup" | "investor"
 * @param {string}   remarks          - admin remarks (shown on rejection)
 * @param {string}   submittedAt      - ISO date string
 * @param {string}   verifiedAt       - ISO date string
 * @param {Function} onSubmit         - called when user clicks Submit
 * @param {Function} onResubmit       - called when user clicks Resubmit
 * @param {boolean}  loading          - show spinner on action buttons
 */
export default function VerificationStatus({
  status = "not_submitted",
  type = "startup",
  remarks,
  submittedAt,
  verifiedAt,
  onSubmit,
  onResubmit,
  loading = false,
}) {
  const currentStep = STEP_MAP[status] ?? 0;
  const isRejected  = status === "rejected";
  const isVerified  = status === "verified" || status === "approved";
  const canSubmit   = status === "not_submitted";
  const canResubmit = isRejected;

  return (
    <div className="space-y-5">
      {/* Badge */}
      <div className="flex items-center gap-3">
        <VerificationBadge status={status} type={type} size="md" />
        {isVerified && verifiedAt && (
          <span className="text-xs text-slate-400">
            Verified on {new Date(verifiedAt).toLocaleDateString()}
          </span>
        )}
        {submittedAt && !isVerified && (
          <span className="text-xs text-slate-400">
            Submitted {new Date(submittedAt).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* Progress stepper — only for non-rejected */}
      {!isRejected && (
        <div className="flex items-center gap-0">
          {steps.map((step, i) => {
            const done    = i < currentStep;
            const active  = i === currentStep && !isVerified;
            const complete = isVerified && i === steps.length - 1;
            const Icon    = step.icon;
            return (
              <div key={step.label} className="flex flex-1 items-center">
                <div className="flex flex-col items-center gap-1">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all ${
                    done || complete
                      ? "border-primary bg-primary text-white"
                      : active
                      ? "border-primary bg-white text-primary"
                      : "border-slate-200 bg-white text-slate-300"
                  }`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className={`text-[10px] font-medium ${
                    done || active || complete ? "text-primary" : "text-slate-400"
                  }`}>
                    {step.label}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 mb-4 ${
                    i < currentStep ? "bg-primary" : "bg-slate-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Rejection notice */}
      {isRejected && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
            <ShieldX className="h-4 w-4 shrink-0" />
            Verification Not Approved
          </div>
          {remarks && (
            <p className="text-sm text-red-600">
              <span className="font-medium">Admin reason: </span>{remarks}
            </p>
          )}
          <p className="text-xs text-red-500">
            Please correct the information or upload a new document and resubmit.
          </p>
        </div>
      )}

      {/* Under review notice */}
      {status === "under_review" && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          <RefreshCw className="h-4 w-4 shrink-0 animate-spin" />
          Our team is currently reviewing your submission. We&apos;ll notify you when complete.
        </div>
      )}

      {/* Verified notice */}
      {isVerified && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          Your {type} has been verified by Innovest.
          {type === "startup" && " It is now discoverable by investors."}
        </div>
      )}

      {/* CTA buttons */}
      {canSubmit && onSubmit && (
        <Button onClick={onSubmit} disabled={loading} className="w-full sm:w-auto">
          {loading
            ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Submitting…</>
            : <><Shield className="h-4 w-4" /> Submit for Verification</>
          }
        </Button>
      )}
      {canResubmit && onResubmit && (
        <Button onClick={onResubmit} disabled={loading} className="w-full sm:w-auto">
          {loading
            ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Resubmitting…</>
            : <><RefreshCw className="h-4 w-4" /> Resubmit Verification</>
          }
        </Button>
      )}
    </div>
  );
}
