import { motion } from "framer-motion";
import { MapPin, TrendingUp, DollarSign } from "lucide-react";
import VerificationBadge from "./VerificationBadge";
import Button from "../common/Button";

/**
 * @param {object} startup  - { id, name, industry, stage, fundingRequired, country, verificationStatus, logo, description }
 * @param {function} onView
 * @param {function} onSave
 * @param {function} onContact
 * @param {boolean} showActions
 */
export default function StartupCard({ startup, onView, onSave, onContact, showActions = true }) {
  const {
    name = "Startup Name",
    industry = "Technology",
    stage = "MVP",
    fundingRequired,
    country,
    verificationStatus = "pending",
    logo,
    description,
  } = startup || {};

  const initials = name.slice(0, 2).toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col rounded-2xl border border-slate-100 bg-white shadow-sm shadow-slate-100 transition hover:shadow-md hover:border-slate-200"
    >
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Logo */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary/20 text-sm font-bold text-primary">
            {logo ? <img src={logo} alt={name} className="h-full w-full rounded-xl object-cover" /> : initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="truncate font-semibold text-slate-900">{name}</h3>
              <VerificationBadge status={verificationStatus} />
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{industry}</span>
              <span className="flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" /> {stage}
              </span>
              {country && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" /> {country}
                </span>
              )}
            </div>
          </div>
        </div>
        {description && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-500">{description}</p>
        )}
        {fundingRequired && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-primary-light px-3 py-2">
            <DollarSign className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-primary">
              ${Number(fundingRequired).toLocaleString()} seeking
            </span>
          </div>
        )}
      </div>
      {showActions && (
        <div className="flex gap-2 border-t border-slate-100 p-4">
          <Button size="sm" className="flex-1" onClick={onView}>View Details</Button>
          {onSave && <Button variant="secondary" size="sm" onClick={onSave}>Save</Button>}
          {onContact && <Button variant="ghost" size="sm" onClick={onContact}>Contact</Button>}
        </div>
      )}
    </motion.div>
  );
}
