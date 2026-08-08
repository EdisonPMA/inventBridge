export default function Skeleton({ className = "" }) {
  return <div className={`animate-pulse rounded-lg bg-slate-200 ${className}`} aria-hidden="true" />;
}

export function SkeletonCard() {
  return (
    <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-5">
      <Skeleton className="h-12 w-12 rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}
