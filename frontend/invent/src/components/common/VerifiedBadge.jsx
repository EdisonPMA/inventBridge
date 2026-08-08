import { ShieldCheck } from "lucide-react";

export default function VerifiedBadge({ className = "" }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium text-emerald-600 ${className}`} aria-label="Verified">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
      Verified
    </span>
  );
}
