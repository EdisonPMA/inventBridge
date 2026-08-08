/**
 * PostHistory — shows the current user's archived posts.
 * Posts here are hidden from public but not deleted.
 * Owner can restore or permanently delete each post.
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Trash2, RefreshCw, AlertCircle, RotateCcw, Clock } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import { getMyArchivedPosts, restorePost, deletePost } from "../../services/postApi";

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Skel() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm space-y-2">
      <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
      <div className="h-3 animate-pulse rounded bg-slate-100" />
      <div className="h-3 w-4/5 animate-pulse rounded bg-slate-100" />
    </div>
  );
}

export default function PostHistory() {
  const navigate = useNavigate();
  const [posts,   setPosts]   = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [actionId, setActionId] = useState(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const res = await getMyArchivedPosts(0);
      setPosts(res.posts ?? []);
      setTotal(res.total ?? 0);
    } catch (e) {
      setError(e?.message || "Failed to load post history.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleRestore(id) {
    setActionId(id);
    try {
      await restorePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(v => Math.max(0, v - 1));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  async function handleDeleteForever(id) {
    setActionId(id);
    try {
      await deletePost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setTotal(v => Math.max(0, v - 1));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-5">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Posts</p>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Archive className="h-5 w-5 text-amber-500" />
              Post History
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Archived posts are hidden from everyone. Restore to make them public again.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
              {total} archived
            </span>
            <button onClick={load} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </motion.div>

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={load} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skel key={i} />)}</div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <Archive className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No archived posts.</p>
            <p className="text-sm text-slate-400">
              When you archive a post it will appear here.
            </p>
            <Button size="sm" variant="secondary" onClick={() => navigate("/feed")}>
              Back to Feed
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map(post => {
              const busy = actionId === post.id;
              const name = `${post.first_name || ""} ${post.last_name || ""}`.trim() || "You";
              return (
                <motion.div key={post.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-amber-100 bg-white shadow-sm overflow-hidden">
                  {/* Status bar */}
                  <div className="flex items-center gap-2 border-b border-amber-100 bg-amber-50 px-4 py-2">
                    <Archive className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-medium text-amber-700">Archived</span>
                    <span className="ml-auto flex items-center gap-1 text-[10px] text-amber-500">
                      <Clock className="h-3 w-3" />{timeAgo(post.created_at)}
                    </span>
                  </div>

                  {/* Post preview */}
                  <div className="p-4">
                    {post.startup_name && (
                      <p className="mb-1 text-xs font-medium text-blue-600">· {post.startup_name}</p>
                    )}
                    {post.image_url && (
                      <img src={post.image_url} alt="" className="mb-2 w-full rounded-xl object-contain max-h-40 bg-slate-50" />
                    )}
                    <p className="text-sm text-slate-700 line-clamp-4 whitespace-pre-line">{post.content}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-3">
                    <button
                      onClick={() => handleRestore(post.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                      <RotateCcw className="h-3.5 w-3.5" />
                      {busy ? "Restoring…" : "Restore"}
                    </button>
                    <button
                      onClick={() => handleDeleteForever(post.id)}
                      disabled={busy}
                      className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 disabled:opacity-50 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                      {busy ? "Deleting…" : "Delete forever"}
                    </button>
                    <p className="ml-auto text-[10px] text-slate-400">Not visible to others</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
