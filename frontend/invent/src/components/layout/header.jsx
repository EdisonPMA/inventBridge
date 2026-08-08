import { useState } from "react";
import { Link } from "react-router-dom";
import HashLink from "../common/HashLink";
import {
  Bell, ChevronDown, LogIn, Menu, MessageSquare,
  User, X,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import Button from "../common/Button";
import { getDashboardRoute } from "../../services/dashboardApi";
import GlobalSearch from "../common/GlobalSearch";
import Logo from "../common/Logo";

const navLinks = [
  { to: "/home", label: "Home" },
  { to: "/home#explore", label: "Explore Startups" },
  { to: "/home#investors", label: "Investors" },
  { to: "/home#organizations", label: "Organizations" },
  { to: "/home#about", label: "About" },
  { to: "/home#contact", label: "Contact" },
];

const navLinkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? "bg-primary-light text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-primary"
  }`;

export default function Header() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = [user?.firstName, user?.lastName]
    .filter(Boolean).map((n) => n[0]).join("").toUpperCase() || "U";
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "User";
  const dashboardRoute = user?.role ? getDashboardRoute(user.role) : "/";

  return (
    <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/90 backdrop-blur-md">
      <div className="section-container flex h-16 items-center justify-between gap-4 lg:h-[4.5rem]">
        <Link to={isAuthenticated ? dashboardRoute : "/"} className="flex shrink-0 items-center" aria-label="InventBridge home">
          <Logo size="md" variant="light" />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <HashLink key={link.label} to={link.to} className={navLinkClass} end={link.to === "/home"}>
              {link.label}
            </HashLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {isAuthenticated ? (
            <>
              <div className="relative hidden xl:block w-56">
                <GlobalSearch inputClassName="w-56" />
              </div>
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary" aria-label="Notifications">
                <Bell className="h-5 w-5" />
              </button>
              <button type="button" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-primary" aria-label="Messages">
                <MessageSquare className="h-5 w-5" />
              </button>
              <div className="relative">
                <button type="button" onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100"
                  aria-expanded={profileOpen} aria-haspopup="true">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                    {initials}
                  </div>
                  <ChevronDown className="h-4 w-4 text-slate-500" />
                </button>
                {profileOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setProfileOpen(false)} />
                    <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                      <p className="px-4 py-2 text-xs text-slate-400">{fullName}</p>
                      <Link to={dashboardRoute} onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                        <User className="h-4 w-4" /> Dashboard
                      </Link>
                      <button type="button" onClick={logout}
                        className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" as={Link} to="/"><LogIn className="h-4 w-4" /> Login</Button>
              <Button size="sm" as={Link} to="/?tab=signup">Get Started</Button>
            </>
          )}
        </div>

        <button type="button" className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          onClick={() => setMobileOpen((v) => !v)} aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-4 lg:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile navigation">
            {navLinks.map((link) => (
              <HashLink key={link.label} to={link.to} className={navLinkClass}
                onClick={() => setMobileOpen(false)} end={link.to === "/home"}>
                {link.label}
              </HashLink>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4">
            {!isAuthenticated ? (
              <>
                <Button variant="ghost" as={Link} to="/" onClick={() => setMobileOpen(false)}>Login</Button>
                <Button as={Link} to="/?tab=signup" onClick={() => setMobileOpen(false)}>Get Started</Button>
              </>
            ) : (
              <Button variant="secondary" onClick={logout}>Log out</Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
