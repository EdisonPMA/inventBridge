import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, ShieldCheck, TrendingUp, Users } from "lucide-react";
import Button from "../common/Button";

const badges = [
  { icon: ShieldCheck, label: "Verified Ecosystem" },
  { icon: TrendingUp, label: "500+ Startups" },
  { icon: Users, label: "200+ Investors" },
];

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-light via-white to-slate-50 py-20 md:py-28">
      {/* Background orb */}
      <div className="pointer-events-none absolute -right-40 -top-40 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl" />

      <div className="section-container grid items-center gap-12 lg:grid-cols-2">
        {/* Left copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            The Trusted Startup Ecosystem
          </span>

          <h1 className="text-4xl font-bold leading-tight text-slate-900 md:text-5xl lg:text-[3.25rem]">
            Where Innovation
            <span className="block text-primary">Meets Opportunity</span>
          </h1>

          <p className="mt-6 max-w-lg text-lg leading-relaxed text-slate-600">
            Innovest connects inventors, startups, investors, mentors, and organizations
            into one verified ecosystem built for growth.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="lg" as={Link} to="/">
              Join Innovest <ArrowRight className="h-4 w-4" />
            </Button>
            <Button variant="secondary" size="lg" as={Link} to="/home#explore">
              Explore Startups
            </Button>
          </div>

          {/* Trust badges */}
          <div className="mt-8 flex flex-wrap gap-3">
            {badges.map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
                <b.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                {b.label}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right: SVG illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center"
        >
          <svg viewBox="0 0 520 400" fill="none" xmlns="http://www.w3.org/2000/svg"
            className="w-full max-w-lg drop-shadow-2xl" aria-hidden="true">
            {/* Card background */}
            <rect x="20" y="20" width="480" height="360" rx="24" fill="white" stroke="#e2e8f0" strokeWidth="1.5" />
            {/* Header bar */}
            <rect x="20" y="20" width="480" height="60" rx="24" fill="#f0fdf4" />
            <rect x="20" y="56" width="480" height="24" fill="#f0fdf4" />
            {/* Dots */}
            <circle cx="54" cy="50" r="7" fill="#16a34a" />
            <circle cx="76" cy="50" r="7" fill="#fbbf24" />
            <circle cx="98" cy="50" r="7" fill="#ef4444" />
            <text x="130" y="55" fill="#16a34a" fontSize="14" fontWeight="700" fontFamily="system-ui">Innovest Dashboard</text>

            {/* Stat cards */}
            {[
              { x: 44, label: "Startups", value: "500+", color: "#16a34a", bg: "#f0fdf4" },
              { x: 184, label: "Investors", value: "200+", color: "#2563eb", bg: "#eff6ff" },
              { x: 324, label: "Funded", value: "$12M", color: "#7c3aed", bg: "#f5f3ff" },
            ].map((s) => (
              <g key={s.label}>
                <rect x={s.x} y="100" width="116" height="70" rx="12" fill={s.bg} />
                <text x={s.x + 12} y="128" fill={s.color} fontSize="20" fontWeight="800" fontFamily="system-ui">{s.value}</text>
                <text x={s.x + 12} y="150" fill="#64748b" fontSize="11" fontFamily="system-ui">{s.label}</text>
              </g>
            ))}

            {/* Chart area */}
            <rect x="44" y="190" width="432" height="100" rx="12" fill="#f8fafc" />
            <polyline
              points="64,270 130,240 196,255 262,220 328,230 394,200 460,210"
              stroke="#16a34a" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
            />
            <polyline
              points="64,270 130,240 196,255 262,220 328,230 394,200 460,210 460,280 64,280"
              fill="#16a34a" fillOpacity="0.08"
            />
            {[64, 130, 196, 262, 328, 394, 460].map((cx, i) => {
              const ys = [270, 240, 255, 220, 230, 200, 210];
              return <circle key={cx} cx={cx} cy={ys[i]} r="4" fill="#16a34a" />;
            })}
            <text x="56" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">Jan</text>
            <text x="122" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">Feb</text>
            <text x="188" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">Mar</text>
            <text x="254" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">Apr</text>
            <text x="320" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">May</text>
            <text x="386" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">Jun</text>
            <text x="452" y="308" fill="#94a3b8" fontSize="10" fontFamily="system-ui">Jul</text>

            {/* Bottom verified badge */}
            <rect x="44" y="330" width="160" height="34" rx="10" fill="#f0fdf4" stroke="#bbf7d0" strokeWidth="1" />
            <text x="64" y="352" fill="#16a34a" fontSize="11" fontWeight="600" fontFamily="system-ui">✓ Verified Ecosystem</text>

            {/* Activity pill */}
            <rect x="230" y="330" width="246" height="34" rx="10" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="1" />
            <text x="248" y="352" fill="#2563eb" fontSize="11" fontWeight="600" fontFamily="system-ui">🔴 Live · 24 investors online</text>
          </svg>
        </motion.div>
      </div>
    </section>
  );
}
