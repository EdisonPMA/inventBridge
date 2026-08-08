import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Lightbulb, TrendingUp, Users,
  Building2, Settings, LogOut, ChevronRight, X, Shield,
  FileText, Briefcase, BookOpen, BarChart2, Plus,
  MessageSquare, Bell, Compass, Heart, Flag, UserX, LayoutList, Archive,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Logo from "../common/Logo";

const navByRole = {
  inventor: [
    { label: "Home",                to: "/inventor/dashboard",          icon: LayoutDashboard },
    { label: "My Startups",         to: "/inventor/startups",           icon: Lightbulb },
    { label: "Create Startup",      to: "/inventor/startups/new",       icon: Plus },
    { label: "Investment Offers",   to: "/inventor/investment-offers",  icon: Briefcase },
    { label: "Verification",        to: "/inventor/startups/verify",    icon: Shield },
    { label: "Discover People",     to: "/network",                     icon: Users },
    { label: "Feed",                to: "/feed",                        icon: Compass },
    { label: "Post History",        to: "/feed/history",                icon: Archive },
    { label: "Messages",            to: "/messages",                    icon: MessageSquare },
    { label: "Notifications",       to: "/notifications",               icon: Bell },
  ],
  investor: [
    { label: "Home",                to: "/investor/dashboard",          icon: LayoutDashboard },
    { label: "Discover Startups",   to: "/discover",                    icon: Compass },
    { label: "My Investments",      to: "/investor/investments",        icon: Briefcase },
    { label: "Saved Startups",      to: "/investor/saved",              icon: BookOpen },
    { label: "Following",           to: "/investor/following",          icon: Heart },
    { label: "My Verification",     to: "/investor/verification",       icon: Shield },
    { label: "Discover People",     to: "/network",                     icon: Users },
    { label: "Feed",                to: "/feed",                        icon: TrendingUp },
    { label: "Post History",        to: "/feed/history",                icon: Archive },
    { label: "Messages",            to: "/messages",                    icon: MessageSquare },
    { label: "Notifications",       to: "/notifications",               icon: Bell },
  ],
  organization: [
    { label: "Home",                to: "/organization/dashboard",      icon: LayoutDashboard },
    { label: "Programs",            to: "/organization/programs",       icon: BookOpen },
    { label: "Applications",        to: "/organization/applications",   icon: FileText },
    { label: "Startups",            to: "/organization/startups",       icon: Lightbulb },
    { label: "Feed",                to: "/feed",                        icon: TrendingUp },
    { label: "Post History",        to: "/feed/history",                icon: Archive },
    { label: "Discover People",     to: "/network",                     icon: Users },
    { label: "Messages",            to: "/messages",                    icon: MessageSquare },
    { label: "Notifications",       to: "/notifications",               icon: Bell },
    { label: "Reports",             to: "/organization/reports",        icon: BarChart2 },
  ],
  admin: [
    { label: "Home",                to: "/admin/dashboard",             icon: LayoutDashboard },
    { label: "Users",               to: "/admin/users",                 icon: Users },
    { label: "Startups",            to: "/admin/startups",              icon: Lightbulb },
    { label: "Investors",           to: "/admin/investors",             icon: Briefcase },
    { label: "Verifications",       to: "/admin/verifications",         icon: Shield },
    { label: "Categories",          to: "/admin/categories",            icon: LayoutList },
    { label: "Reports",             to: "/admin/reports",               icon: Flag },
    { label: "Posts",               to: "/admin/posts",                 icon: FileText },
    { label: "Investments",         to: "/admin/investments",           icon: BarChart2 },
    { label: "Suspended",           to: "/admin/suspended",             icon: UserX },
    { label: "Audit Logs",          to: "/admin/audit-logs",            icon: BookOpen },
  ],
};

const roleLabel = { inventor: "Inventor", investor: "Investor", organization: "Organization", admin: "Admin" };
const roleColor = {
  inventor: "bg-emerald-100 text-emerald-700",
  investor: "bg-blue-100 text-blue-700",
  organization: "bg-violet-100 text-violet-700",
  admin: "bg-red-100 text-red-700",
};

export default function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const role = (user?.role || "inventor").toLowerCase();
  const navItems = navByRole[role] || navByRole.inventor;

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center justify-between border-b border-slate-700/60 px-5 py-4">
        <Link to="/" className="flex items-center">
          <Logo size="sm" variant="dark" />
        </Link>
        <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-700 hover:text-white lg:hidden" aria-label="Close sidebar">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* User profile */}
      <div className="border-b border-slate-700/60 px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold">
            {user?.profilePhoto
              ? <img src={user.profilePhoto} alt={fullName} className="h-full w-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{fullName}</p>
            <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${roleColor[role] || roleColor.inventor}`}>
              {roleLabel[role] || role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Dashboard navigation">
        <ul className="space-y-1">
          {navItems.map((item) => {
            // Items with no `to` are section labels (e.g. verification divider placeholder)
            if (!item.to) return null;
            const active = location.pathname === item.to;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                    active
                      ? "bg-primary text-white shadow-sm"
                      : "text-slate-300 hover:bg-slate-700/60 hover:text-white"
                  }`}
                >
                  <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {active && <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom actions */}
      <div className="border-t border-slate-700/60 px-3 py-4 space-y-1">
        <Link to="/settings/profile" onClick={onClose}
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-slate-700/60 hover:text-white transition-all">
          <Settings className="h-4 w-4" /> Edit Profile
        </Link>
        <button onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 hover:bg-red-500/10 hover:text-red-400 transition-all">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 lg:block">{sidebarContent}</aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: "tween", duration: 0.25 }}
              className="fixed left-0 top-0 z-50 h-full w-64 lg:hidden"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
