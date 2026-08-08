import { Link } from "react-router-dom";
import { ArrowRight, DollarSign, MapPin, TrendingUp } from "lucide-react";
import SectionHeader from "../common/SectionHeader";
import VerificationBadge from "../dashboard/VerificationBadge";

const opportunities = [
  { id: 1, name: "PayFlow", industry: "FinTech", stage: "Growth", funding: 500000, country: "Kenya", status: "verified" },
  { id: 2, name: "SolarGrid", industry: "Energy", stage: "MVP", funding: 300000, country: "Tanzania", status: "pending" },
  { id: 3, name: "EduBridge", industry: "EdTech", stage: "Prototype", funding: 80000, country: "Uganda", status: "verified" },
];

export default function Opportunities() {
  return (
    <section id="opportunities" className="section-padding bg-slate-50">
      <div className="section-container">
        <div className="flex items-end justify-between">
          <SectionHeader tag="Open for Investment" title="Latest Opportunities" />
          <Link to="/?tab=signup" className="hidden text-sm font-medium text-primary hover:underline sm:block">
            See all →
          </Link>
        </div>
        <div className="mt-10 space-y-4">
          {opportunities.map((o) => (
            <div key={o.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md sm:flex-row sm:items-center">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-light text-sm font-bold text-primary">
                {o.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{o.name}</h3>
                  <VerificationBadge status={o.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {o.stage}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{o.industry}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {o.country}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-slate-500">Seeking</p>
                  <p className="font-semibold text-primary flex items-center gap-0.5">
                    <DollarSign className="h-3.5 w-3.5" />
                    {(o.funding / 1000).toFixed(0)}k
                  </p>
                </div>
                <Link to="/?tab=signup"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-dark transition">
                  View <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
