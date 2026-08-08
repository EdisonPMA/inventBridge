/**
 * StartupSidebar — compact startup list for the left dashboard column.
 * Shows different content per role:
 *   inventor  → their own startups
 *   investor  → discovered/recommended startups
 *   org       → recently published startups
 */
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, ShieldCheck, MapPin, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

function StartupItem({ startup, onClick }) {
  const logoSrc = startup.logo || startup.logo_url || startup.logo_file_url;
  const initials = (startup.name || "S").slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition hover:bg-slate-100 group"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-50 to-blue-100 text-xs font-bold text-blue-700 overflow-hidden">
        {logoSrc
          ? <img src={logoSrc} alt={startup.name} className="h-full w-full object-cover rounded-lg" />
          : initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800 group-hover:text-primary transition">{startup.name}</p>
        <p className="truncate text-xs text-slate-400">
          {[startup.industry, startup.stage].filter(Boolean).join(" · ") || "Startup"}
        </p>
      </div>
      {startup.verificationStatus === "verified" && (
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
      )}
    </button>
  );
}

/* ── Inventor sidebar ─────────────────────────────── */
export function InventorStartupSidebar({ startups = [], loading = false }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">My Startups</h3>
        <Link to="/inventor/startups/new"
          className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-primary-dark transition">
          <Plus className="h-3 w-3" /> New
        </Link>
      </div>
      <div className="p-2">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 mb-1">
              <div className="h-9 w-9 rounded-lg animate-pulse bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded animate-pulse bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded animate-pulse bg-slate-100" />
              </div>
            </div>
          ))
        ) : startups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-center text-slate-400">
            <TrendingUp className="h-7 w-7 opacity-30" />
            <p className="text-xs">No startups yet</p>
            <Link to="/inventor/startups/new" className="text-xs text-primary hover:underline">Create one →</Link>
          </div>
        ) : (
          startups.map(s => (
            <StartupItem
              key={s.id}
              startup={s}
              onClick={() => navigate(`/startups/${s.slug || s.id}`)}
            />
          ))
        )}
      </div>
      {startups.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5">
          <Link to="/inventor/startups"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> Manage all
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Investor sidebar ─────────────────────────────── */
export function InvestorStartupSidebar({ startups = [], loading = false }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">For You</h3>
        <Link to="/discover"
          className="text-[10px] font-medium text-primary hover:underline">Browse all</Link>
      </div>
      <div className="p-2">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 mb-1">
              <div className="h-9 w-9 rounded-lg animate-pulse bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded animate-pulse bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded animate-pulse bg-slate-100" />
              </div>
            </div>
          ))
        ) : startups.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">
            <p>No recommendations yet.</p>
            <Link to="/discover" className="text-primary hover:underline">Discover startups →</Link>
          </div>
        ) : (
          startups.slice(0, 6).map(s => (
            <StartupItem
              key={s.id}
              startup={s}
              onClick={() => navigate(`/startups/${s.slug || s.id}`)}
            />
          ))
        )}
      </div>
      {startups.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-2.5">
          <Link to="/discover"
            className="flex items-center gap-1 text-xs font-medium text-primary hover:underline">
            <ExternalLink className="h-3 w-3" /> Discover more
          </Link>
        </div>
      )}
    </div>
  );
}

/* ── Organization sidebar ─────────────────────────── */
export function OrgStartupSidebar({ startups = [], loading = false }) {
  const navigate = useNavigate();
  return (
    <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent Startups</h3>
        <Link to="/discover"
          className="text-[10px] font-medium text-primary hover:underline">View all</Link>
      </div>
      <div className="p-2">
        {loading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2.5 mb-1">
              <div className="h-9 w-9 rounded-lg animate-pulse bg-slate-100 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-3/4 rounded animate-pulse bg-slate-100" />
                <div className="h-2.5 w-1/2 rounded animate-pulse bg-slate-100" />
              </div>
            </div>
          ))
        ) : startups.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No published startups yet.</p>
        ) : (
          startups.slice(0, 6).map(s => (
            <StartupItem
              key={s.id}
              startup={s}
              onClick={() => navigate(`/startups/${s.slug || s.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
