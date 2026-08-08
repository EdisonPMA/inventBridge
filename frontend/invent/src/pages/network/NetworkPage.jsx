import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UserCheck, Clock, UserPlus, UserMinus,
  AlertCircle, RefreshCw, MessageSquare, Send, X,
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import {
  getMyConnections,
  getPendingRequests,
  getSentRequests,
  acceptConnection,
  rejectConnection,
  cancelConnectionRequest,
  removeConnection,
} from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";
import { useAuth } from "../../hooks/useAuth";

const TABS = [
  { key: "connections", label: "My Network",        icon: UserCheck },
  { key: "received",    label: "Received",           icon: Clock },
  { key: "sent",        label: "Sent",               icon: Send },
];

function Avatar({ name = "", photo }) {
  const initials = name.split(" ").map((w) => w[0] || "").join("").slice(0, 2).toUpperCase() || "U";
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-sm font-bold text-violet-700 overflow-hidden">
      {photo
        ? <img src={photo} alt={name} className="h-full w-full rounded-full object-cover" />
        : initials}
    </div>
  );
}

function ConnectionCard({ conn, tab, onAccept, onReject, onCancel, onRemove, onMessage, actionId }) {
  const [confirmRemove, setConfirmRemove] = useState(false);
  const pending = actionId === conn.id;

  const otherName  = conn.otherName  || "User";
  const otherPhoto = conn.otherPhoto || null;
  const otherRole  = conn.otherRole  || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm"
    >
      <Avatar name={otherName} photo={otherPhoto} />

      <div className="flex-1 min-w-0">
        <p className="truncate font-semibold text-sm text-slate-900">{otherName}</p>
        {otherRole && (
          <p className="text-xs text-slate-500 capitalize">{otherRole}</p>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Received tab */}
        {tab === "received" && (
          <>
            <button
              onClick={() => onAccept(conn)}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition"
            >
              <UserCheck className="h-3.5 w-3.5" /> Accept
            </button>
            <button
              onClick={() => onReject(conn)}
              disabled={pending}
              className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
            >
              Decline
            </button>
          </>
        )}

        {/* Sent tab */}
        {tab === "sent" && (
          <>
            <span className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
              <Clock className="h-3.5 w-3.5" /> Pending
            </span>
            <button
              onClick={() => onCancel(conn)}
              disabled={pending}
              className="rounded-lg border border-slate-200 p-1.5 text-xs text-slate-400 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
              aria-label="Cancel request"
              title="Cancel request"
            >
              ✕
            </button>
          </>
        )}

        {/* Connections tab */}
        {tab === "connections" && (
          <>
            <button
              onClick={() => onMessage(conn)}
              aria-label="Message"
              className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
            {confirmRemove ? (
              <>
                <button
                  onClick={() => { setConfirmRemove(false); onRemove(conn); }}
                  disabled={pending}
                  className="rounded-lg bg-red-600 px-2.5 py-1.5 text-[10px] font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition"
                >
                  Remove
                </button>
                <button
                  onClick={() => setConfirmRemove(false)}
                  className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-100 transition"
                  aria-label="Cancel"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setConfirmRemove(true)}
                disabled={pending}
                aria-label="Remove connection"
                className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}

export default function NetworkPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [tab,         setTab]         = useState("connections");
  const [connections, setConnections] = useState([]);
  const [received,    setReceived]    = useState([]);
  const [sent,        setSent]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [actionId,    setActionId]    = useState(null);

  async function loadAll() {
    setLoading(true);
    setError("");
    try {
      const [acc, rec, snt] = await Promise.all([
        getMyConnections("accepted"),
        getPendingRequests(),
        getSentRequests(),
      ]);
      setConnections(acc);
      setReceived(rec);
      setSent(snt);
    } catch (err) {
      setError(err?.message || "Failed to load network.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  /* ── handlers ─────────────────────────────────── */
  async function handleAccept(conn) {
    setActionId(conn.id);
    try {
      await acceptConnection(conn.id);
      setReceived((prev) => prev.filter((c) => c.id !== conn.id));
      setConnections((prev) => [{ ...conn, status: "accepted" }, ...prev]);
    } catch { /* silent */ } finally { setActionId(null); }
  }

  async function handleReject(conn) {
    setActionId(conn.id);
    try {
      await rejectConnection(conn.id);
      setReceived((prev) => prev.filter((c) => c.id !== conn.id));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  async function handleCancel(conn) {
    setActionId(conn.id);
    try {
      await cancelConnectionRequest(conn.id);
      setSent((prev) => prev.filter((c) => c.id !== conn.id));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  async function handleRemove(conn) {
    setActionId(conn.id);
    try {
      await removeConnection(conn.id);
      setConnections((prev) => prev.filter((c) => c.id !== conn.id));
    } catch { /* silent */ } finally { setActionId(null); }
  }

  async function handleMessage(conn) {
    const otherId = conn.otherId || (conn.sender_id === user?.id ? conn.receiver_id : conn.sender_id);
    try {
      const conv = await getOrCreateDm(otherId);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
  }

  const tabData = { connections, received, sent };
  const displayed = tabData[tab] || [];

  const tabCounts = {
    connections: connections.length,
    received:    received.length,
    sent:        sent.length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Users className="h-6 w-6 text-violet-600" />
              My Network
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your professional connections.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadAll}
              aria-label="Refresh"
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Button size="sm" onClick={() => navigate("/network/discover")}>
              <UserPlus className="h-4 w-4" /> Find People
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-xs font-medium transition ${
                tab === t.key
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {tabCounts[t.key] > 0 && (
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold ${
                  t.key === "received"
                    ? "bg-red-500 text-white"
                    : "bg-slate-300 text-slate-700"
                }`}>
                  {tabCounts[t.key]}
                </span>
              )}
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
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            {tab === "connections" && (
              <>
                <p className="font-medium text-slate-500">No connections yet.</p>
                <p className="text-sm text-slate-400">
                  Discover investors and founders to build your network.
                </p>
                <Button size="sm" onClick={() => navigate("/network/discover")}>
                  <UserPlus className="h-4 w-4" /> Discover People
                </Button>
              </>
            )}
            {tab === "received" && (
              <p className="font-medium text-slate-500">No pending requests.</p>
            )}
            {tab === "sent" && (
              <p className="font-medium text-slate-500">No sent requests.</p>
            )}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {displayed.map((conn) => (
              <ConnectionCard
                key={conn.id}
                conn={conn}
                tab={tab}
                onAccept={handleAccept}
                onReject={handleReject}
                onCancel={handleCancel}
                onRemove={handleRemove}
                onMessage={handleMessage}
                actionId={actionId}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
