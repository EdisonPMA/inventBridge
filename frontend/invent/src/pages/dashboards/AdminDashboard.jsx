/**
 * AdminDashboard — thin routing shell.
 * All section logic lives in components/admin/sections/.
 * Shared UI primitives live in components/admin/adminShared.jsx.
 */
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard, Users, Lightbulb, Briefcase, ShieldCheck,
  Flag, FileText, TrendingUp, UserX, Book, Tag, Layers,
} from "lucide-react";
import DashboardLayout  from "../../components/dashboard/DashboardLayout";
import { useAuth }      from "../../hooks/useAuth";

import OverviewSection     from "../../components/admin/sections/OverviewSection";
import UsersSection        from "../../components/admin/sections/UsersSection";
import StartupsSection     from "../../components/admin/sections/StartupsSection";
import InvestorsSection    from "../../components/admin/sections/InvestorsSection";
import VerificationSection from "../../components/admin/sections/VerificationSection";
import CategoriesSection   from "../../components/admin/sections/CategoriesSection";
import IndustriesSection   from "../../components/admin/sections/IndustriesSection";
import ReportsSection      from "../../components/admin/sections/ReportsSection";
import PostsSection        from "../../components/admin/sections/PostsSection";
import InvestmentsSection  from "../../components/admin/sections/InvestmentsSection";
import SuspendedSection    from "../../components/admin/sections/SuspendedSection";
import AuditSection        from "../../components/admin/sections/AuditSection";

// ── Nav config ───────────────────────────────────────────────────────────────
const NAV = [
  { key: "overview",     label: "Overview",     icon: LayoutDashboard },
  { key: "users",        label: "Users",        icon: Users },
  { key: "startups",     label: "Startups",     icon: Lightbulb },
  { key: "investors",    label: "Investors",    icon: Briefcase },
  { key: "verification", label: "Verification", icon: ShieldCheck },
  { key: "categories",   label: "Categories",   icon: Tag },
  { key: "industries",   label: "Industries",   icon: Layers },
  { key: "reports",      label: "Reports",      icon: Flag },
  { key: "posts",        label: "Posts",        icon: FileText },
  { key: "investments",  label: "Investments",  icon: TrendingUp },
  { key: "suspended",    label: "Suspended",    icon: UserX },
  { key: "audit",        label: "Audit Logs",   icon: Book },
];

const PATH_TO_TAB = {
  "/admin/dashboard":     "overview",
  "/admin/users":         "users",
  "/admin/startups":      "startups",
  "/admin/investors":     "investors",
  "/admin/verifications": "verification",
  "/admin/categories":    "categories",
  "/admin/industries":    "industries",
  "/admin/reports":       "reports",
  "/admin/posts":         "posts",
  "/admin/investments":   "investments",
  "/admin/suspended":     "suspended",
  "/admin/audit-logs":    "audit",
};

const TAB_TO_PATH = Object.fromEntries(
  Object.entries(PATH_TO_TAB).map(([k, v]) => [v, k])
);

// ── Section map (stable reference — defined outside component) ───────────────
const SECTIONS = {
  overview:     <OverviewSection />,
  users:        <UsersSection />,
  startups:     <StartupsSection />,
  investors:    <InvestorsSection />,
  verification: <VerificationSection />,
  categories:   <CategoriesSection />,
  industries:   <IndustriesSection />,
  reports:      <ReportsSection />,
  posts:        <PostsSection />,
  investments:  <InvestmentsSection />,
  suspended:    <SuspendedSection />,
  audit:        <AuditSection />,
};

const stagger = {
  container: { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } },
  item:      { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } },
};

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ active, onChange }) {
  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-sm">
      {NAV.map(({ key, label, icon: Icon }) => (
        <button key={key} onClick={() => onChange(key)}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition ${
            active === key
              ? "bg-blue-600 text-white shadow"
              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
          }`}>
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const { user }  = useAuth();
  const location  = useLocation();
  const navigate  = useNavigate();
  const firstName = user?.firstName || "Admin";

  const tab = useMemo(
    () => PATH_TO_TAB[location.pathname] || "overview",
    [location.pathname]
  );

  const handleTabChange = (key) => {
    navigate(TAB_TO_PATH[key] || "/admin/dashboard", { replace: true });
  };

  return (
    <DashboardLayout>
      <motion.div
        variants={stagger.container}
        initial="hidden"
        animate="visible"
        className="max-w-7xl space-y-0"
      >
        <motion.div variants={stagger.item} className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Home</p>
            <h1 className="text-2xl font-bold text-slate-900">Welcome back, {firstName} 👋</h1>
            <p className="mt-1 text-sm text-slate-500">Manage and moderate the Innovest platform.</p>
          </div>
        </motion.div>

        <motion.div variants={stagger.item}>
          <TabBar active={tab} onChange={handleTabChange} />
        </motion.div>

        <motion.div key={tab} variants={stagger.item} initial="hidden" animate="visible">
          {SECTIONS[tab]}
        </motion.div>
      </motion.div>
    </DashboardLayout>
  );
}
