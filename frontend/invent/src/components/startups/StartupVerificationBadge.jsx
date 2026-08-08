import { ShieldCheck, ShieldAlert, Clock, ShieldX } from "lucide-react";

const config = {
  verified:     { icon: ShieldCheck, label: "Verified",      bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  pending:      { icon: Clock,       label: "Pending",        bg: "bg-amber-50",   text: "text-amber-700",   border: "border-amber-200" },
  under_review: { icon: Clock,       label: "Under Review",   bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
  rejected:     { icon: ShieldX,     label: "Rejected",       bg: "bg-red-50",     text: "text-red-600",     border: "border-red-200" },
  unverified:   { icon: ShieldAlert, label: "Unverified",     bg: "bg-slate-50",   text: "text-slate-500",   border: "border-slate-200" },
  submitted:    { icon: Clock,       label: "Submitted",      bg: "bg-blue-50",    text: "text-blue-700",    border: "border-blue-200" },
};

export default function StartupVerificationBadge({ status = "unverified", size = "sm" }) {
  const c = config[status] || config.unverified;
  const Icon = c.icon;
  const iconCls = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textCls = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-medium ${c.bg} ${c.text} ${c.border} ${textCls}`}>
      <Icon className={iconCls} aria-hidden="true" />
      {c.label}
    </span>
  );
}
