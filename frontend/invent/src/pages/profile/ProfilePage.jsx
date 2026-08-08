import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MapPin, Globe, Link2, UserCheck, UserPlus, MessageSquare,
  Clock, RefreshCw, Edit, Shield,
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import VerificationBadge from "../../components/discovery/VerificationBadge";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import api from "../../services/api";
import {
  sendConnectionRequest,
  getConnectionBetween,
  acceptConnection,
  rejectConnection,
} from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";

const SECTION = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";

export default function ProfilePage() {
  const { id }      = useParams();
  const navigate    = useNavigate();
  const { user: me, isAuthenticated } = useAuth();

  const [profile,       setProfile]       = useState(null);
  const [userInfo,      setUserInfo]       = useState(null);
  const [connection,    setConnection]     = useState(null);
  const [loading,       setLoading]        = useState(true);
  const [actionLoading, setActionLoading]  = useState("");
  const [error,         setError]          = useState("");

  const isOwn = me && String(me.id) === String(id);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [userRes, profRes] = await Promise.all([
          api.get(`/users/${id}`),
          api.get(`/profiles/${id}`).catch(() => ({ data: { profile: null } })),
        ]);
        setUserInfo(userRes.data.user);
        const p = profRes.data.profile ?? profRes.data ?? null;
        setProfile(p);

        if (isAuthenticated && !isOwn) {
          const conn = await getConnectionBetween(id).catch(() => null);
          setConnection(conn);
        }
      } catch (err) {
        setError(err?.message || "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id, isAuthenticated, isOwn]);

  async function handleConnect() {
    if (!isAuthenticated) { navigate("/"); return; }
    setActionLoading("connect");
    try {
      const res = await sendConnectionRequest(id);
      setConnection(res.connection);
    } catch { /* silent */ } finally { setActionLoading(""); }
  }

  async function handleAccept() {
    if (!connection) return;
    setActionLoading("accept");
    try {
      await acceptConnection(connection.id);
      setConnection((prev) => ({ ...prev, status: "accepted" }));
    } catch { /* silent */ } finally { setActionLoading(""); }
  }

  async function handleReject() {
    if (!connection) return;
    setActionLoading("reject");
    try {
      await rejectConnection(connection.id);
      setConnection(null);
    } catch { /* silent */ } finally { setActionLoading(""); }
  }

  async function handleMessage() {
    try {
      const conv = await getOrCreateDm(id);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
  }

  function getConnStatus() {
    if (!connection) return null;
    const { status, sender_id } = connection;
    if (status === "accepted") return "accepted";
    if (status === "pending") {
      return String(sender_id) === String(me?.id) ? "pending_sent" : "pending_received";
    }
    return null;
  }

  const connStatus = getConnStatus();

  /* ── Loading state ─────────────────────────── */
  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
        </div>
      </DashboardLayout>
    );
  }

  /* ── Error state ───────────────────────────── */
  if (error || !userInfo) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-slate-500">{error || "Profile not found."}</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  /* ── Derived values ────────────────────────── */
  const firstName    = profile?.first_name    || userInfo.first_name    || "";
  const lastName     = profile?.last_name     || userInfo.last_name     || "";
  const fullName     = `${firstName} ${lastName}`.trim() || userInfo.email || "User";
  const initials     = `${(firstName[0] || "").toUpperCase()}${(lastName[0] || "").toUpperCase()}` || "U";
  const headline     = profile?.headline      || "";
  const bio          = profile?.bio           || "";
  const country      = profile?.country       || "";
  const province     = profile?.province      || "";
  const website      = profile?.website       || "";
  const linkedin     = profile?.linkedin      || "";
  const profilePhoto = profile?.profile_photo || userInfo.profile_photo || "";
  const coverPhoto   = profile?.cover_photo   || "";
  const verLevel     = profile?.verification_level || "unverified";
  const roleLabel    = userInfo.role
    ? userInfo.role.charAt(0).toUpperCase() + userInfo.role.slice(1)
    : "";
  const location = [province, country].filter(Boolean).join(", ");

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-5">

        {/* ── Card: Cover + Avatar + Actions ─── */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Cover photo */}
          <div
            className="h-32 w-full bg-gradient-to-r from-blue-500 to-violet-600"
            style={
              coverPhoto
                ? { backgroundImage: `url(${coverPhoto})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}
            }
            role="img"
            aria-label="Cover photo"
          />

          {/* Content below cover */}
          <div className="relative px-6 pb-6">
            {/* Avatar */}
            <div className="absolute -top-8 left-6 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-violet-100 to-violet-200 text-lg font-bold text-violet-700 overflow-hidden shadow">
              {profilePhoto
                ? <img src={profilePhoto} alt={fullName} className="h-full w-full rounded-full object-cover" />
                : initials}
            </div>

            {/* Name + role + actions row */}
            <div className="pt-10">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                {/* Left: identity */}
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-slate-900">{fullName}</h1>
                    {verLevel === "verified" && <VerificationBadge status="verified" />}
                  </div>

                  {roleLabel && (
                    <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {roleLabel}
                    </span>
                  )}

                  {headline && (
                    <p className="mt-1 text-sm text-slate-600">{headline}</p>
                  )}

                  {location && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                      <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                      {location}
                    </p>
                  )}
                </div>

                {/* Right: action buttons */}
                <div className="flex flex-wrap gap-2 shrink-0">
                  {/* Own profile */}
                  {isOwn && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => navigate("/settings/profile")}
                    >
                      <Edit className="h-4 w-4" /> Edit Profile
                    </Button>
                  )}

                  {/* Other user — admins do not participate in normal networking */}
                  {!isOwn && isAuthenticated && me?.role !== "admin" && (
                    <>
                      {/* Not connected */}
                      {connStatus === null && (
                        <button
                          onClick={handleConnect}
                          disabled={actionLoading === "connect"}
                          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition"
                        >
                          <UserPlus className="h-4 w-4" /> Connect
                        </button>
                      )}

                      {/* I sent a request */}
                      {connStatus === "pending_sent" && (
                        <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-500">
                          <Clock className="h-4 w-4" /> Request Sent
                        </span>
                      )}

                      {/* They sent me a request */}
                      {connStatus === "pending_received" && (
                        <>
                          <button
                            onClick={handleAccept}
                            disabled={actionLoading === "accept"}
                            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition"
                          >
                            <UserCheck className="h-4 w-4" /> Accept
                          </button>
                          <button
                            onClick={handleReject}
                            disabled={actionLoading === "reject"}
                            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
                          >
                            Decline
                          </button>
                        </>
                      )}

                      {/* Connected */}
                      {connStatus === "accepted" && (
                        <span className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700">
                          <UserCheck className="h-4 w-4" /> Connected
                        </span>
                      )}

                      {/* Message */}
                      <button
                        onClick={handleMessage}
                        className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-1.5 text-sm text-slate-600 hover:border-blue-300 hover:text-blue-600 transition"
                      >
                        <MessageSquare className="h-4 w-4" /> Message
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* External links */}
              {(website || linkedin) && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" aria-hidden="true" /> Website
                    </a>
                  )}
                  {linkedin && (
                    <a
                      href={linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" /> LinkedIn
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Bio ───────────────────────────────── */}
        {bio && (
          <div className={SECTION}>
            <h2 className="mb-3 font-semibold text-slate-800">About</h2>
            <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{bio}</p>
          </div>
        )}

        {/* ── Verification ──────────────────────── */}
        <div className={SECTION}>
          <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-800">
            <Shield className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Verification
          </h2>
          <VerificationBadge status={verLevel} size="md" />
          <p className="mt-2 text-xs text-slate-400">
            {verLevel === "verified"
              ? "This user has been verified by the Innovest team."
              : "Not yet verified."}
          </p>
        </div>

      </div>
    </DashboardLayout>
  );
}
