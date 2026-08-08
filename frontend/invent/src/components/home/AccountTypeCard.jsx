import { motion } from "framer-motion";

export default function AccountTypeCard({ icon: Icon, title, description, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`relative flex w-full cursor-pointer flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 ${
        selected
          ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
          : "border-slate-200 bg-white hover:border-primary/40 hover:bg-slate-50"
      }`}
      aria-pressed={selected}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-lg ${
          selected ? "bg-primary text-white" : "bg-slate-100 text-slate-500"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <span className={`text-sm font-semibold ${selected ? "text-primary" : "text-slate-800"}`}>{title}</span>
      <span className="text-xs leading-relaxed text-slate-500">{description}</span>
      {selected && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white">
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
    </motion.button>
  );
}
