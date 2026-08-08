/**
 * OrgPrograms — Organization's activity & impact hub.
 */
import { useNavigate } from "react-router-dom";
import {
  BookOpen, RefreshCw, AlertCircle, TrendingUp, Users,
  CheckCircle, BarChart2, Lightbulb, ShieldCheck, ArrowRight, Compass,
} from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StatCard  from "../../components/dashboard/StatCard";
import ChartCard from "../../components/dashboard/ChartCard";
import { useApi } from "../../hooks/useApi";
import { getOrganizationDashboard } from "../../services/dashboardApi";

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } },
  item: { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};
function Skel({ h = "h-24" }) { return <div className={`animate-pulse rounded-2xl bg-slate-100 ${h}`} />; }

export default function OrgPrograms() {
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useApi(getOrganizationDashboard, []);

  const stats      = data?.stats      || {};
  const reports    = data?.reports    || {};
  const impactData = data?.impactData ?? [];
  const recentStartups = data?.recentStartups ?? [];
  const applications   = data?.applications   ?? [];

  const pendingCount   = stats.applications || 0;
  const approvedCount  = stats.approved || 0;
  const totalReviewed  = applications.length;
  const approvalRate   = totalReviewed > 0 ? Math.round((approvedCount / totalReviewed) * 100) : 0;
  const fundingK       = Math.round((Number(reports.totalFundingFacilitated) || 0) / 1000);

  const quickActions = [
    {
      icon: ShieldCheck, label: "Review Applications",
      sub: `${pendingCount} pending`, to: "/organization/applications",
      color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
    },
    {
      icon: Lightbulb, label: "Browse Startups",
      sub: `${reports.startupsInAcceleration ?? 0} in ecosystem`, to: "/organization/startups",
      color: "bg-violet-50 text-violet-700 hover:bg-violet-100",
    },
    {
      icon: Compass, label: "View Feed",
      sub: "Community posts", to: "/feed",
      color: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
  ];

  return (
    <DashboardLayout>
      <motion.div variants={stagger.container} initial="hidden" animate="visible" className="max-w-6xl space-y-6">

        {/* Header */}
        <motion.div variants={stagger.item} className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Organization</p>
            <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <BookOpen className="h-5 w-5 text-violet-600" />
              Programs & Impact
            </h1>
            <p className="text-sm text-slate-500">Your organization's ecosystem contribution.</p>
          </div>
          <button onClick={refetch} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </motion.div>

        {error && (
          <motion.div variants={stagger.item}
            className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{error}
            <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
          </motion.div>
        )}

        {/* Stats — 4 meaningful metrics */}
        <motion.div variants={stagger.item} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading ? Array(4).fill(0).map((_, i) => <Skel key={i} />) : (<>
            <StatCard title="Verified"           value={approvedCount}                      icon={CheckCircle} iconBg="bg-emerald-50" iconColor="text-emerald-600" />
            <StatCard title="Pending Review"     value={pendingCount}                       icon={ShieldCheck} iconBg="bg-amber-50"   iconColor="text-amber-600" />
            <StatCard title="Approval Rate"      value={`${approvalRate}%`}                 icon={TrendingUp}  iconBg="bg-blue-50"    iconColor="text-blue-600" />
            <StatCard title="Funding Facilitated" value={`$${fundingK}K`}                  icon={BarChart2}   iconBg="bg-violet-50"  iconColor="text-violet-600" />
          </>)}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Startup growth chart */}
          <motion.div variants={stagger.item} className="rounded-2xl border border-slate-100 bg-white shadow-sm p-5">
            <h2 className="mb-1 font-semibold text-slate-800">Startup Growth This Year</h2>
            <p className="mb-4 text-xs text-slate-400">Startups entering ecosystem by quarter</p>
            {loading ? <Skel h="h-48" /> : (
              <ChartCard
                title="Startups Supported"
                subtitle={`Q1–Q4 ${new Date().getFullYear()}`}
                data={impactData.length ? impactData : [{ label: "Q1", value: 0 }]}
                type="bar"
                color="#7c3aed"
              />
            )}
          </motion.div>

          {/* Impact KPIs — only real data */}
          <motion.div variants={stagger.item} className="space-y-3">
            <h2 className="font-semibold text-slate-800">Impact Metrics</h2>
            {loading ? Array(3).fill(0).map((_, i) => <Skel key={i} h="h-16" />) : ([
              {
                icon: Lightbulb, label: "Startups in ecosystem",
                value: (reports.startupsInAcceleration ?? 0).toLocaleString(),
                color: "bg-violet-50 text-violet-600",
              },
              {
                icon: BarChart2, label: "Total funding facilitated",
                value: `$${fundingK}K`,
                color: "bg-blue-50 text-blue-600",
              },
              {
                icon: CheckCircle, label: "Approval rate (all-time)",
                value: `${approvalRate}%`,
                color: "bg-emerald-50 text-emerald-600",
              },
            ].map(m => (
              <div key={m.label} className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${m.color}`}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-slate-500">{m.label}</p>
                  <p className="text-lg font-bold text-slate-900">{m.value}</p>
                </div>
              </div>
            )))}
          </motion.div>
        </div>

        {/* Quick actions */}
        <motion.div variants={stagger.item}>
          <h2 className="mb-3 font-semibold text-slate-800">Quick Actions</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {quickActions.map(a => (
              <button key={a.label} onClick={() => navigate(a.to)}
                className={`flex items-center gap-4 rounded-2xl p-4 text-left transition ${a.color}`}>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/60 shadow-sm">
                  <a.icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{a.label}</p>
                  <p className="text-xs opacity-70">{a.sub}</p>
                </div>
                <ArrowRight className="h-4 w-4 opacity-50 shrink-0" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* Recent startups */}
        {(loading || recentStartups.length > 0) && (
          <motion.div variants={stagger.item}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-slate-800">Recently Added Startups</h2>
              <button onClick={() => navigate("/organization/startups")}
                className="text-xs text-primary hover:underline">View all →</button>
            </div>
            {loading ? <Skel h="h-40" /> : (
              <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs">
                      <th className="px-4 py-3 font-medium text-slate-500">Startup</th>
                      <th className="hidden sm:table-cell px-4 py-3 font-medium text-slate-500">Industry</th>
                      <th className="hidden sm:table-cell px-4 py-3 font-medium text-slate-500">Stage</th>
                      <th className="px-4 py-3 font-medium text-slate-500">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {recentStartups.slice(0, 6).map(s => (
                      <tr key={s.id} className="hover:bg-slate-50 cursor-pointer transition"
                        onClick={() => navigate(`/startups/${s.slug || s.id}`)}>
                        <td className="px-4 py-3 font-medium text-slate-800">{s.name}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-xs text-slate-500">{s.industry || "—"}</td>
                        <td className="hidden sm:table-cell px-4 py-3 text-xs text-slate-500 capitalize">{s.stage || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${
                            s.verificationStatus === "verified"  ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            s.verificationStatus === "pending"   ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-slate-100 text-slate-500 border-slate-200"
                          }`}>{s.verificationStatus || "draft"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}

      </motion.div>
    </DashboardLayout>
  );
}
