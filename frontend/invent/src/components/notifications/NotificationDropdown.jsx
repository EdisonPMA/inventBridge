import { useState, useEffect, useRef } from "react";
import { Bell, CheckCheck, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
} from "../../services/notificationApi";
import { getSocket } from "../../services/socket";

const TYPE_ICONS = {
  connection:  "🤝",
  investment:  "💰",
  message:     "💬",
  verification:"✅",
  post:        "📝",
  general:     "🔔",
};

const TYPE_ROUTES = {
  connection:  "/network",
  investment:  "/investor/investments",
  message:     "/messages",
  verification:"/investor/verification",
  post:        "/feed",
};

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60)    return "just now";
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

/**
 * NotificationDropdown — bell icon with badge + dropdown panel.
 * Fetches unread count on mount; loads full list when opened.
 */
export default function NotificationDropdown() {
  const navigate = useNavigate();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unread,        setUnread]        = useState(0);
  const [loading,       setLoading]       = useState(false);
  const ref = useRef(null);

  // Poll unread count every 30 seconds + listen on socket
  useEffect(() => {
    let cancelled = false;
    async function fetchCount() {
      try {
        const res = await getMyNotifications({ limit: 1 });
        if (!cancelled) setUnread(res.unread ?? 0);
      } catch { /* silent */ }
    }
    fetchCount();
    const id = setInterval(fetchCount, 30000);

    // Real-time: increment badge on socket notification event
    const socket = getSocket();
    function onSocketNotification(n) {
      if (!cancelled) {
        setUnread((v) => v + 1);
        // If panel is open, prepend to list
        setNotifications((prev) => {
          const fresh = {
            id:         Date.now(),
            title:      n.title,
            message:    n.message,
            type:       n.type || "general",
            is_read:    false,
            created_at: new Date().toISOString(),
          };
          return [fresh, ...prev];
        });
      }
    }
    if (socket) socket.on("notification", onSocketNotification);

    return () => {
      cancelled = true;
      clearInterval(id);
      if (socket) socket.off("notification", onSocketNotification);
    };
  }, []);

  // Click outside to close
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function openPanel() {
    setOpen((v) => !v);
    if (!open) {
      setLoading(true);
      try {
        const res = await getMyNotifications({ limit: 20 });
        setNotifications(res.rows ?? []);
        setUnread(res.unread ?? 0);
      } catch { /* silent */ } finally {
        setLoading(false);
      }
    }
  }

  async function handleRead(n) {
    if (!n.is_read) {
      try {
        await markNotificationRead(n.id);
        setNotifications((prev) =>
          prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x)
        );
        setUnread((v) => Math.max(0, v - 1));
      } catch { /* silent */ }
    }
    const route = TYPE_ROUTES[n.type];
    if (route) { setOpen(false); navigate(route); }
  }

  async function handleMarkAll() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnread(0);
    } catch { /* silent */ }
  }

  async function handleClear() {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnread(0);
    } catch { /* silent */ }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={openPanel}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`}
        aria-expanded={open}
        className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-2xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h3 className="font-semibold text-sm text-slate-800">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={handleMarkAll}
                  title="Mark all read"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={handleClear}
                  title="Clear all"
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                aria-label="Close notifications"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-80 overflow-y-auto">
            {loading && (
              <div className="space-y-2 p-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
                ))}
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-10 text-slate-400">
                <Bell className="h-8 w-8 opacity-30" />
                <p className="text-sm">You&rsquo;re all caught up.</p>
              </div>
            )}

            {!loading && notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleRead(n)}
                className={`flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-slate-50 ${
                  !n.is_read ? "bg-blue-50/60" : ""
                }`}
              >
                <span className="mt-0.5 text-lg" aria-hidden="true">
                  {TYPE_ICONS[n.type] || TYPE_ICONS.general}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold text-slate-800 ${!n.is_read ? "font-bold" : ""}`}>
                    {n.title}
                  </p>
                  {n.message && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>
                  )}
                  <p className="mt-1 text-xs text-slate-400">{timeAgo(n.created_at)}</p>
                </div>
                {!n.is_read && (
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-slate-100 px-4 py-2">
              <button
                onClick={() => { setOpen(false); navigate("/notifications"); }}
                className="w-full text-center text-xs font-medium text-blue-600 hover:text-blue-700 transition"
              >
                See all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
