import { motion } from "framer-motion";
import {
  Users, CheckCircle, FileText,
  TrendingUp, RefreshCw, AlertCircle, ArrowRight,
  Lightbulb, ShieldCheck, BarChart2, Compass,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout      from "../../components/dashboard/DashboardLayout";
import DashboardFeedLayout  from "../../components/dashboard/DashboardFeedLayout";
import DashboardFeed        from "../../components/dashboard/DashboardFeed";
import { OrgStartupSidebar } from "../../components/dashboard/StartupSidebar";
import StatCard  from "../../components/dashboard/StatCard";
import ChartCard from "../../components/dashboard/ChartCard";
import { useAuth } from "../../hooks/useAuth";
import { useApi  } from "../../hooks/useApi";
import { getOrganizationDashboard } from "../../services/dashboardApi";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } },
  item: { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } },
};

function Skel({ h = "h-24" }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${h}`} />;
}

export default function OrganizationDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(getOrganizationDashboard, []);

  const name         = user?.firstName || "Organization";
  const stats        = data?.stats        || {};
  const impactData   = data?.impactData   ?? [];
  const reports      = data?.reports      || {};
  const recentStartups = data?.recentStartups ?? [];

  const totalApps     = (data?.applications ?? []).length;
  const approvalRate  = totalApps > 0 ? Math.round(((stats.approved || 0) / totalApps) * 100) : 0;

  const quickActions = [
    { icon: ShieldCheck, label: "Applications",    sub: `${stats.applications || 0} pending`, to: "/organization/applications", color: "text-blue-600",   bg: "bg-blue-50 hover:bg-blue-100" },
    { icon: Lightbulb,   label: "Startups",        sub: `${reports.startupsInAcceleration || 0} in ecosystem`, to: "/organization/startups", color: "text-violet-600", bg: "bg-violet-50 hover:bg-violet-100" },
    { icon: Compass,     label: "Feed",            sub: "View community posts", to: "/feed",                    color: "text-emerald-600",  bg: "bg-emerald-50 hover:bg-emerald-100" },
  ];

  return (
    <DashboardLayout>
      <motion.div variants={stagger.container} initial="hidden" animate="visible" className="space-y-5">

        {/* Header */}
        <motion.div variants={stagger.item} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Home</p>
            <h1 className="text-xl font-bold text-slate-900">Welcome back, {name} 👋</h1>
            <p className="text-sm text-slate-500">Support and grow the startup ecosystem.</p>
          </div>
          <button onClick={refetch} title="Refresh"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {error && (
          <motion.div variants={stagger.item}
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
          </motion.div>
        )}

        {/* Stats strip — 4 real metrics */}
        <motion.div variants={stagger.item} className="grid gap-3 grid-cols-2 sm:grid-cols-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skel key={i} h="h-20" />) : (<>
            <StatCard title="Pending"   value={stats.applications || 0}  icon={FileText}    iconBg="bg-amber-50"   iconColor="text-amber-600" />
            <StatCard title="Approved"  value={stats.approved || 0}       icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard title="Rate"      value={`${approvalRate}%`}         icon={ShieldCheck} iconBg="bg-blue-50"    iconColor="text-blue-600" />
            <StatCard title="Network"   value={stats.mentorshipRequests || 0} icon={Users}  iconBg="bg-violet-50"  iconColor="text-violet-600" />
          </>)}
        </motion.div>

        {/* Three-column layout */}
        <motion.div variants={stagger.item}>
          <DashboardFeedLayout
            left={<OrgStartupSidebar startups={recentStartups} loading={loading} />}
            center={<DashboardFeed />}
            right={
              <div className="space-y-4">

                {/* Quick actions */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                  <p className="border-b border-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Quick Actions
                  </p>
                  <div className="p-2 space-y-1">
                    {quickActions.map(a => (
                      <button key={a.label} onClick={() => navigate(a.to)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${a.bg}`}>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/70 shadow-sm ${a.color}`}>
                          <a.icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold ${a.color}`}>{a.label}</p>
                          <p className="text-xs text-slate-500">{a.sub}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Verification summary — awareness only, no list */}
                <Link to="/organization/applications"
                  className="block rounded-2xl border border-slate-100 bg-white shadow-sm p-4 hover:border-blue-200 hover:shadow-md transition group">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-blue-600" />
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Verifications
                      </span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 group-hover:text-primary transition" />
                  </div>

                  {loading ? <Skel h="h-12" /> : (
                    <div className="flex items-center gap-4">
                      {/* Pending badge */}
                      <div className="flex-1 rounded-xl bg-amber-50 px-3 py-2.5 text-center">
                        <p className="text-xl font-bold text-amber-600">{stats.applications || 0}</p>
                        <p className="text-[10px] text-amber-500 font-medium">Pending</p>
                      </div>
                      {/* Approved badge */}
                      <div className="flex-1 rounded-xl bg-emerald-50 px-3 py-2.5 text-center">
                        <p className="text-xl font-bold text-emerald-600">{stats.approved || 0}</p>
                        <p className="text-[10px] text-emerald-500 font-medium">Approved</p>
                      </div>
                      {/* Approval rate */}
                      <div className="flex-1 rounded-xl bg-blue-50 px-3 py-2.5 text-center">
                        <p className="text-xl font-bold text-blue-600">{approvalRate}%</p>
                        <p className="text-[10px] text-blue-500 font-medium">Rate</p>
                      </div>
                    </div>
                  )}

                  {(stats.applications || 0) > 0 && (
                    <p className="mt-3 text-xs text-amber-600 font-medium">
                      {stats.applications} application{stats.applications !== 1 ? "s" : ""} waiting for review →
                    </p>
                  )}
                </Link>

                {/* Startup growth chart */}
                <div className="rounded-2xl border border-slate-100 bg-white shadow-sm p-4">
                  <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Startup Growth</h3>
                  {loading ? <Skel h="h-36" /> : (
                    <ChartCard
                      title="Startups Supported"
                      subtitle={`Q1–Q4 ${new Date().getFullYear()}`}
                      data={impactData.length ? impactData : [{ label: "Q1", value: 0 }]}
                      type="bar"
                      color="#7c3aed"
                    />
                  )}
                </div>

                {/* Impact summary */}
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                    <p className="text-sm font-semibold text-emerald-800">
                      {reports.startupsInAcceleration || 0} startups in ecosystem
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-emerald-600" />
                    <p className="text-xs text-emerald-700">
                      ${Number(reports.totalFundingFacilitated || 0).toLocaleString()} funding facilitated
                    </p>
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
