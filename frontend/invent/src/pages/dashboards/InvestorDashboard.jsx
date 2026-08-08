import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bookmark, TrendingUp, Clock, Heart, DollarSign,
  RefreshCw, AlertCircle, Compass, ShieldCheck, Sparkles,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout     from "../../components/dashboard/DashboardLayout";
import DashboardFeedLayout  from "../../components/dashboard/DashboardFeedLayout";
import DashboardFeed        from "../../components/dashboard/DashboardFeed";
import { InvestorStartupSidebar } from "../../components/dashboard/StartupSidebar";
import StatCard   from "../../components/dashboard/StatCard";
import ChartCard  from "../../components/dashboard/ChartCard";
import Button     from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { useApi  } from "../../hooks/useApi";
import { getInvestorDashboard } from "../../services/dashboardApi";
import { getMyInvestments } from "../../services/investmentApi";

const fade = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};
function Skel({ h = "h-24" }) { return <div className={`animate-pulse rounded-2xl bg-slate-100 ${h}`} />; }

const STATUS_COLORS = {
  accepted:    "bg-emerald-50 text-emerald-700",
  negotiating: "bg-blue-50   text-blue-700",
  pending:     "bg-amber-50  text-amber-700",
  completed:   "bg-slate-100 text-slate-600",
  rejected:    "bg-red-50    text-red-600",
  cancelled:   "bg-red-50    text-red-600",
};

export default function InvestorDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const { data, loading, error, refetch } = useApi(getInvestorDashboard, []);

  // Filter chips state
  const [categoryFilter, setCategoryFilter] = useState(null);

  // Investments for feed composer context
  const [investmentsForFeed, setInvestmentsForFeed] = useState([]);
  useEffect(() => {
    getMyInvestments()
      .then(list => {
        const seen = new Set();
        const unique = (Array.isArray(list) ? list : (list?.investments ?? []))
          .filter(i => ["pending","negotiating","accepted","finalized"].includes(i.status))
          .filter(i => { const k = i.startup_id || i.startup; if (seen.has(k)) return false; seen.add(k); return true; });
        setInvestmentsForFeed(unique);
      })
      .catch(() => {});
  }, []);

  const firstName   = user?.firstName || "Investor";
  const isVerified  = user?.verificationLevel === "verified";
  const stats       = data?.stats        || {};
  const allRec      = data?.recommended  || [];
  const investments = data?.investments  || [];
  const portfolioData = data?.portfolioData || [];
  const dbCategories  = data?.categories   || [];
  const hasPersonalized = allRec.some(s => s.isPersonalized);

  const filterChips = [
    { label: "All", value: "all" },
    ...(hasPersonalized ? [{ label: "For You ✦", value: "for_you" }] : []),
    ...dbCategories.map(c => ({ label: c.name, value: c.name })),
  ];

  const filtered = !categoryFilter || categoryFilter === "all" ? allRec
    : categoryFilter === "for_you" ? allRec.filter(s => s.isPersonalized)
    : allRec.filter(s => s.industry === categoryFilter || s.category_name === categoryFilter);

  const totalDeployed = investments
    .filter(i => ["accepted","completed"].includes(i.status))
    .reduce((s, i) => s + i.amount, 0);

  return (
    <DashboardLayout>
      <motion.div variants={fade.container} initial="hidden" animate="visible" className="space-y-5">

        {/* Header */}
        <motion.div variants={fade.item} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Home</p>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">Welcome back, {firstName}</h1>
              {isVerified && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
            <p className="text-sm text-slate-500">Discover startups and manage your portfolio.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition" aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Button size="sm" as={Link} to="/discover">
              <Compass className="h-4 w-4" /> Discover
            </Button>
          </div>
        </motion.div>

        {error && (
          <motion.div variants={fade.item} className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
          </motion.div>
        )}

        {/* Stats strip */}
        <motion.div variants={fade.item} className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skel key={i} h="h-20" />) : (<>
            <StatCard title="Saved"       value={stats.savedStartups    ?? 0} icon={Bookmark}   iconBg="bg-violet-50"  iconColor="text-violet-600" />
            <StatCard title="Active"      value={stats.activeInvestments ?? 0} icon={TrendingUp} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard title="Pending"     value={stats.pendingOffers     ?? 0} icon={Clock}      iconBg="bg-amber-50"   iconColor="text-amber-600" />
            <StatCard title="Following"   value={stats.following         ?? 0} icon={Heart}      iconBg="bg-red-50"     iconColor="text-red-500" />
          </>)}
        </motion.div>

        {/* Three-column feed layout */}
        <motion.div variants={fade.item}>
          <DashboardFeedLayout
            left={
              <InvestorStartupSidebar startups={filtered.slice(0, 8)} loading={loading} />
            }
            center={
              <DashboardFeed investments={investmentsForFeed} />
            }
            right={
              <div className="space-y-4">
                {/* Category filter chips */}
                {!loading && dbCategories.length > 0 && (
                  <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
                    <div className="flex items-center gap-1.5 mb-3">
                      {hasPersonalized && <Sparkles className="h-3.5 w-3.5 text-violet-500" />}
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Filter Startups</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {filterChips.map(chip => (
                        <button key={chip.value}
                          onClick={() => setCategoryFilter(chip.value === "all" ? null : chip.value)}
                          className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition ${
                            (chip.value === "all" && !categoryFilter) || chip.value === categoryFilter
                              ? "bg-primary text-white shadow-sm"
                              : "border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
                          }`}>
                          {chip.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Portfolio chart */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Portfolio Growth</h3>
                  {loading ? <Skel h="h-36" /> : (
                    <ChartCard
                      title="Investment Value"
                      subtitle="Monthly"
                      data={portfolioData.length ? portfolioData : [{ label: "—", value: 0 }]}
                      type="line"
                      color="#2563eb"
                      footer={totalDeployed > 0 ? `Deployed: $${totalDeployed.toLocaleString()}` : "No completed investments"}
                    />
                  )}
                </div>

                {/* My investments mini list */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">My Investments</h3>
                    <Link to="/investor/investments" className="text-[10px] font-medium text-primary hover:underline">View all</Link>
                  </div>
                  {loading ? (
                    <div className="p-3 space-y-2">{Array(3).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div>
                  ) : investments.length === 0 ? (
                    <div className="py-6 text-center text-xs text-slate-400">
                      <DollarSign className="h-7 w-7 opacity-30 mx-auto mb-1.5" />
                      <p>No investments yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {investments.slice(0, 5).map(inv => (
                        <div key={inv.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition"
                          onClick={() => navigate("/investor/investments")}>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-800 truncate">{inv.startup}</p>
                            <p className="text-[10px] text-slate-400">${inv.amount.toLocaleString()}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${STATUS_COLORS[inv.status] || "bg-slate-100 text-slate-600"}`}>
                            {inv.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            }
          />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
