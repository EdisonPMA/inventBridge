import SectionHeader from "../common/SectionHeader";
import { Heart, MessageCircle } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { fetchActivityFeed } from "../../services/homeApi";

function FeedSkeleton() {
  return (
    <div className="animate-pulse flex items-center gap-3 rounded-xl border border-slate-100 p-4">
      <div className="h-10 w-10 shrink-0 rounded-full bg-slate-200" />
      <div className="flex-1 space-y-1.5">
        <div className="h-3 w-2/3 rounded bg-slate-200" />
        <div className="h-3 w-full rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function ActivityFeed() {
  const { data: activities, loading } = useApi(() => fetchActivityFeed(6), []);

  return (
    <section className="section-padding bg-white">
      <div className="section-container">
        <SectionHeader tag="Live Activity" title="What's Happening Now" center />
        <div className="mt-10 max-w-2xl mx-auto space-y-3">
          {loading
            ? Array(4).fill(0).map((_, i) => <FeedSkeleton key={i} />)
            : (activities || []).map((a) => (
                <div key={a.id} className="flex items-start gap-3 rounded-xl border border-slate-100 p-4 hover:bg-slate-50 transition">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-xs font-bold text-primary">
                    {a.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800">
                      <span className="font-semibold">{a.actor}</span>
                      {" — "}
                      <span className="text-slate-600 line-clamp-1">{a.action}</span>
                    </p>
                    <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
                      <span>{a.time}</span>
                      {a.likes > 0 && (
                        <span className="flex items-center gap-1">
                          <Heart className="h-3 w-3" /> {a.likes}
                        </span>
                      )}
                      {a.comments > 0 && (
                        <span className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" /> {a.comments}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
          }
          {!loading && (!activities || activities.length === 0) && (
            <p className="py-10 text-center text-sm text-slate-400">No activity yet. Be the first to post!</p>
          )}
        </div>
      </div>
    </section>
  );
}
