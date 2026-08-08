import { useState, useEffect } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { Search, TrendingUp, User, FileText, Loader2, ArrowLeft, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import GlobalSearch from "../../components/common/GlobalSearch";
import api from "../../services/api";

const TABS = ["All", "Startups", "People", "Posts"];

const STAGES = ["idea", "mvp", "early_stage", "growth", "scaling", "mature"];

const COUNTRIES = [
  "Ethiopia", "Kenya", "Nigeria", "Ghana", "South Africa",
  "Rwanda", "Uganda", "Tanzania", "Egypt", "Morocco",
];

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [query,   setQuery]   = useState(searchParams.get("q") || "");
  const [tab,     setTab]     = useState("All");
  const [stage,   setStage]   = useState("");
  const [country, setCountry] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ startups: [], users: [], posts: [] });
  const [showFilters, setShowFilters] = useState(false);

  // Sync URL → state
  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  // Fetch on query/filters change
  useEffect(() => {
    const q = query.trim();
    if (!q) { setResults({ startups: [], users: [], posts: [] }); return; }

    setLoading(true);
    // Shorter debounce for single chars so it feels snappy
    const delay = q.length === 1 ? 150 : 200;
    const timer = setTimeout(async () => {
      try {
        const type = tab === "All" ? "all"
          : tab === "Startups" ? "startups"
          : tab === "People"   ? "people"
          : "posts";

        const { data } = await api.get("/search", {
          params: {
            q,
            limit:   20,
            type,
            ...(stage   && { stage }),
            ...(country && { country }),
          },
        });
        setResults({
          startups: data.startups ?? [],
          users:    data.users    ?? [],
          posts:    data.posts    ?? [],
        });
      } catch {
        setResults({ startups: [], users: [], posts: [] });
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, tab, stage, country]);

  const total = results.startups.length + results.users.length + results.posts.length;
  const filtersActive = !!(stage || country);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-3xl px-4 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)}
            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-500 hover:bg-slate-50 transition">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex-1">
            <GlobalSearch className="w-full" inputClassName="w-full" />
          </div>
          {/* Filter toggle — only relevant for Startups / People / All */}
          {tab !== "Posts" && (
            <button
              onClick={() => setShowFilters((v) => !v)}
              title="Filters"
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm transition
                ${filtersActive
                  ? "border-primary bg-primary text-white"
                  : "border-slate-200 text-slate-500 hover:bg-slate-50"}`}>
              <SlidersHorizontal className="h-4 w-4" />
              {filtersActive && <span className="text-xs font-medium">Filtered</span>}
            </button>
          )}
        </div>

        {/* Filters panel */}
        {showFilters && tab !== "Posts" && (
          <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            {/* Stage — only useful for startups */}
            {(tab === "All" || tab === "Startups") && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-slate-500">Stage</label>
                <select value={stage} onChange={(e) => setStage(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-primary">
                  <option value="">Any stage</option>
                  {STAGES.map((s) => (
                    <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </div>
            )}
            {/* Country */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500">Country</label>
              <select value={country} onChange={(e) => setCountry(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm focus:outline-none focus:border-primary">
                <option value="">Any country</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            {filtersActive && (
              <button
                onClick={() => { setStage(""); setCountry(""); }}
                className="self-end rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 transition">
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Result summary */}
        {query && (
          <p className="text-sm text-slate-500">
            {loading ? "Searching…" : (
              <>{total} result{total !== 1 ? "s" : ""} for{" "}
                <span className="font-semibold text-slate-800">"{query}"</span>
                {filtersActive && <span className="text-slate-400"> (filtered)</span>}
              </>
            )}
          </p>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {TABS.map((t) => {
            const count = t === "Startups" ? results.startups.length
              : t === "People" ? results.users.length
              : t === "Posts"  ? results.posts.length
              : null;
            return (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium transition border-b-2 -mb-px
                  ${tab === t
                    ? "border-primary text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-800"}`}>
                {t}
                {count !== null && (
                  <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty */}
        {!loading && query && total === 0 && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-10 w-10 text-slate-200" />
            <p className="text-slate-500">No results for "{query}"</p>
            {filtersActive
              ? <button onClick={() => { setStage(""); setCountry(""); }}
                  className="text-sm text-primary hover:underline">Clear filters and try again</button>
              : <p className="text-sm text-slate-400">Try a different keyword</p>
            }
          </div>
        )}

        {!loading && !query && (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <Search className="h-10 w-10 text-slate-200" />
            <p className="text-slate-500">Enter a search term above</p>
          </div>
        )}

        {/* Results */}
        {!loading && total > 0 && (
          <div className="space-y-6">

            {/* Startups */}
            {(tab === "All" || tab === "Startups") && results.startups.length > 0 && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <TrendingUp className="h-3.5 w-3.5" /> Startups ({results.startups.length})
                </h2>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  {results.startups.map((s) => (
                    <Link key={s.id} to={`/startups/${s.slug || s.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-light overflow-hidden text-primary">
                        {s.logo_url
                          ? <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                          : <TrendingUp className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">{s.name}</p>
                        <p className="text-xs text-slate-500 truncate">
                          {[s.industry, s.category_name, s.stage, s.country].filter(Boolean).join(" · ")}
                        </p>
                      </div>
                      {s.verification_status === "verified" && (
                        <span className="shrink-0 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-600">
                          Verified
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* People */}
            {(tab === "All" || tab === "People") && results.users.length > 0 && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <User className="h-3.5 w-3.5" /> People ({results.users.length})
                </h2>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  {results.users.map((u) => (
                    <Link key={u.id} to={`/profile/${u.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-light overflow-hidden text-primary">
                        {u.profile_photo
                          ? <img src={u.profile_photo} alt="" className="h-full w-full rounded-full object-cover" />
                          : <User className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-slate-800 truncate">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="text-xs text-slate-500 truncate capitalize">
                          {u.headline || u.role}{u.country && ` · ${u.country}`}
                        </p>
                      </div>
                      {u.verification_level === "verified" && (
                        <span className="shrink-0 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600">
                          Verified
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Posts */}
            {(tab === "All" || tab === "Posts") && results.posts.length > 0 && (
              <section className="space-y-2">
                <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
                  <FileText className="h-3.5 w-3.5" /> Posts ({results.posts.length})
                </h2>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  {results.posts.map((p) => (
                    <Link key={p.id} to={`/feed`}
                      className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-light overflow-hidden text-primary mt-0.5">
                        {p.profile_photo
                          ? <img src={p.profile_photo} alt="" className="h-full w-full rounded-full object-cover" />
                          : <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-medium text-slate-500">
                          {p.first_name} {p.last_name}
                        </p>
                        <p className="mt-0.5 line-clamp-3 text-sm text-slate-700">{p.content}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
