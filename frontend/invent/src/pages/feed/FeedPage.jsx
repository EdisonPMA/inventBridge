import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PostCard from "../../components/feed/PostCard";
import CreatePost from "../../components/feed/CreatePost";
import Button from "../../components/common/Button";
import { getFeed, deletePost } from "../../services/postApi";
import { getMyStartups } from "../../services/startupApi";
import { getMyInvestments } from "../../services/investmentApi";
import { useAuth } from "../../hooks/useAuth";

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full animate-pulse bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="h-2.5 w-1/4 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function FeedPage() {
  const { user } = useAuth();
  const [posts,       setPosts]       = useState([]);
  const [pagination,  setPagination]  = useState(null);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");
  const [startups,    setStartups]    = useState([]);
  const [investments, setInvestments] = useState([]);

  // Scroll to a specific post when navigated from a chat shared-post link (#post-123)
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    // Wait for posts to render, then scroll
    const timer = setTimeout(() => {
      const el = document.querySelector(hash);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 600);
    return () => clearTimeout(timer);
  }, [posts]);

  // Load own startups (inventor) or active investments (investor) for the composer
  useEffect(() => {
    if (user?.role === "inventor") {
      getMyStartups().then(setStartups).catch(() => {});
    } else if (user?.role === "investor") {
      // Investors can tag startups they've invested in
      getMyInvestments()
        .then(data => {
          // Deduplicate by startup_id — keep unique startups with active/accepted offers
          const seen = new Set();
          const unique = (Array.isArray(data) ? data : (data?.investments ?? []))
            .filter(i => ["pending","negotiating","accepted","finalized"].includes(i.status))
            .filter(i => { if (seen.has(i.startup_id || i.startup)) return false; seen.add(i.startup_id || i.startup); return true; });
          setInvestments(unique);
        })
        .catch(() => {});
    }
  }, [user]);

  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await getFeed(pg, 20);
      const rows = res.data ?? (Array.isArray(res) ? res : []);
      setPosts(pg === 1 ? rows : (prev) => [...prev, ...rows]);
      setPagination(res.pagination ?? null);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  function handlePostCreated(newPost) {
    if (newPost) setPosts((prev) => [newPost, ...prev]);
  }

  async function handleDeletePost(postId) {
    try {
      await deletePost(postId);
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    } catch { /* silent */ }
  }

  const hasMore = pagination && page < pagination.totalPages;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            Feed
          </h1>
          <button
            onClick={() => load(1)}
            aria-label="Refresh feed"
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading && page === 1 ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {/* Create post */}
        <CreatePost onCreated={handlePostCreated} startups={startups} investments={investments} />

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => load(1)} className="ml-auto text-xs font-medium underline">Retry</button>
          </div>
        )}

        {/* Posts */}
        {loading && posts.length === 0 ? (
          <div className="space-y-4">
            {Array(4).fill(0).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : posts.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <TrendingUp className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">Nothing in your feed yet.</p>
            <p className="text-sm text-slate-400">
              Connect with people and follow startups to see their updates here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} id={`post-${post.id}`}>
                <PostCard post={post} onDeleted={handleDeletePost} />
              </div>
            ))}
            {loading && hasMore && <Skeleton />}
          </div>
        )}

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <Button variant="secondary" onClick={() => load(page + 1)}>
              <RefreshCw className="h-4 w-4" /> Load More
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
