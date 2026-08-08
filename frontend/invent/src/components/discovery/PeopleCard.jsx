import { MapPin, UserCheck, UserPlus, MessageSquare, Clock, X } from "lucide-react";
import { motion } from "framer-motion";
import VerificationBadge from "./VerificationBadge";
import Button from "../common/Button";

/**
 * PeopleCard — shown in Discover People & Network pages.
 *
 * connectionStatus:
 *   null               → not connected   → [Connect]
 *   "pending_sent"     → I sent a req    → [Request Sent] (can cancel)
 *   "pending_received" → they sent to me → [Accept] [Decline]
 *   "accepted"         → connected       → [Connected] [Message]
 *   "self"             → own profile     → nothing extra
 */
export default function PeopleCard({
  person,
  connectionStatus = null,
  onConnect,
  onAccept,
  onReject,
  onCancel,
  onMessage,
  onViewProfile,
  actionPending = false,
}) {
  if (!person) return null;

  const {
    first_name = "",
    last_name  = "",
    headline,
    country,
    province,
    role,
    profile_photo,
    verification_level,
  } = person;

  const fullName  = `${first_name} ${last_name}`.trim() || "User";
  const initials  = `${(first_name[0] || "").toUpperCase()}${(last_name[0] || "").toUpperCase()}` || "U";
  const location  = [province, country].filter(Boolean).join(", ");
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Body */}
      <div className="p-5 flex-1">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-100 to-violet-200 text-sm font-bold text-violet-700 overflow-hidden">
            {profile_photo
              ? <img src={profile_photo} alt={fullName} className="h-full w-full rounded-full object-cover" />
              : initials}
          </div>

          {/* Name + role + badge */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-semibold text-sm text-slate-900">{fullName}</p>
                {roleLabel && (
                  <span className="mt-0.5 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {roleLabel}
                  </span>
                )}
              </div>
              {verification_level === "verified" && (
                <VerificationBadge status="verified" size="sm" />
              )}
            </div>
          </div>
        </div>

        {/* Headline */}
        {headline && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-500">{headline}</p>
        )}

        {/* Location */}
        {location && (
          <div className="mt-2 flex items-center gap-1 text-xs text-slate-400">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            {location}
          </div>
        )}
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap gap-1.5 border-t border-slate-100 p-3">
        {/* View Profile — always shown */}
        <Button
          size="sm"
          variant="secondary"
          className="flex-1 text-xs"
          onClick={onViewProfile}
          aria-label={`View ${fullName}'s profile`}
        >
          View Profile
        </Button>

        {/* not connected */}
        {connectionStatus === null && onConnect && (
          <button
            onClick={onConnect}
            disabled={actionPending}
            aria-label={`Connect with ${fullName}`}
            className="flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Connect
          </button>
        )}

        {/* pending sent */}
        {connectionStatus === "pending_sent" && (
          <span className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
            <Clock className="h-3.5 w-3.5" /> Sent
          </span>
        )}
        {connectionStatus === "pending_sent" && onCancel && (
          <button
            onClick={onCancel}
            disabled={actionPending}
            aria-label="Cancel request"
            className="flex items-center justify-center rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-400 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}

        {/* pending received */}
        {connectionStatus === "pending_received" && (
          <>
            {onAccept && (
              <button
                onClick={onAccept}
                disabled={actionPending}
                className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50 transition"
              >
                <UserCheck className="h-3.5 w-3.5" />
                Accept
              </button>
            )}
            {onReject && (
              <button
                onClick={onReject}
                disabled={actionPending}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-600 hover:border-red-300 hover:text-red-500 disabled:opacity-50 transition"
              >
                Decline
              </button>
            )}
          </>
        )}

        {/* accepted */}
        {connectionStatus === "accepted" && (
          <>
            <span className="flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700">
              <UserCheck className="h-3.5 w-3.5" /> Connected
            </span>
            {onMessage && (
              <button
                onClick={onMessage}
                aria-label={`Message ${fullName}`}
                className="flex items-center justify-center rounded-lg border border-slate-200 px-2.5 py-1.5 text-slate-500 hover:border-blue-300 hover:text-blue-600 transition"
              >
                <MessageSquare className="h-4 w-4" />
              </button>
            )}
          </>
        )}
      </div>
    </motion.article>
  );
}
