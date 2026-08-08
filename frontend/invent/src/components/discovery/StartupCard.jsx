import { MapPin, TrendingUp, DollarSign, Bookmark, BookmarkCheck, Heart, HeartOff, User } from "lucide-react";
import { motion } from "framer-motion";
import VerificationBadge from "./VerificationBadge";
import Button from "../common/Button";

/**
 * Startup discovery card — shown in the investor Discover and Saved pages.
 *
 * Props:
 *   startup        — startup object from the discovery API
 *   saved          — boolean: is this startup saved?
 *   following      — boolean: is this startup followed?
 *   onView         — () => void
 *   onSave         — () => void
 *   onFollow       — () => void
 *   onContact      — () => void — opens a DM with the founder
 *   savePending    — boolean: save action in flight
 *   followPending  — boolean: follow action in flight
 */
export default function StartupCard({
  startup,
  saved = false,
  following = false,
  onView,
  onSave,
  onFollow,
  onContact,
  savePending = false,
  followPending = false,
}) {
  if (!startup) return null;

  const {
    name = "Startup",
    industry,
    stage,
    fundingRequired,
    equityOffered,
    country,
    verificationStatus = "pending",
    description,
    logo,
    category_name,
    founderName,
    founderPhoto,
  } = startup;

  const logoSrc    = logo || startup.logo_file_url || startup.logo_url;
  const initials   = (name || "S").slice(0, 2).toUpperCase();
  const fundingLabel = fundingRequired ? `$${Number(fundingRequired).toLocaleString()}` : null;

  // Founder initials for avatar fallback
  const founderInitials = founderName
    ? founderName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:shadow-md hover:border-slate-200"
    >
      <div className="p-5 flex-1 space-y-3">
        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 text-sm font-bold text-blue-700 overflow-hidden">
            {logoSrc
              ? <img src={logoSrc} alt={name} className="h-full w-full rounded-xl object-cover" />
              : initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold text-slate-900 text-sm">{name}</h3>
              <VerificationBadge status={verificationStatus} size="sm" />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
              {(industry || category_name) && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
                  {industry || category_name}
                </span>
              )}
              {stage && (
                <span className="flex items-center gap-0.5">
                  <TrendingUp className="h-3 w-3" aria-hidden="true" /> {stage}
                </span>
              )}
              {country && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" aria-hidden="true" /> {country}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Founder strip */}
        {founderName && (
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light overflow-hidden text-[10px] font-bold text-primary">
              {founderPhoto
                ? <img src={founderPhoto} alt={founderName} className="h-full w-full rounded-full object-cover" />
                : founderInitials}
            </div>
            <span className="text-xs text-slate-600 truncate">
              <span className="text-slate-400">by </span>
              <span className="font-medium text-slate-700">{founderName}</span>
            </span>
            {onContact && (
              <button
                onClick={(e) => { e.stopPropagation(); onContact(); }}
                className="ml-auto shrink-0 rounded-lg border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:border-primary hover:text-primary transition"
                aria-label={`Contact ${founderName}`}
              >
                Contact
              </button>
            )}
          </div>
        )}

        {/* Description */}
        {description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-slate-500">
            {description}
          </p>
        )}

        {/* Funding */}
        {fundingLabel && (
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-3 py-2">
            <span className="flex items-center gap-1 text-sm font-semibold text-blue-700">
              <DollarSign className="h-4 w-4" aria-hidden="true" />
              {fundingLabel} seeking
            </span>
            {equityOffered > 0 && (
              <span className="text-xs text-blue-600">{equityOffered}% equity</span>
            )}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 border-t border-slate-100 p-3">
        <Button size="sm" className="flex-1 text-xs" onClick={onView} aria-label={`View ${name}`}>
          View Startup
        </Button>
        {onSave && (
          <button
            onClick={onSave}
            disabled={savePending}
            aria-label={saved ? "Unsave startup" : "Save startup"}
            title={saved ? "Unsave startup" : "Save startup"}
            className={`flex items-center justify-center rounded-lg border px-2.5 py-1.5 transition
              ${saved
                ? "border-blue-300 bg-blue-50 text-blue-600 hover:border-red-300 hover:bg-red-50 hover:text-red-500"
                : "border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 disabled:opacity-50"
              }`}
          >
            <BookmarkCheck className={`h-4 w-4 ${saved ? "text-blue-500" : "text-slate-400"}`} />
          </button>
        )}
        {onFollow && (
          <button
            onClick={onFollow}
            disabled={followPending}
            aria-label={following ? "Unfollow startup" : "Follow startup"}
            title={following ? "Unfollow startup" : "Follow startup"}
            className={`flex items-center justify-center rounded-lg border px-2.5 py-1.5 transition disabled:opacity-50
              ${following
                ? "border-red-200 bg-red-50 text-red-500 hover:border-red-300 hover:bg-red-100"
                : "border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-500"
              }`}
          >
            {following
              ? <HeartOff className="h-4 w-4 text-red-500" />
              : <Heart className="h-4 w-4" />}
          </button>
        )}
      </div>
    </motion.article>
  );
}
