import { Link } from "react-router-dom";
import SectionHeader from "../common/SectionHeader";
import VerifiedBadge from "../common/VerifiedBadge";
import { useApi } from "../../hooks/useApi";
import { fetchFeaturedInvestors } from "../../services/homeApi";

function InvestorSkeleton() {
  return (
    <div className="animate-pulse flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm">
      <div className="h-16 w-16 rounded-full bg-slate-200" />
      <div className="space-y-2 w-full">
        <div className="mx-auto h-4 w-2/3 rounded bg-slate-200" />
        <div className="mx-auto h-3 w-1/2 rounded bg-slate-100" />
        <div className="mx-auto h-3 w-1/3 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function FeaturedInvestors() {
  const { data: investors, loading } = useApi(() => fetchFeaturedInvestors(3), []);

  return (
    <section id="investors" className="section-padding bg-white">
      <div className="section-container">
        <div className="flex items-end justify-between">
          <SectionHeader tag="Top Investors" title="Meet the Investors" />
          <Link to="/?tab=signup" className="text-sm font-medium text-primary hover:underline hidden sm:block">
            View all →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {loading
            ? Array(3).fill(0).map((_, i) => <InvestorSkeleton key={i} />)
            : (investors || []).map((inv) => (
                <div key={inv.id} className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-sm hover:shadow-md transition">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-bold text-blue-600">
                    {inv.avatar || inv.name?.charAt(0) || "I"}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{inv.name}</p>
                    {inv.verified && <VerifiedBadge className="mt-1" />}
                    <p className="mt-1 text-xs text-slate-500">{inv.company}</p>
                    {inv.interests?.length > 0 && (
                      <div className="mt-2 flex flex-wrap justify-center gap-1">
                        {inv.interests.slice(0, 3).map((interest) => (
                          <span key={interest} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {interest}
                          </span>
                        ))}
                      </div>
                    )}
                    {inv.investments > 0 && (
                      <p className="mt-2 text-sm font-medium text-primary">{inv.investments} investments</p>
                    )}
                  </div>
                </div>
              ))
          }
          {!loading && (!investors || investors.length === 0) && (
            <p className="col-span-3 py-10 text-center text-sm text-slate-400">
              No investors listed yet.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
