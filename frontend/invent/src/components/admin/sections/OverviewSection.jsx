import { RefreshCw, AlertCircle, Users, CheckCircle, UserX, Lightbulb, ShieldCheck, Clock, Flag, TrendingUp } from "lucide-react";
import StatCard from "../../dashboard/StatCard";
import ChartCard from "../../dashboard/ChartCard";
import { useApi } from "../../../hooks/useApi";
import { getAdminStats } from "../../../services/adminApi";
import { Skel } from "../adminShared";

export default function OverviewSection() {
  const { data: stats, loading, error, refetch } = useApi(getAdminStats, []);
  const tiles = [
    { title: "Total Users",          value: stats?.totalUsers ?? 0,           icon: Users,       iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
    { title: "Active Users",         value: stats?.activeUsers ?? 0,          icon: CheckCircle, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { title: "Suspended",            value: stats?.suspendedUsers ?? 0,       icon: UserX,       iconBg: "bg-red-50",     iconColor: "text-red-500" },
    { title: "Total Startups",       value: stats?.totalStartups ?? 0,        icon: Lightbulb,   iconBg: "bg-violet-50",  iconColor: "text-violet-600" },
    { title: "Verified Startups",    value: stats?.verifiedStartups ?? 0,     icon: ShieldCheck, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" },
    { title: "Pending Verification", value: stats?.pendingVerifications ?? 0, icon: Clock,       iconBg: "bg-amber-50",   iconColor: "text-amber-600" },
    { title: "Pending Reports",      value: stats?.pendingReports ?? 0,       icon: Flag,        iconBg: "bg-red-50",     iconColor: "text-red-500" },
    { title: "Active Offers",        value: stats?.activeOffers ?? 0,         icon: TrendingUp,  iconBg: "bg-blue-50",    iconColor: "text-blue-600" },
  ];
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">Platform Statistics</h2>
        <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition" title="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" /><span>{error}</span>
          <button onClick={refetch} className="ml-auto text-xs underline">Retry</button>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array(8).fill(0).map((_, i) => <Skel key={i} h="h-24" />)
          : tiles.map(t => <StatCard key={t.title} title={t.title} value={t.value} icon={t.icon} iconBg={t.iconBg} iconColor={t.iconColor} />)}
      </div>
      {stats && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Platform Counts" subtitle="Key metrics at a glance"
            data={[
              { label: "Users",    value: stats.totalUsers ?? 0 },
              { label: "Startups", value: stats.totalStartups ?? 0 },
              { label: "Investors",value: stats.totalInvestors ?? 0 },
              { label: "Offers",   value: stats.activeOffers ?? 0 },
              { label: "Reports",  value: stats.pendingReports ?? 0 },
            ]}
            type="bar" color="#2563eb" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {[
              { label: "Investors",        val: `${stats.totalInvestors ?? 0}`,  sub: `Verified: ${stats.verifiedInvestors ?? 0} · Pending: ${stats.pendingInvestors ?? 0}` },
              { label: "Investment Offers", val: `${stats.activeOffers ?? 0}`,   sub: `Accepted: ${stats.acceptedOffers ?? 0} · Rejected: ${stats.rejectedOffers ?? 0}` },
              { label: "Posts",            val: `${stats.totalPosts ?? 0}`,      sub: `Reported: ${stats.reportedPosts ?? 0}` },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
                <p className="text-xs font-medium text-slate-500 mb-1">{c.label}</p>
                <p className="text-2xl font-bold text-slate-900">{c.val}</p>
                <p className="mt-1 text-xs text-slate-400">{c.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
