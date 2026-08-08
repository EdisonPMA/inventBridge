import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import Button from "../common/Button";

const INDUSTRIES = [
  "Agriculture", "AI", "Biotech", "CleanTech", "EdTech", "Energy",
  "FinTech", "HealthTech", "Logistics", "Manufacturing", "Retail",
  "SaaS", "Social Impact", "Technology", "Tourism", "Other",
];

const STAGES = ["Idea", "Prototype", "MVP", "Early Stage", "Growth", "Scale"];

const SORTS = [
  { value: "newest",       label: "Newest" },
  { value: "oldest",       label: "Oldest" },
  { value: "funding_high", label: "Funding: High → Low" },
  { value: "funding_low",  label: "Funding: Low → High" },
];

/**
 * StartupFilters — collapsible filter panel for the discovery page.
 *
 * Props:
 *   filters         — current filter state object
 *   onFiltersChange — (partialFilters) => void — called when any filter changes
 *   onApply         — () => void — explicit apply button (optional; filters can be live)
 *   onClear         — () => void
 *   categories      — [{ id, name }]
 */
export default function StartupFilters({
  filters = {},
  onFiltersChange,
  onApply,
  onClear,
  categories = [],
}) {
  const [open, setOpen] = useState(false);

  function set(key, val) {
    onFiltersChange?.({ ...filters, [key]: val });
  }

  const hasActive = Object.values(filters).some((v) => v !== "" && v !== undefined);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 rounded-2xl transition"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-500" />
          Filters
          {hasActive && (
            <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-bold text-white">
              {Object.values(filters).filter((v) => v !== "" && v !== undefined).length}
            </span>
          )}
        </span>
        <span className="text-xs text-slate-400">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="border-t border-slate-100 p-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {/* Category */}
            {categories.length > 0 && (
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-category">
                  Category
                </label>
                <select
                  id="filter-category"
                  value={filters.category_id || ""}
                  onChange={(e) => set("category_id", e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Industry */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-industry">
                Industry
              </label>
              <select
                id="filter-industry"
                value={filters.industry || ""}
                onChange={(e) => set("industry", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Industries</option>
                {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-stage">
                Stage
              </label>
              <select
                id="filter-stage"
                value={filters.stage || ""}
                onChange={(e) => set("stage", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Stages</option>
                {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Verification */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-verification">
                Verification
              </label>
              <select
                id="filter-verification"
                value={filters.verificationStatus || ""}
                onChange={(e) => set("verificationStatus", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All</option>
                <option value="verified">Verified only</option>
                <option value="pending">Pending</option>
              </select>
            </div>

            {/* Country */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-country">
                Country
              </label>
              <input
                id="filter-country"
                type="text"
                placeholder="e.g. Rwanda"
                value={filters.country || ""}
                onChange={(e) => set("country", e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Min Funding */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-min">
                Min Funding ($)
              </label>
              <input
                id="filter-min"
                type="number"
                min="0"
                placeholder="e.g. 10000"
                value={filters.minFunding || ""}
                onChange={(e) => set("minFunding", e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Max Funding */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-max">
                Max Funding ($)
              </label>
              <input
                id="filter-max"
                type="number"
                min="0"
                placeholder="e.g. 500000"
                value={filters.maxFunding || ""}
                onChange={(e) => set("maxFunding", e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 px-3 text-sm text-slate-700 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            {/* Sort */}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600" htmlFor="filter-sort">
                Sort By
              </label>
              <select
                id="filter-sort"
                value={filters.sort || "newest"}
                onChange={(e) => set("sort", e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            {hasActive && (
              <button
                type="button"
                onClick={onClear}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700 transition"
              >
                <X className="h-3 w-3" /> Clear filters
              </button>
            )}
            {onApply && (
              <Button size="sm" onClick={onApply}>Apply Filters</Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
