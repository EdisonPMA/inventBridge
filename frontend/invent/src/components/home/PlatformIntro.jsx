import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, Users, Lock } from "lucide-react";
import Logo from "../common/Logo";
import { fetchPlatformStats } from "../../services/homeApi";

/* ── Animated counter ───────────────────────────── */
function Counter({ to, suffix = "" }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Run even if `to` is 0 — shows 0 explicitly and handles empty DB
    let cancelled = false;
    const target = Number(to) || 0;
    if (target === 0) { setCount(0); return; }

    const duration = 1400;
    const step     = 16;
    const steps    = Math.ceil(duration / step);
    let i = 0;
    const timer = setInterval(() => {
      if (cancelled) return;
      i++;
      setCount(Math.round((target * i) / steps));
      if (i >= steps) { setCount(target); clearInterval(timer); }
    }, step);

    return () => { cancelled = true; clearInterval(timer); };
  }, [to]); // re-fires when real value arrives after fetch

  return <span>{count}{suffix}</span>;
}

/* ── Feature cards data ─────────────────────────── */
const features = [
  {
    icon: ShieldCheck,
    title: "Verified Ecosystem",
    desc: "Connect with verified startups and investors you can trust.",
    color: "from-emerald-500 to-teal-500",
  },
  {
    icon: TrendingUp,
    title: "Startup Growth",
    desc: "Showcase your idea and attract the right funding.",
    color: "from-blue-500 to-indigo-500",
  },
  {
    icon: Users,
    title: "Professional Network",
    desc: "Build valuable business relationships across industries.",
    color: "from-violet-500 to-purple-500",
  },
  {
    icon: Lock,
    title: "Secure Collaboration",
    desc: "Protect your ideas with controlled access and verification.",
    color: "from-amber-500 to-orange-500",
  },
];

const DEFAULT_STATS = [
  { key: "startups",      suffix: "+", label: "Startups" },
  { key: "investors",     suffix: "+", label: "Investors" },
  { key: "organizations", suffix: "+", label: "Organizations" },
  { key: "industries",    suffix: "+", label: "Industries" },
];

/* ── SVG Illustration ───────────────────────────── */
function EcosystemIllustration() {
  return (
    <svg
      viewBox="0 0 480 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-lg opacity-90"
      aria-hidden="true"
      role="img"
    >
      {/* Background circles */}
      <circle cx="240" cy="160" r="120" fill="white" fillOpacity="0.04" />
      <circle cx="240" cy="160" r="80" fill="white" fillOpacity="0.06" />

      {/* Connection lines */}
      <line x1="240" y1="160" x2="120" y2="80" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="240" y1="160" x2="360" y2="80" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="240" y1="160" x2="100" y2="230" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="240" y1="160" x2="380" y2="240" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 4" />
      <line x1="240" y1="160" x2="240" y2="290" stroke="white" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="4 4" />

      {/* Center hub */}
      <circle cx="240" cy="160" r="36" fill="white" fillOpacity="0.15" />
      <circle cx="240" cy="160" r="28" fill="white" fillOpacity="0.2" />
      <text x="240" y="155" textAnchor="middle" fill="white" fontSize="11" fontWeight="700" fontFamily="system-ui">
        innovest
      </text>
      <text x="240" y="170" textAnchor="middle" fill="white" fillOpacity="0.8" fontSize="8" fontFamily="system-ui">
        ECOSYSTEM
      </text>

      {/* Node: Startup */}
      <circle cx="120" cy="80" r="28" fill="white" fillOpacity="0.15" />
      <circle cx="120" cy="80" r="20" fill="white" fillOpacity="0.18" />
      <text x="120" y="76" textAnchor="middle" fill="white" fontSize="14">💡</text>
      <text x="120" y="112" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="9" fontFamily="system-ui">Startups</text>

      {/* Node: Investor */}
      <circle cx="360" cy="80" r="28" fill="white" fillOpacity="0.15" />
      <circle cx="360" cy="80" r="20" fill="white" fillOpacity="0.18" />
      <text x="360" y="76" textAnchor="middle" fill="white" fontSize="14">📈</text>
      <text x="360" y="112" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="9" fontFamily="system-ui">Investors</text>

      {/* Node: Organizations */}
      <circle cx="100" cy="230" r="28" fill="white" fillOpacity="0.15" />
      <circle cx="100" cy="230" r="20" fill="white" fillOpacity="0.18" />
      <text x="100" y="226" textAnchor="middle" fill="white" fontSize="14">🏢</text>
      <text x="100" y="262" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="9" fontFamily="system-ui">Organizations</text>

      {/* Node: Mentors */}
      <circle cx="380" cy="240" r="28" fill="white" fillOpacity="0.15" />
      <circle cx="380" cy="240" r="20" fill="white" fillOpacity="0.18" />
      <text x="380" y="236" textAnchor="middle" fill="white" fontSize="14">🎓</text>
      <text x="380" y="272" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="9" fontFamily="system-ui">Mentors</text>

      {/* Node: Incubators */}
      <circle cx="240" cy="290" r="24" fill="white" fillOpacity="0.15" />
      <circle cx="240" cy="290" r="18" fill="white" fillOpacity="0.18" />
      <text x="240" y="286" textAnchor="middle" fill="white" fontSize="12">🚀</text>
      <text x="240" y="318" textAnchor="middle" fill="white" fillOpacity="0.85" fontSize="9" fontFamily="system-ui">Incubators</text>

      {/* Growth chart */}
      <g transform="translate(170, 200)">
        <polyline
          points="0,40 15,32 30,28 45,18 60,12 75,5"
          stroke="white"
          strokeOpacity="0.5"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="75" cy="5" r="3" fill="white" fillOpacity="0.8" />
      </g>
    </svg>
  );
}

/* ── Main component ─────────────────────────────── */
export default function PlatformIntro() {
  const [liveStats, setLiveStats] = useState(null);

  useEffect(() => {
    fetchPlatformStats()
      .then(setLiveStats)
      .catch(() => {}); // silently fall back to zeros; Counter starts at 0 anyway
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.12, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
  };

  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden px-8 py-10 lg:px-12 lg:py-14">
      {/* Gradient orbs */}
      <div className="pointer-events-none absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-20 -right-10 h-80 w-80 rounded-full bg-emerald-300/20 blur-3xl" />
      <div className="pointer-events-none absolute right-10 top-40 h-48 w-48 rounded-full bg-blue-300/10 blur-2xl" />

      <motion.div
        className="relative z-10 flex flex-col gap-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Logo */}
        <motion.div variants={itemVariants} className="flex items-center">
          <Logo size="md" variant="dark" showText={true} />
        </motion.div>

        {/* Slogan + heading */}
        <motion.div variants={itemVariants}>
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-emerald-300">
            Connecting Innovation with Investment
          </p>
          <h1 className="text-3xl font-bold leading-tight text-white lg:text-4xl xl:text-[2.6rem]">
            Where Innovation
            <br />
            <span className="bg-gradient-to-r from-emerald-300 to-teal-200 bg-clip-text text-transparent">
              Meets Opportunity
            </span>
          </h1>
          <p className="mt-4 max-w-md text-base leading-relaxed text-white/70">
            Innovest unites <strong className="text-white/90">inventors</strong>,{" "}
            <strong className="text-white/90">startups</strong>,{" "}
            <strong className="text-white/90">investors</strong>,{" "}
            <strong className="text-white/90">mentors</strong>, and{" "}
            <strong className="text-white/90">organizations</strong> into one trusted ecosystem built for growth.
          </p>
        </motion.div>

        {/* Illustration */}
        <motion.div variants={itemVariants} className="flex justify-center">
          <EcosystemIllustration />
        </motion.div>

        {/* Feature cards */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-2.5 rounded-xl border border-white/10 bg-white/8 p-3 backdrop-blur-sm"
            >
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br ${f.color}`}>
                <f.icon className="h-4 w-4 text-white" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{f.title}</p>
                <p className="mt-0.5 text-xs leading-relaxed text-white/60">{f.desc}</p>
              </div>
            </div>
          ))}
        </motion.div>

        {/* Stats */}
        <motion.div variants={itemVariants}>
          <div className="grid grid-cols-4 gap-3 rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur-sm">
            {DEFAULT_STATS.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-xl font-bold text-white lg:text-2xl">
                  {liveStats === null
                    ? <span className="inline-block h-6 w-8 animate-pulse rounded bg-white/20 align-middle" />
                    : <Counter to={Number(liveStats[s.key]) || 0} suffix={s.suffix} />}
                </p>
                <p className="mt-0.5 text-xs text-white/60">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
