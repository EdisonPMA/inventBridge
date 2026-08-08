/**
 * PostCard — social feed post.
 *
 * Features:
 *  - Like / comment (existing)
 *  - Repost with optional caption
 *  - Send to connections (DM only to accepted connections)
 *  - "Read more / less" caption for long posts
 *  - Connect with post owner button (if not connected)
 *  - Video autoplay when scrolled into view (muted)
 */
import { useState, useRef, useEffect, useCallback } from "react";
import {
  Heart, MessageSquare, Clock, ChevronDown, ChevronUp,
  Send, Trash2, Lightbulb, Repeat2, UserPlus, X,
  CheckCircle, Loader2, Search, Tag, Archive,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  toggleLike, addComment, getComments, deleteComment, repost,
} from "../../services/postApi";
import { archivePost, deletePost as deletePostApi } from "../../services/postApi";
import { getMyConnections, sendConnectionRequest, getConnectionBetween } from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";
import { useAuth } from "../../hooks/useAuth";

const CAPTION_LIMIT = 260; // chars before "Read more" truncation

function timeAgo(date) {
  const secs = Math.floor((Date.now() - new Date(date)) / 1000);
  if (secs < 60)    return "just now";
  if (secs < 3600)  return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

/* ── AutoplayVideo — plays when ≥50% visible ──────── */
function AutoplayVideo({ src, className }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { entry.isIntersecting ? el.play().catch(() => {}) : el.pause(); },
      { threshold: 0.5 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <video
      ref={ref}
      src={src}
      muted
      loop
      playsInline
      controls
      className={className}
      preload="metadata"
    />
  );
}

/* ── SendModal — DM post link to accepted connections ─ */
function SendModal({ post, onClose }) {
  const [connections,  setConnections]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [sending,      setSending]      = useState(false);
  const [sentDone,     setSentDone]     = useState(false);
  const [selected,     setSelected]     = useState(new Set());
  const [caption,      setCaption]      = useState("");
  const [search,       setSearch]       = useState("");

  useEffect(() => {
    getMyConnections("accepted")
      .then(setConnections)
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, []);

  // Extract peer from connection record — mapConn() returns otherId/otherName/otherPhoto
  function getPeer(conn) {
    return {
      id:    conn.otherId    || conn.other_user_id || conn.user_id,
      name:  conn.otherName  || conn.other_name    || `${conn.first_name || ""} ${conn.last_name || ""}`.trim() || "User",
      photo: conn.otherPhoto || conn.other_photo   || conn.profile_photo || null,
    };
  }

  const peers = connections.map(getPeer).filter(p => p.id);
  const filtered = search.trim()
    ? peers.filter(p => p.name.toLowerCase().includes(search.trim().toLowerCase()))
    : peers;

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleSend() {
    if (selected.size === 0 || sending) return;
    setSending(true);
    try {
      const { sendMessage } = await import("../../services/conversationApi");
      // Encode the post as a shared_post attachment so MessagesPage renders it as a card
      const postPayload = JSON.stringify({
        post_id:     post.id,
        id:          post.id,
        content:     post.content,
        first_name:  post.first_name,
        last_name:   post.last_name,
        startup_name: post.startup_name || null,
        image_url:   post.image_url || null,
        video_url:   post.video_url || null,
      });

      await Promise.all(
        [...selected].map(async (peerId) => {
          const conv = await getOrCreateDm(peerId);
          await sendMessage(conv.id, {
            message:         caption.trim() || null,
            attachment_url:  postPayload,
            attachment_type: "shared_post",
          });
        })
      );
      setSentDone(true);
      setTimeout(onClose, 1200);
    } catch { /* silent */ } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-800 text-sm">Send to connections</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Caption */}
        <div className="px-4 pt-3 pb-2">
          <input
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Add a message (optional)…"
            maxLength={200}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
        </div>

        {/* Search */}
        {peers.length > 4 && (
          <div className="px-4 pb-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search connections…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-3 text-sm focus:border-blue-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Connections list */}
        <div className="max-h-52 overflow-y-auto px-2 py-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">
              {peers.length === 0 ? "No connections yet." : "No results."}
            </p>
          ) : (
            filtered.map(peer => {
              const checked = selected.has(peer.id);
              return (
                <button key={peer.id}
                  onClick={() => toggleSelect(peer.id)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                    checked ? "bg-blue-50" : "hover:bg-slate-50"
                  }`}>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-700 overflow-hidden">
                    {peer.photo
                      ? <img src={peer.photo} alt={peer.name} className="h-full w-full rounded-full object-cover" />
                      : peer.name.charAt(0).toUpperCase()}
                  </div>
                  <p className="flex-1 text-sm font-medium text-slate-800 truncate">{peer.name}</p>
                  {/* Checkbox */}
                  <div className={`flex h-4.5 w-4.5 items-center justify-center rounded border-2 transition ${
                    checked
                      ? "border-blue-600 bg-blue-600"
                      : "border-slate-300 bg-white"
                  }`}>
                    {checked && <CheckCircle className="h-3 w-3 text-white" />}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {selected.size > 0 ? `${selected.size} selected` : "Select people to send to"}
          </p>
          {sentDone ? (
            <span className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-600">
              <CheckCircle className="h-3.5 w-3.5" /> Sent!
            </span>
          ) : (
            <button
              onClick={handleSend}
              disabled={selected.size === 0 || sending}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition">
              {sending
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                : <><Send className="h-3.5 w-3.5" /> Send to {selected.size > 0 ? selected.size : ""} {selected.size === 1 ? "person" : "people"}</>
              }
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── RepostModal ─────────────────────────────────── */
function RepostModal({ post, onClose, onReposted }) {
  const [caption,    setCaption]    = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function handleRepost() {
    setSubmitting(true); setError("");
    try {
      // startup_id inherited server-side from the original post
      const res = await repost(post.id, caption.trim());
      onReposted?.(res.post);
      onClose();
    } catch (e) {
      setError(e?.message || "Failed to repost.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h3 className="font-semibold text-slate-800 text-sm">Repost</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <textarea
            value={caption}
            onChange={e => setCaption(e.target.value)}
            placeholder="Add your thoughts (optional)…"
            rows={3}
            maxLength={500}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100"
          />
          {/* Original post preview */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 space-y-1">
            <p className="text-xs font-semibold text-slate-600">
              {post.first_name} {post.last_name}
              {post.startup_name && (
                <span className="ml-1.5 font-normal text-blue-600">· {post.startup_name}</span>
              )}
            </p>
            <p className="text-xs text-slate-600 line-clamp-3">{post.content}</p>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button onClick={handleRepost} disabled={submitting}
              className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition">
              {submitting ? "Reposting…" : "Repost"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── PostCard ────────────────────────────────────── */
export default function PostCard({ post, onDeleted, onReposted }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [liked,          setLiked]          = useState(!!post.viewer_liked);
  const [likeCount,      setLikeCount]       = useState(Number(post.like_count) || 0);
  const [commentCount,   setCommentCount]    = useState(Number(post.comment_count) || 0);
  const [showComments,   setShowComments]    = useState(false);
  const [comments,       setComments]        = useState(null);
  const [commentsLoading,setCommentsLoading] = useState(false);
  const [commentText,    setCommentText]     = useState("");
  const [submitting,     setSubmitting]      = useState(false);
  const [liking,         setLiking]          = useState(false);
  const [expanded,       setExpanded]        = useState(false);
  const [showSend,       setShowSend]        = useState(false);
  const [showRepost,     setShowRepost]      = useState(false);
  const [showDeleteMenu, setShowDeleteMenu]  = useState(false);
  const [deleting,       setDeleting]        = useState(false);
  const [connStatus,     setConnStatus]      = useState(null); // null|"none"|"pending"|"accepted"
  const [connecting,     setConnecting]      = useState(false);

  const isOwner       = user?.id === post.user_id;
  const isLongContent = (post.content || "").length > CAPTION_LIMIT;

  // Load connection status with the post owner (lazy, only for non-owners)
  useEffect(() => {
    if (!user || isOwner) return;
    getConnectionBetween(post.user_id)
      .then(conn => setConnStatus(conn ? conn.status : "none"))
      .catch(() => setConnStatus("none"));
  }, [post.user_id, user, isOwner]);

  async function handleLike() {
    if (liking) return;
    setLiking(true);
    setLiked(v => !v);
    setLikeCount(v => liked ? v - 1 : v + 1);
    try {
      const res = await toggleLike(post.id);
      setLiked(res.liked);
      setLikeCount(res.total);
    } catch {
      setLiked(v => !v);
      setLikeCount(v => liked ? v + 1 : v - 1);
    } finally { setLiking(false); }
  }

  async function handleToggleComments() {
    if (!showComments && comments === null) {
      setCommentsLoading(true);
      try {
        const res = await getComments(post.id);
        setComments(Array.isArray(res) ? res : (res.rows ?? []));
      } catch { setComments([]); }
      finally { setCommentsLoading(false); }
    }
    setShowComments(v => !v);
  }

  async function handleAddComment(e) {
    e.preventDefault();
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await addComment(post.id, commentText.trim());
      setComments(prev => [res.comment || res, ...(prev || [])]);
      setCommentCount(v => v + 1);
      setCommentText("");
    } catch { /* silent */ } finally { setSubmitting(false); }
  }

  async function handleDeleteComment(commentId) {
    try {
      await deleteComment(post.id, commentId);
      setComments(prev => (prev || []).filter(c => c.id !== commentId));
      setCommentCount(v => Math.max(0, v - 1));
    } catch { /* silent */ }
  }

  async function handleConnect() {
    if (!user || connecting || connStatus !== "none") return;
    setConnecting(true);
    try {
      await sendConnectionRequest(post.user_id);
      setConnStatus("pending");
    } catch { /* silent */ } finally { setConnecting(false); }
  }

  const {
    first_name = "", last_name = "", profile_photo,
    author_role, content, image_url, video_url,
    startup_name, startup_slug, startup_id, created_at,
    tagged_users = [],
  } = post;

  const authorName     = `${first_name} ${last_name}`.trim() || "User";
  const initials       = `${(first_name[0] || "").toUpperCase()}${(last_name[0] || "").toUpperCase()}` || "U";
  const displayContent = isLongContent && !expanded
    ? content.slice(0, CAPTION_LIMIT) + "…"
    : content;

  return (
    <>
      {showSend   && <SendModal   post={post} onClose={() => setShowSend(false)} />}
      {showRepost && <RepostModal post={post} onClose={() => setShowRepost(false)} onReposted={onReposted} />}

      <article className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">

        {/* Startup context banner */}
        {startup_name && (
          <button
            onClick={() => navigate(`/startups/${startup_slug || startup_id}`)}
            className="flex w-full items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2 text-left transition hover:bg-blue-50">
            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-blue-500" />
            <span className="text-xs font-medium text-blue-700 truncate">{startup_name}</span>
            <span className="ml-auto text-[10px] text-slate-400 shrink-0">View startup →</span>
          </button>
        )}

        {/* Header */}
        <div className="flex items-start gap-3 p-4 pb-2">
          <button
            onClick={() => navigate(`/profile/${post.user_id}`)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-bold text-slate-700 overflow-hidden hover:ring-2 hover:ring-primary/30 transition">
            {profile_photo
              ? <img src={profile_photo} alt={authorName} className="h-full w-full rounded-full object-cover" />
              : initials}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => navigate(`/profile/${post.user_id}`)}
                className="font-semibold text-sm text-slate-900 hover:text-primary transition truncate">
                {authorName}
              </button>
              {/* Connect button — only for non-owner authenticated users */}
              {user && !isOwner && connStatus === "none" && (
                <button
                  onClick={handleConnect}
                  disabled={connecting}
                  className="flex items-center gap-1 rounded-full border border-primary/30 bg-primary-light/30 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary hover:text-white transition disabled:opacity-50">
                  {connecting
                    ? <Loader2 className="h-3 w-3 animate-spin" />
                    : <><UserPlus className="h-3 w-3" /> Connect</>}
                </button>
              )}
              {connStatus === "pending" && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-600 border border-amber-200">
                  Requested
                </span>
              )}
              {connStatus === "accepted" && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-600 border border-emerald-200">
                  Connected
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              {author_role && <span className="capitalize">{author_role}</span>}
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {timeAgo(created_at)}
              </span>
            </div>
          </div>
          {isOwner && (
            <div className="relative">
              <button onClick={() => setShowDeleteMenu(v => !v)} aria-label="Post options"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
                <Trash2 className="h-4 w-4" />
              </button>
              {showDeleteMenu && (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                  <button
                    onClick={async () => {
                      setShowDeleteMenu(false); setDeleting(true);
                      try { await archivePost(post.id); onDeleted?.(post.id); }
                      catch { /* silent */ } finally { setDeleting(false); }
                    }}
                    disabled={deleting}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition">
                    <Archive className="h-4 w-4 shrink-0 text-amber-500" />
                    <div className="min-w-0">
                      <p className="font-medium">Archive post</p>
                      <p className="text-[10px] text-slate-400">Hidden but saved in history</p>
                    </div>
                  </button>
                  <div className="border-t border-slate-100" />
                  <button
                    onClick={async () => {
                      setShowDeleteMenu(false); setDeleting(true);
                      try { await deletePostApi(post.id); onDeleted?.(post.id); }
                      catch { /* silent */ } finally { setDeleting(false); }
                    }}
                    disabled={deleting}
                    className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50 transition">
                    <Trash2 className="h-4 w-4 shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium">Delete forever</p>
                      <p className="text-[10px] text-red-400">Cannot be undone</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content with Read more + @mention highlighting */}
        <div className="px-4 pb-3">
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-line">
            {displayContent.split(/(@[\w\s]+)/).map((part, i) =>
              /^@\w/.test(part)
                ? <span key={i} className="font-semibold text-primary">{part}</span>
                : part
            )}
          </p>
          {isLongContent && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="mt-1 text-xs font-medium text-blue-600 hover:text-blue-700 transition">
              {expanded ? "Show less ↑" : "Read more ↓"}
            </button>
          )}
        </div>

        {/* Image */}
        {image_url && (
          <div className="px-4 pb-3">
            <img src={image_url} alt="Post media"
              className="w-full rounded-xl object-contain bg-slate-50" loading="lazy" />
          </div>
        )}

        {/* Video — autoplay when in viewport */}
        {video_url && (
          <div className="px-4 pb-3">
            <AutoplayVideo src={video_url} className="w-full rounded-xl max-h-96" />
          </div>
        )}

        {/* Tagged people strip */}
        {tagged_users.length > 0 && (
          <div className="px-4 pb-2 flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <Tag className="h-3 w-3" /> With:
            </span>
            {tagged_users.map(t => {
              const tName = `${t.first_name || ""} ${t.last_name || ""}`.trim() || "User";
              return (
                <button key={t.user_id}
                  onClick={() => navigate(`/profile/${t.user_id}`)}
                  className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-[11px] font-medium text-violet-700 hover:bg-violet-100 transition">
                  {tName}
                </button>
              );
            })}
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 border-t border-slate-100 px-3 py-2">
          {/* Like */}
          <button onClick={handleLike} disabled={liking} aria-label={liked ? "Unlike" : "Like"} aria-pressed={liked}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              liked ? "text-red-500 bg-red-50" : "text-slate-500 hover:bg-slate-100"
            }`}>
            <Heart className={`h-4 w-4 ${liked ? "fill-red-500" : ""}`} />
            {likeCount > 0 ? likeCount : "Like"}
          </button>

          {/* Comment */}
          <button onClick={handleToggleComments}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition">
            <MessageSquare className="h-4 w-4" />
            {commentCount > 0 ? commentCount : "Comment"}
            {showComments ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {/* Repost — only on others' posts */}
          {user && !isOwner && (
            <button onClick={() => setShowRepost(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-green-50 hover:text-green-600 transition">
              <Repeat2 className="h-4 w-4" />
              Repost
            </button>
          )}

          {/* Send */}
          {user && (
            <button onClick={() => setShowSend(true)}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition ml-auto">
              <Send className="h-4 w-4" />
              Send
            </button>
          )}
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3 space-y-3">
            {user && (
              <form onSubmit={handleAddComment} className="flex gap-2">
                <input type="text" value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="Write a comment…" maxLength={500}
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-1.5 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100" />
                <button type="submit" disabled={!commentText.trim() || submitting}
                  className="flex items-center justify-center rounded-xl bg-blue-600 px-3 py-1.5 text-white transition hover:bg-blue-700 disabled:opacity-50">
                  <Send className="h-4 w-4" />
                </button>
              </form>
            )}
            {commentsLoading && (
              <div className="space-y-2">
                {[1, 2].map(i => <div key={i} className="h-8 animate-pulse rounded-xl bg-slate-100" />)}
              </div>
            )}
            {!commentsLoading && comments?.length === 0 && (
              <p className="py-2 text-center text-xs text-slate-400">No comments yet. Be the first!</p>
            )}
            {!commentsLoading && (comments || []).map(c => {
              const cName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || "User";
              return (
                <div key={c.id} className="flex items-start gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 overflow-hidden">
                    {c.profile_photo
                      ? <img src={c.profile_photo} alt={cName} className="h-full w-full rounded-full object-cover" />
                      : cName.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 rounded-xl bg-slate-50 px-3 py-2">
                    <p className="text-xs font-semibold text-slate-800">{cName}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{c.comment}</p>
                  </div>
                  {user?.id === c.user_id && (
                    <button onClick={() => handleDeleteComment(c.id)}
                      className="mt-1 rounded p-1 text-slate-300 hover:text-red-400 transition">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </article>
    </>
  );
}
