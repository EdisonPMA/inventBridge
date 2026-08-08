import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import Button from "../common/Button";

const filters = ["All", "Startups", "Investors", "Organizations", "Mentors"];

export default function SearchSection() {
  const [active, setActive] = useState("All");

  return (
    <section className="border-b border-slate-100 bg-white py-6 shadow-sm">
      <div className="section-container">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search startups, investors, industries…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <Button variant="secondary" size="md">
            <SlidersHorizontal className="h-4 w-4" /> Filters
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setActive(f)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active === f
                  ? "bg-primary text-white"
                  : "border border-slate-200 text-slate-600 hover:border-primary hover:text-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
