import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageSquare, Menu, ChevronDown, User, Settings, LogOut } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import NotificationDropdown from "../notifications/NotificationDropdown";
import GlobalSearch from "../common/GlobalSearch";

export default function Navbar({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "U";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm sm:px-6">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="relative hidden sm:block w-64">
          <GlobalSearch inputClassName="w-64" />
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        <NotificationDropdown />
        {user?.role !== "admin" && (
          <Link
            to="/messages"
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
            aria-label="Messages"
          >
            <MessageSquare className="h-5 w-5" />
          </Link>
        )}

        {/* Profile dropdown */}
        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl px-2 py-1.5 hover:bg-slate-100 transition"
            aria-expanded={profileOpen}
            aria-haspopup="true"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {user?.profilePhoto
                ? <img src={user.profilePhoto} alt={fullName} className="h-full w-full rounded-full object-cover" />
                : initials}
            </div>
            <span className="hidden text-sm font-medium text-slate-700 sm:block">{fullName}</span>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {profileOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
              <div className="absolute right-0 z-20 mt-2 w-52 rounded-2xl border border-slate-100 bg-white py-2 shadow-xl shadow-slate-200/60">
                <div className="border-b border-slate-100 px-4 pb-2 pt-1">
                  <p className="text-sm font-semibold text-slate-900">{fullName}</p>
                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
                <Link to={`/profile/${user?.id}`} onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <User className="h-4 w-4" /> View Profile
                </Link>
                <Link to="/settings/profile" onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                  <Settings className="h-4 w-4" /> Edit Profile
                </Link>
                <div className="my-1 border-t border-slate-100" />
                <button type="button" onClick={handleLogout}
                  className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                  <LogOut className="h-4 w-4" /> Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
