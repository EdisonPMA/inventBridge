import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, RefreshCw, AlertCircle, Compass } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupCard from "../../components/discovery/StartupCard";
import StartupFilters from "../../components/discovery/StartupFilters";
import Button from "../../components/common/Button";
import { discoverStartups, toggleSaveStartup, toggleFollowStartup, getMySavedStartups, getMyFollowedStartups } from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";
import { getCategories } from "../../services/startupApi";

const EMPTY_FILTERS = {
  category_id: "", industry: "", stage: "",
  country: "", verificationStatus: "", minFunding: "", maxFunding: "",
  sort: "newest",
};

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-xl animate-pulse bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-3 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

export default function DiscoverStartups() {
  const navigate = useNavigate();

  const [query,       setQuery]       = useState("");
  const [filters,     setFilters]     = useState(EMPTY_FILTERS);
  const [page,        setPage]        = useState(1);
  const [startups,    setStartups]    = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  // Track per-card save/follow state
  const [savedIds,    setSavedIds]    = useState(new Set());
  const [followingIds,setFollowingIds]= useState(new Set());
  const [savePending, setSavePending] = useState(null);
  const [followPending,setFollowPending] = useState(null);

  // Seed savedIds and followingIds from server on mount
  useEffect(() => {
    getMySavedStartups(1, 100)
      .then(res => {
        const ids = (res.rows ?? []).map(r => r.startup_id ?? r.id).filter(Boolean);
        setSavedIds(new Set(ids));
      })
      .catch(() => {});
    getMyFollowedStartups(1, 100)
      .then(res => {
        const ids = (res.rows ?? []).map(r => r.id || r.startup_id).filter(Boolean);
        setFollowingIds(new Set(ids));
      })
      .catch(() => {});
  }, []);

  // Load categories once
  useEffect(() => {
    getCategories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async (pg = 1, reset = false) => {
    setLoading(true);
    setError("");
    try {
      const res = await discoverStartups({ q: query, ...filters, page: pg, limit: 12 });
      const rows = res.data ?? [];
      setStartups(reset ? rows : (pg === 1 ? rows : (prev) => [...prev, ...rows]));
      setPagination(res.pagination);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load startups.");
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  // Initial load
  useEffect(() => { load(1, true); }, [load]);

  function handleSearch(e) {
    e.preventDefault();
    load(1, true);
  }

  function handleFiltersChange(newFilters) {
    setFilters(newFilters);
  }

  function handleClearFilters() {
    setFilters(EMPTY_FILTERS);
  }

  async function handleSave(startupId) {
    if (savePending === startupId) return;
    setSavePending(startupId);
    try {
      const res = await toggleSaveStartup(startupId);
      setSavedIds(prev => {
        const next = new Set(prev);
        res.saved ? next.add(startupId) : next.delete(startupId);
        return next;
      });
    } catch { /* silent */ } finally {
      setSavePending(null);
    }
  }

  async function handleFollow(startupId) {
    setFollowPending(startupId);
    try {
      const res = await toggleFollowStartup(startupId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        res.following ? next.add(startupId) : next.delete(startupId);
        return next;
      });
    } catch { /* silent */ } finally {
      setFollowPending(null);
    }
  }

  async function handleContact(ownerId) {
    try {
      const conv = await getOrCreateDm(ownerId);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
  }

  const hasMore = pagination && page < pagination.totalPages;

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Compass className="h-6 w-6 text-blue-600" />
              Discover Startups
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Find and evaluate verified investment opportunities.
            </p>
          </div>
          {pagination && (
            <p className="text-sm text-slate-500">
              {pagination.total.toLocaleString()} startup{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search startups by name, industry, problem, solution…"
              maxLength={200}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <Button type="submit" size="sm">Search</Button>
        </form>

        {/* Filters */}
        <StartupFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          onClear={handleClearFilters}
          categories={categories}
        />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => load(1, true)} className="ml-auto text-xs font-medium underline">
              Retry
            </button>
          </div>
        )}

        {/* Grid */}
        {loading && startups.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : startups.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <Compass className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No verified startups found.</p>
            <p className="text-sm text-slate-400">Try changing your filters or search terms.</p>
            <Button variant="secondary" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {startups.map((s) => (
                <StartupCard
                  key={s.id}
                  startup={s}
                  saved={savedIds.has(s.id)}
                  following={followingIds.has(s.id)}
                  onView={() => navigate(`/startups/${s.slug || s.id}`)}
                  onSave={() => handleSave(s.id)}
                  onFollow={() => handleFollow(s.id)}
                  onContact={s.owner_id ? () => handleContact(s.owner_id) : undefined}
                  savePending={savePending === s.id}
                  followPending={followPending === s.id}
                />
              ))}
              {/* Skeleton cards while loading more */}
              {loading && hasMore && Array(3).fill(0).map((_, i) => <Skeleton key={`sk-${i}`} />)}
            </div>

            {/* Load more */}
            {hasMore && !loading && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => load(page + 1)}>
                  <RefreshCw className="h-4 w-4" /> Load More
                </Button>
              </div>
            )}

            {!hasMore && startups.length > 0 && (
              <p className="text-center text-sm text-slate-400 pt-2">
                All {pagination?.total?.toLocaleString()} startups loaded.
              </p>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
