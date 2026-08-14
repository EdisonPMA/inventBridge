import { useState, useEffect } from "react";
import { Bell, CheckCheck, Trash2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "../../services/notificationApi";

import { useAuth } from "../../hooks/useAuth";

const TYPE_ICONS = {
  connection:   "🤝",
  investment:   "💰",
  message:      "💬",
  verification: "✅",
  post:         "📝",
  general:      "🔔",
};

// Routes vary by role — investment notifications go to different pages for investor vs inventor
function getNotificationRoute(type, userRole, notification) {
  if (type === "investment") {
    return userRole === "inventor" ? "/inventor/investment-offers" : "/investor/investments";
  }
  if (type === "verification") {
    return userRole === "investor" ? "/investor/verification" : "/inventor/startups";
  }
  if (type === "connection") return "/network";
  if (type === "message")    return "/messages";
  if (type === "post")       return "/feed";
  return null;
}

const TYPE_FILTERS = [
  { value: "", label: "All" },
  { value: "connection",   label: "🤝 Connections" },
  { value: "investment",   label: "💰 Investments" },
  { value: "message",      label: "💬 Messages" },
  { value: "verification", label: "✅ Verification" },
  { value: "post",         label: "📝 Posts" },
];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

function Skeleton() {
  return (
    <div className="flex gap-4 px-4 py-3">
      <div className="h-8 w-8 rounded-full animate-pulse bg-slate-100" />
      <div className="flex-1 space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-2.5 w-2/3 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function NotificationsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unread,         setUnread]        = useState(0);
  const [total,          setTotal]         = useState(0);
  const [page,           setPage]          = useState(1);
  const [typeFilter,     setTypeFilter]    = useState("");
  const [loading,        setLoading]       = useState(true);
  const [error,          setError]         = useState("");

  async function load(pg = 1, reset = false) {
    setLoading(true);
    setError("");
    try {
      const res = await getMyNotifications({ page: pg, limit: 20, type: typeFilter || undefined });
      const rows = res.rows ?? [];
      setNotifications(reset || pg === 1 ? rows : (prev) => [...prev, ...rows]);
      setUnread(res.unread ?? 0);
      setTotal(res.total ?? 0);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(1, true); }, [typeFilter]);

  async function handleRead(n) {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
        setUnread((v) => Math.max(0, v - 1));
      } catch { /* silent */ }
    }
    const route = getNotificationRoute(n.type, user?.role);
    if (route) navigate(route);
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  }

  async function handleDelete(id, e) {
    e.stopPropagation();
    try {
      await deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setTotal((v) => Math.max(0, v - 1));
    } catch { /* silent */ }
  }

  async function handleClearAll() {
    if (!window.confirm("Clear all notifications?")) return;
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnread(0);
      setTotal(0);
    } catch { /* silent */ }
  }

  const hasMore = notifications.length < total;

  return (
    <DashboardLayout>
      <div className="mx-auto w-full max-w-2xl space-y-4 px-2 sm:px-0">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center justify-between gap-2"
        >
          <h1 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-slate-900">
            <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
            Notifications
            {unread > 0 && (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {unread}
              </span>
            )}
          </h1>
          <div className="flex items-center gap-2">
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition"
                aria-label="Mark all as read"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Mark all read</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 transition"
                aria-label="Clear all notifications"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Clear all</span>
              </button>
            )}
          </div>
        </motion.div>

        {/* Type filter tabs — scrollable on mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
                typeFilter === f.value
                  ? "bg-blue-600 text-white"
                  : "border border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* List */}
        <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
          {loading && notifications.length === 0 ? (
            <div className="divide-y divide-slate-50">
              {Array(5).fill(0).map((_, i) => <Skeleton key={i} />)}
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Bell className="h-10 w-10 text-slate-200" />
              <p className="font-medium text-slate-500">You&rsquo;re all caught up.</p>
              <p className="text-sm text-slate-400">No notifications to show.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleRead(n)}
                  className={`flex w-full items-start gap-3 px-3 sm:px-4 py-3.5 text-left transition hover:bg-slate-50 ${
                    !n.is_read ? "bg-blue-50/50" : ""
                  }`}
                >
                  <span className="mt-0.5 text-xl shrink-0" aria-hidden="true">
                    {TYPE_ICONS[n.type] || TYPE_ICONS.general}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm text-slate-900 ${!n.is_read ? "font-semibold" : "font-medium"}`}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="mt-0.5 text-xs text-slate-500 line-clamp-2">{n.message}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" aria-label="Unread" />
                    )}
                    <button
                      onClick={(e) => handleDelete(n.id, e)}
                      aria-label="Delete notification"
                      className="rounded-lg p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}

          {hasMore && (
            <div className="border-t border-slate-100 p-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => load(page + 1)}
                disabled={loading}
              >
                {loading ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
