import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Users, AlertCircle, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PeopleCard from "../../components/discovery/PeopleCard";
import Button from "../../components/common/Button";
import {
  discoverPeople,
  sendConnectionRequest,
  acceptConnection,
  rejectConnection,
  getMyConnections,
  getPendingRequests,
  getSentRequests,
} from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";
import { useAuth } from "../../hooks/useAuth";

const ROLES = ["", "investor", "inventor", "organization"];
const ROLE_LABELS = {
  "":           "All Roles",
  investor:     "Investors",
  inventor:     "Founders",
  organization: "Organizations",
};

function Skeleton() {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-3">
      <div className="flex gap-3">
        <div className="h-12 w-12 rounded-full animate-pulse bg-slate-100" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
      <div className="h-3 animate-pulse rounded bg-slate-100" />
      <div className="h-8 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}

/**
 * Build a connection map keyed by the OTHER user's id.
 * Map value: { status: "accepted"|"pending_sent"|"pending_received", connectionId }
 */
function buildConnMap(accepted, pendingReceived, pendingSent, myId) {
  const map = {};

  accepted.forEach((c) => {
    const otherId = c.sender_id === myId ? c.receiver_id : c.sender_id;
    if (otherId) map[otherId] = { status: "accepted", connectionId: c.id };
  });

  // Received pending — I am the receiver
  pendingReceived.forEach((c) => {
    const otherId = c.sender_id; // sender sent to me
    if (otherId && otherId !== myId) {
      map[otherId] = { status: "pending_received", connectionId: c.id };
    }
  });

  // Sent pending — I am the sender
  pendingSent.forEach((c) => {
    const otherId = c.receiver_id;
    if (otherId && otherId !== myId) {
      map[otherId] = { status: "pending_sent", connectionId: c.id };
    }
  });

  return map;
}

export default function DiscoverPeople() {
  const navigate  = useNavigate();
  const { user }  = useAuth();

  const [query,         setQuery]         = useState("");
  const [roleFilter,    setRoleFilter]    = useState("");
  const [country,       setCountry]       = useState("");
  const [page,          setPage]          = useState(1);
  const [people,        setPeople]        = useState([]);
  const [pagination,    setPagination]    = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [connMap,       setConnMap]       = useState({});
  const [actionPending, setActionPending] = useState(null);

  /* ── Load connections once to build status map ── */
  useEffect(() => {
    if (!user) return;
    async function loadConnections() {
      try {
        const [accepted, received, sent] = await Promise.all([
          getMyConnections("accepted"),
          getPendingRequests(),
          getSentRequests(),
        ]);
        setConnMap(buildConnMap(accepted, received, sent, user.id));
      } catch { /* silent */ }
    }
    loadConnections();
  }, [user]);

  /* ── Discover people ─────────────────────────── */
  const load = useCallback(async (pg = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await discoverPeople({
        q: query, role: roleFilter, country, page: pg, limit: 12,
      });
      const rows = res.data ?? [];
      setPeople(pg === 1 ? rows : (prev) => [...prev, ...rows]);
      setPagination(res.pagination);
      setPage(pg);
    } catch (err) {
      setError(err?.message || "Failed to load people.");
    } finally {
      setLoading(false);
    }
  }, [query, roleFilter, country]);

  useEffect(() => { load(1); }, [load]);

  /* ── Connection actions ──────────────────────── */
  async function handleConnect(person) {
    setActionPending(person.id);
    try {
      const res = await sendConnectionRequest(person.id);
      const connectionId = res.connection?.id;
      setConnMap((prev) => ({
        ...prev,
        [person.id]: { status: "pending_sent", connectionId },
      }));
    } catch (err) {
      // Show error only for non-409 (409 means duplicate — expected if already sent)
      if (!err?.message?.includes("409") && !err?.message?.toLowerCase().includes("pending")) {
        setError(err?.message || "Failed to send request.");
      }
    } finally {
      setActionPending(null);
    }
  }

  async function handleAccept(person) {
    const entry = connMap[person.id];
    if (!entry) return;
    setActionPending(person.id);
    try {
      await acceptConnection(entry.connectionId);
      setConnMap((prev) => ({
        ...prev,
        [person.id]: { status: "accepted", connectionId: entry.connectionId },
      }));
    } catch { /* silent */ } finally {
      setActionPending(null);
    }
  }

  async function handleReject(person) {
    const entry = connMap[person.id];
    if (!entry) return;
    setActionPending(person.id);
    try {
      await rejectConnection(entry.connectionId);
      setConnMap((prev) => {
        const next = { ...prev };
        delete next[person.id];
        return next;
      });
    } catch { /* silent */ } finally {
      setActionPending(null);
    }
  }

  async function handleMessage(person) {
    try {
      const conv = await getOrCreateDm(person.id);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
  }

  const hasMore = pagination && page < pagination.totalPages;

  return (
    <DashboardLayout>
      <div className="max-w-7xl space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
              <Users className="h-6 w-6 text-violet-600" />
              Discover People
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Find investors, founders, and organizations to connect with.
            </p>
          </div>
          {pagination && (
            <p className="text-sm text-slate-500">
              {pagination.total.toLocaleString()} member{pagination.total !== 1 ? "s" : ""}
            </p>
          )}
        </motion.div>

        {/* Search + filters */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <form
            onSubmit={(e) => { e.preventDefault(); load(1); }}
            className="flex flex-1 gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, headline, or bio…"
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-700 placeholder-slate-400 shadow-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
              />
            </div>
            <Button
              type="submit"
              size="sm"
              className="bg-violet-600 hover:bg-violet-700 focus-visible:ring-violet-500"
            >
              Search
            </Button>
          </form>

          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none"
              aria-label="Filter by role"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="Country"
              className="w-32 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-violet-400 focus:outline-none"
              aria-label="Filter by country"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button
              onClick={() => setError("")}
              className="ml-auto text-xs font-medium underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Grid */}
        {loading && people.length === 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array(6).fill(0).map((_, i) => <Skeleton key={i} />)}
          </div>
        ) : people.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <Users className="h-10 w-10 text-slate-300" />
            <p className="font-medium text-slate-500">No people found.</p>
            <p className="text-sm text-slate-400">
              Try a different search term or clear the role filter.
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {people.map((person) => {
                const entry  = connMap[person.id];
                const status = entry?.status || null;

                // Hide own card
                if (person.id === user?.id) return null;

                return (
                  <PeopleCard
                    key={person.id}
                    person={person}
                    connectionStatus={status}
                    onConnect={user?.role !== "admin" ? () => handleConnect(person) : undefined}
                    onAccept={user?.role !== "admin" ? () => handleAccept(person) : undefined}
                    onReject={user?.role !== "admin" ? () => handleReject(person) : undefined}
                    onMessage={user?.role !== "admin" ? () => handleMessage(person) : undefined}
                    onViewProfile={() => navigate(`/profile/${person.id}`)}
                    actionPending={actionPending === person.id}
                  />
                );
              })}
              {loading && Array(3).fill(0).map((_, i) => <Skeleton key={`sk-${i}`} />)}
            </div>

            {hasMore && !loading && (
              <div className="flex justify-center pt-2">
                <Button variant="secondary" onClick={() => load(page + 1)}>
                  <RefreshCw className="h-4 w-4" /> Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
