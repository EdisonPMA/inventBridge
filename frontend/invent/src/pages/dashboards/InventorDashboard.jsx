import { motion } from "framer-motion";
import {
  DollarSign, TrendingUp, Plus, FileText, CheckCircle,
  Edit, AlertCircle, RefreshCw, Shield, MapPin, ShieldCheck,
  Clock, XCircle, Lightbulb, Users,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout    from "../../components/dashboard/DashboardLayout";
import DashboardFeedLayout from "../../components/dashboard/DashboardFeedLayout";
import DashboardFeed      from "../../components/dashboard/DashboardFeed";
import { InventorStartupSidebar } from "../../components/dashboard/StartupSidebar";
import StatCard  from "../../components/dashboard/StatCard";
import Button    from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { useApi  } from "../../hooks/useApi";
import { getInventorDashboard } from "../../services/dashboardApi";

const fade = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } },
  item: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};
function Skel({ h = "h-24" }) { return <div className={`animate-pulse rounded-2xl bg-slate-100 ${h}`} />; }

const STATUS_STYLE = {
  published: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  submitted: "bg-blue-50 text-blue-700 border border-blue-200",
  draft:     "bg-slate-100 text-slate-600 border border-slate-200",
  archived:  "bg-red-50 text-red-600 border border-red-200",
  suspended: "bg-red-50 text-red-600 border border-red-200",
};
const VER_STYLE = {
  verified: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  pending:  "bg-amber-50 text-amber-700 border border-amber-200",
  rejected: "bg-red-50 text-red-600 border border-red-200",
};
function VerIcon({ status }) {
  if (status === "verified") return <ShieldCheck className="h-3 w-3" />;
  if (status === "rejected") return <XCircle className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
}

const OFFER_STATUS = {
  accepted: "bg-emerald-50 text-emerald-700",
  negotiating: "bg-blue-50 text-blue-700",
  pending:  "bg-amber-50 text-amber-700",
  rejected: "bg-red-50 text-red-600",
};

export default function InventorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(getInventorDashboard, []);

  const firstName           = user?.firstName || "Founder";
  const stats               = data?.stats || { interests: 0, fundingProgress: 0, connections: 0 };
  const myStartups          = data?.myStartups || [];
  const investmentInterests = data?.investmentInterests || [];
  const primaryStartup      = myStartups[0] || null;

  // Feed startups list for composer (same list as sidebar)
  const feedStartups = myStartups.map(s => ({ id: s.id, name: s.name }));

  return (
    <DashboardLayout>
      <motion.div variants={fade.container} initial="hidden" animate="visible" className="space-y-5">

        {/* Header */}
        <motion.div variants={fade.item} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Home</p>
            <h1 className="text-xl font-bold text-slate-900">Welcome back, {firstName}</h1>
            <p className="text-sm text-slate-500">Manage your startups and track investor interest.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition" aria-label="Refresh">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Button size="sm" as={Link} to="/inventor/startups/new">
              <Plus className="h-4 w-4" /> New Startup
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
            <StatCard title="Interests"        value={stats.interests}              icon={TrendingUp}  iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard title="Funding Progress" value={`${stats.fundingProgress}%`} icon={DollarSign}  iconBg="bg-amber-50"   iconColor="text-amber-600" />
            <StatCard title="Connections"      value={stats.connections}            icon={Users}       iconBg="bg-violet-50"  iconColor="text-violet-600" />
            <StatCard title="Startups"         value={myStartups.length}            icon={Lightbulb}   iconBg="bg-blue-50"    iconColor="text-blue-600" />
          </>)}
        </motion.div>

        {/* Three-column feed layout */}
        <motion.div variants={fade.item}>
          <DashboardFeedLayout
            left={
              <InventorStartupSidebar startups={myStartups} loading={loading} />
            }
            center={
              <DashboardFeed startups={feedStartups} />
            }
            right={
              <div className="space-y-4">
                {/* Investment Offers */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Investment Offers</h3>
                    <Link to="/inventor/investment-offers" className="text-[10px] font-medium text-primary hover:underline">View all</Link>
                  </div>
                  {loading ? (
                    <div className="p-3 space-y-2">{Array(3).fill(0).map((_, i) => <Skel key={i} h="h-12" />)}</div>
                  ) : investmentInterests.length === 0 ? (
                    <div className="flex flex-col items-center gap-1.5 py-8 text-center text-slate-400">
                      <DollarSign className="h-7 w-7 opacity-30" />
                      <p className="text-xs">No offers yet</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {investmentInterests.slice(0, 5).map(i => (
                        <div key={i.id} className="flex items-center gap-3 px-4 py-2.5">
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary overflow-hidden">
                            {i.photo ? <img src={i.photo} alt="" className="h-full w-full rounded-full object-cover" /> : (i.investorName || "I").charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-slate-800 truncate">{i.investorName}</p>
                            <p className="text-[10px] text-slate-400">${Number(i.offeredAmount).toLocaleString()}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${OFFER_STATUS[i.status] || "bg-slate-100 text-slate-600"}`}>
                            {i.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Quick Actions</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { icon: Plus,        label: "New Startup",   to: "/inventor/startups/new",             color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" },
                      { icon: Users,       label: "Team",          to: primaryStartup ? `/inventor/startups/${primaryStartup.id}/edit` : "/inventor/startups", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
                      { icon: FileText,    label: "Offers",        to: "/inventor/investment-offers",         color: "bg-violet-50 text-violet-700 hover:bg-violet-100" },
                      { icon: CheckCircle, label: "Verification",  to: "/inventor/startups/verify",           color: "bg-amber-50 text-amber-700 hover:bg-amber-100" },
                    ].map(a => (
                      <Link key={a.label} to={a.to} className={`flex flex-col items-center gap-1.5 rounded-xl p-3 text-center text-xs font-medium transition ${a.color}`}>
                        <a.icon className="h-4 w-4" />
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            }
          />
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
