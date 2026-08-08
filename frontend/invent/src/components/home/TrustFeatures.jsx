import { ShieldCheck } from "lucide-react";

const items = [
  "Verified users only",
  "Secure communication",
  "Protected startup information",
  "Trusted investment environment",
];

export default function TrustFeatures() {
  return (
    <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <div key={item} className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
            <span className="text-xs text-slate-600">{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
