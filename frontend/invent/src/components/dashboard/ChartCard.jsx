/**
 * Lightweight SVG-based line/bar chart card — no external chart lib needed.
 * Data: array of { label: string, value: number }
 */

function LineChart({ data, color = "#16a34a" }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 280, H = 80, pad = 4;
  const points = data.map((d, i) => {
    const x = pad + (i / (data.length - 1 || 1)) * (W - pad * 2);
    const y = H - pad - (d.value / max) * (H - pad * 2);
    return `${x},${y}`;
  });
  const areaPoints = [
    `${pad},${H - pad}`,
    ...points,
    `${W - pad},${H - pad}`,
  ];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints.join(" ")} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {data.map((d, i) => {
        const x = pad + (i / (data.length - 1 || 1)) * (W - pad * 2);
        const y = H - pad - (d.value / max) * (H - pad * 2);
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />;
      })}
    </svg>
  );
}

function BarChart({ data, color = "#16a34a" }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.value), 1);
  const W = 280, H = 80, gap = 4;
  const barW = (W - gap * (data.length + 1)) / data.length;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {data.map((d, i) => {
        const h = (d.value / max) * (H - 8);
        const x = gap + i * (barW + gap);
        const y = H - h - 4;
        return (
          <rect key={i} x={x} y={y} width={barW} height={h} rx="3"
            fill={color} fillOpacity={i === data.length - 1 ? 1 : 0.5} />
        );
      })}
    </svg>
  );
}

export default function ChartCard({ title, subtitle, data = [], type = "line", color = "#16a34a", footer }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm shadow-slate-100">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-2">
        {type === "bar"
          ? <BarChart data={data} color={color} />
          : <LineChart data={data} color={color} />}
      </div>
      {data.length > 0 && (
        <div className="mt-2 flex justify-between">
          {data.map((d) => (
            <span key={d.label} className="text-[10px] text-slate-400">{d.label}</span>
          ))}
        </div>
      )}
      {footer && <div className="mt-3 border-t border-slate-100 pt-3 text-xs text-slate-500">{footer}</div>}
    </div>
  );
}
