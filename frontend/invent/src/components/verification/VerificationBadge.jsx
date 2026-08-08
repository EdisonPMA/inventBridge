import { ShieldCheck, ShieldAlert, Clock, ShieldX, Shield } from "lucide-react";

/**
 * Universal verification badge driven 100% by backend data.
 * Never render "Verified" from frontend state alone.
 *
 * @param {string} status  - verified | pending | under_review | rejected | not_submitted | approved
 * @param {string} type    - "startup" | "investor" | "user"  (affects label)
 * @param {string} size    - "sm" | "md" | "lg"
 */

const STATUS_CONFIG = {
  verified:      { icon: ShieldCheck, label: "Verified",      bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  approved:      { icon: ShieldCheck, label: "Verified",      bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  pending:       { icon: Clock,       label: "Pending",        bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  under_review:  { icon: Clock,       label: "Under Review",   bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  rejected:      { icon: ShieldX,     label: "Rejected",       bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200" },
  not_submitted: { icon: Shield,      label: "Unverified",     bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200" },
  submitted:     { icon: Clock,       label: "Submitted",      bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
};

const SIZE_CONFIG = {
  sm:  { icon: "h-3 w-3",   text: "text-xs",  padding: "px-2 py-0.5" },
  md:  { icon: "h-4 w-4",   text: "text-sm",  padding: "px-2.5 py-1" },
  lg:  { icon: "h-5 w-5",   text: "text-base", padding: "px-3 py-1.5" },
};

export default function VerificationBadge({ status = "not_submitted", type = "user", size = "sm" }) {
  const cfg  = STATUS_CONFIG[status] || STATUS_CONFIG.not_submitted;
  const sz   = SIZE_CONFIG[size] || SIZE_CONFIG.sm;
  const Icon = cfg.icon;

  // Adjust label by type
  let label = cfg.label;
  if (status === "verified" || status === "approved") {
    if (type === "startup")  label = "Verified Startup";
    if (type === "investor") label = "Verified Investor";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${cfg.bg} ${cfg.text} ${cfg.border} ${sz.padding} ${sz.text}`}
      aria-label={`Verification status: ${label}`}
    >
      <Icon className={sz.icon} aria-hidden="true" />
      {label}
    </span>
  );
}
