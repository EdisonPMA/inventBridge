import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";
import PlatformIntro from "../components/home/PlatformIntro";
import LoginForm from "../components/home/LoginForm";
import RegisterForm from "../components/home/RegisterForm";
import TrustFeatures from "../components/home/TrustFeatures";
import Logo from "../components/common/Logo";

const tabVariants = {
  enter: (dir) => ({
    x: dir > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut" },
  },
  exit: (dir) => ({
    x: dir > 0 ? -40 : 40,
    opacity: 0,
    transition: { duration: 0.2, ease: "easeIn" },
  }),
};

export default function AuthPage() {
  const [tab, setTab] = useState("login"); // "login" | "signup"
  const [dir, setDir] = useState(1);

  const switchTab = (next) => {
    setDir(next === "signup" ? 1 : -1);
    setTab(next);
  };

  return (
    <div className="flex min-h-screen w-full bg-slate-50">
      {/* ── Left: Platform intro ─────────────── */}
      <div
        className="relative hidden w-[52%] flex-col bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900 lg:flex"
        aria-hidden="false"
      >
        <PlatformIntro />
      </div>

      {/* ── Right: Auth card ─────────────────── */}
      <div className="flex flex-1 items-center justify-center overflow-y-auto px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          {/* Mobile logo (hidden on desktop) */}
          <div className="mb-8 flex flex-col items-center gap-2 lg:hidden">
            <Logo size="lg" variant="light" />
            <p className="text-sm text-slate-500">Connecting Innovation with Investment</p>
          </div>

          {/* Card */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-200/60">
            {/* Card header */}
            <div className="border-b border-slate-100 px-6 pt-6 pb-0 sm:px-8">
              <h2 className="text-lg font-bold text-slate-900">
                {tab === "login" ? "Welcome back" : "Join Innovest"}
              </h2>
              <p className="mt-1 mb-4 text-sm text-slate-500">
                {tab === "login"
                  ? "Sign in to continue to your account."
                  : "Create your account and start building."}
              </p>

              {/* Tabs */}
              <div
                className="relative flex rounded-lg bg-slate-100 p-1"
                role="tablist"
                aria-label="Authentication options"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "login"}
                  id="tab-login"
                  aria-controls="panel-login"
                  onClick={() => switchTab("login")}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === "login"
                      ? "bg-white text-primary shadow-sm shadow-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <LogIn className="h-4 w-4" aria-hidden="true" />
                  Sign In
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === "signup"}
                  id="tab-signup"
                  aria-controls="panel-signup"
                  onClick={() => switchTab("signup")}
                  className={`relative z-10 flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                    tab === "signup"
                      ? "bg-white text-primary shadow-sm shadow-slate-200"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Create Account
                </button>
              </div>
            </div>

            {/* Card body with animated form transition */}
            <div className="overflow-hidden px-6 py-6 sm:px-8">
              <AnimatePresence custom={dir} mode="wait">
                {tab === "login" ? (
                  <motion.div
                    key="login"
                    id="panel-login"
                    role="tabpanel"
                    aria-labelledby="tab-login"
                    custom={dir}
                    variants={tabVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <LoginForm onSwitchToSignup={() => switchTab("signup")} />
                  </motion.div>
                ) : (
                  <motion.div
                    key="signup"
                    id="panel-signup"
                    role="tabpanel"
                    aria-labelledby="tab-signup"
                    custom={dir}
                    variants={tabVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                  >
                    <RegisterForm onSwitchToLogin={() => switchTab("login")} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Trust section */}
            <div className="border-t border-slate-100 px-6 pb-6 sm:px-8">
              <TrustFeatures />
            </div>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-slate-400">
            © {new Date().getFullYear()} Innovest. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
