import { Link } from "react-router-dom";
import SectionHeader from "../common/SectionHeader";
import { Leaf, HeartPulse, DollarSign, Cpu, Zap, GraduationCap, Globe, Factory } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { fetchCategories } from "../../services/homeApi";

const iconMap = {
  agriculture: Leaf,
  healthcare:  HeartPulse,
  fintech:     DollarSign,
  ai:          Cpu,
  energy:      Zap,
  education:   GraduationCap,
  global:      Globe,
  manufacturing: Factory,
};

function getIcon(name = "") {
  const key = name.toLowerCase().split(" ")[0];
  return iconMap[key] || Globe;
}

function CategorySkeleton() {
  return (
    <div className="animate-pulse flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5">
      <div className="h-12 w-12 rounded-xl bg-slate-200" />
      <div className="h-3 w-20 rounded bg-slate-200" />
      <div className="h-2 w-12 rounded bg-slate-100" />
    </div>
  );
}

export default function Categories() {
  const { data: categories, loading } = useApi(fetchCategories, []);

  return (
    <section id="categories" className="section-padding bg-slate-50">
      <div className="section-container">
        <SectionHeader tag="Browse by Industry" title="Explore Categories" center />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {loading
            ? Array(6).fill(0).map((_, i) => <CategorySkeleton key={i} />)
            : (categories || []).map((cat) => {
                const Icon = getIcon(cat.name);
                return (
                  <Link
                    key={cat.id}
                    to={`/?tab=signup`}
                    className="flex flex-col items-center gap-3 rounded-2xl border border-slate-100 bg-white p-5 text-center transition hover:border-primary hover:shadow-sm"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-light text-primary">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{cat.name}</p>
                      <p className="text-xs text-slate-400">{cat.count} startup{cat.count !== 1 ? "s" : ""}</p>
                    </div>
                  </Link>
                );
              })
          }
          {!loading && (!categories || categories.length === 0) && (
            <p className="col-span-6 py-10 text-center text-sm text-slate-400">No categories yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}
