/**
 * DashboardFeed — public post feed embedded in dashboards.
 * Shows public posts + CreatePost composer for authenticated users.
 * Reused across Inventor, Investor, and Organization dashboards.
 *
 * Props:
 *   startups    [{ id, name }]  — inventor's own startups (required for inventor)
 *   investments [{ startup_id, startup_name }] — investor's investments (optional)
 */
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, Newspaper } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PostCard   from "../feed/PostCard";
import CreatePost from "../feed/CreatePost";
import { getFeed, deletePost } from "../../services/postApi";
import { useAuth } from "../../hooks/useAuth";

function Skel() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 space-y-3 shadow-sm">
      <div className="flex gap-3">
        <div className="h-9 w-9 rounded-full animate-pulse bg-slate-100 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
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

export default function DashboardFeed({ startups = [], investments = [] }) {
  const { user } = useAuth();
  const [posts,      setPosts]      = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page,       setPage]       = useState(1);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");

  const load = useCallback(async (pg = 1) => {
    setLoading(true); setError("");
    try {
      const res  = await getFeed(pg, 10);
      const rows = res.data ?? (Array.isArray(res) ? res : []);
      setPosts(pg === 1 ? rows : prev => [...prev, ...rows]);
      setPagination(res.pagination ?? null);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load feed.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(1); }, [load]);

  const hasMore = pagination && page < pagination.totalPages;

  return (
    <div className="space-y-4">
      {/* Composer — shown for inventor/investor; hidden for org (no posting context) */}
      {user && user.role !== "organization" && user.role !== "admin" && (
        <CreatePost
          onCreated={(post) => post && setPosts(prev => [post, ...prev])}
          startups={startups}
          investments={investments}
        />
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
          <button onClick={() => load(1)} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}

      {/* Posts */}
      {loading && posts.length === 0 ? (
        <div className="space-y-4">{Array(3).fill(0).map((_, i) => <Skel key={i} />)}</div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center text-slate-400">
          <Newspaper className="h-9 w-9 opacity-30" />
          <p className="text-sm font-medium">No posts yet.</p>
          <p className="text-xs">Be the first to share an update.</p>
        </div>
      ) : (
        <AnimatePresence initial={false}>
          {posts.map((post, i) => (
            <motion.div key={post.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i < 5 ? i * 0.04 : 0 }}>
              <PostCard post={post}
                onDeleted={(id) => setPosts(prev => prev.filter(p => p.id !== id))} />
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      {/* Load more */}
      {hasMore && !loading && (
        <button
          onClick={() => load(page + 1)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 transition shadow-sm">
          <RefreshCw className="h-4 w-4" /> Load more posts
        </button>
      )}
      {loading && posts.length > 0 && <Skel />}
    </div>
  );
}
