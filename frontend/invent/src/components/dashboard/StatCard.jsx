import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

/**
 * @param {string}  title
 * @param {string|number} value
 * @param {string}  subtitle      - small text below the value
 * @param {React.ElementType} icon
 * @param {string}  iconBg        - Tailwind bg class e.g. "bg-blue-100"
 * @param {string}  iconColor     - Tailwind text class e.g. "text-blue-600"
 * @param {number}  trend         - % change, optional
 */
export default function StatCard({ title, value, subtitle, icon: Icon, iconBg = "bg-primary-light", iconColor = "text-primary", trend }) {
  const trendPositive = trend > 0;
  const trendNeutral = trend === 0 || trend == null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100"
    >
      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-6 w-6 ${iconColor}`} aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="mt-0.5 text-2xl font-bold text-slate-900">{value}</p>
        {(subtitle || trend != null) && (
          <div className="mt-1 flex items-center gap-1.5">
            {trend != null && !trendNeutral && (
              <span className={`flex items-center gap-0.5 text-xs font-medium ${trendPositive ? "text-emerald-600" : "text-red-500"}`}>
                {trendPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {Math.abs(trend)}%
              </span>
            )}
            {trend != null && trendNeutral && <Minus className="h-3 w-3 text-slate-400" />}
            {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
}
