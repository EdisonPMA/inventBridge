import { useEffect, useRef, useState } from "react";
import { Briefcase, TrendingUp, Building2, Globe } from "lucide-react";
import { useApi } from "../../hooks/useApi";
import { fetchPlatformStats } from "../../services/homeApi";

function Counter({ to, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        const steps = 60;
        let i = 0;
        const timer = setInterval(() => {
          i++;
          setCount(Math.round((to * i) / steps));
          if (i >= steps) clearInterval(timer);
        }, 20);
      }
    }, { threshold: 0.4 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [to]);
  return <span ref={ref}>{count}{suffix}</span>;
}

export default function StatsSection() {
  const { data, loading } = useApi(fetchPlatformStats, []);

  const stats = [
    { icon: Briefcase,  label: "Startups",      value: data?.startups      ?? 0, suffix: "+", color: "text-primary" },
    { icon: TrendingUp, label: "Investors",      value: data?.investors     ?? 0, suffix: "+", color: "text-blue-600" },
    { icon: Building2,  label: "Organizations",  value: data?.organizations ?? 0, suffix: "+", color: "text-violet-600" },
    { icon: Globe,      label: "Industries",     value: data?.industries    ?? 0, suffix: "+", color: "text-amber-600" },
  ];

  return (
    <section className="section-padding border-b border-slate-100 bg-white">
      <div className="section-container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col items-center gap-2 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <p className={`text-3xl font-bold ${s.color}`}>
                {loading
                  ? <span className="inline-block h-8 w-16 animate-pulse rounded bg-slate-200" />
                  : <Counter to={s.value} suffix={s.suffix} />
                }
              </p>
              <p className="text-sm text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
