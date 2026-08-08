import { ShieldCheck, ShieldAlert, Clock } from "lucide-react";

const config = {
  verified: { icon: ShieldCheck, label: "Verified", classes: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  pending: { icon: Clock, label: "Pending", classes: "bg-amber-50 text-amber-700 border-amber-200" },
  unverified: { icon: ShieldAlert, label: "Unverified", classes: "bg-slate-50 text-slate-500 border-slate-200" },
  rejected: { icon: ShieldAlert, label: "Rejected", classes: "bg-red-50 text-red-600 border-red-200" },
};

export default function VerificationBadge({ status = "unverified", size = "sm" }) {
  const c = config[status] || config.unverified;
  const Icon = c.icon;
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-medium ${c.classes} ${textSize}`}>
      <Icon className={iconSize} aria-hidden="true" />
      {c.label}
    </span>
  );
}
