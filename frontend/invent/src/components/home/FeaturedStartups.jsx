import { Link, useNavigate } from "react-router-dom";
import SectionHeader from "../common/SectionHeader";
import StartupCard from "../dashboard/StartupCard";
import { useApi } from "../../hooks/useApi";
import { fetchFeaturedStartups } from "../../services/homeApi";

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-100 bg-white p-5 space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-xl bg-slate-200" />
        <div className="flex-1 space-y-1.5">
          <div className="h-4 w-2/3 rounded bg-slate-200" />
          <div className="h-3 w-1/2 rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-3 w-full rounded bg-slate-100" />
      <div className="h-3 w-3/4 rounded bg-slate-100" />
    </div>
  );
}

export default function FeaturedStartups() {
  const navigate = useNavigate();
  const { data: startups, loading } = useApi(() => fetchFeaturedStartups({ limit: 3 }), []);

  return (
    <section id="explore" className="section-padding bg-slate-50">
      <div className="section-container">
        <div className="flex items-end justify-between">
          <SectionHeader tag="Featured" title="Top Startups" />
          <Link to="/?tab=signup" className="text-sm font-medium text-primary hover:underline hidden sm:block">
            Browse all →
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array(3).fill(0).map((_, i) => <SkeletonCard key={i} />)
            : (startups || []).map((s) => (
                <StartupCard
                  key={s.id}
                  startup={s}
                  onView={() => navigate(`/startups/${s.slug}`)}
                />
              ))
          }
          {!loading && (!startups || startups.length === 0) && (
            <p className="col-span-3 py-10 text-center text-sm text-slate-400">
              No published startups yet. Be the first to list yours!
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
