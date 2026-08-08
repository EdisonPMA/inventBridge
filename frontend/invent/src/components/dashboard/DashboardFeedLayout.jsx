/**
 * DashboardFeedLayout — three-column dashboard shell.
 *
 * ┌──────────────┬─────────────────────┬──────────────┐
 * │  LEFT (240)  │   CENTER (flex-1)   │  RIGHT (280) │
 * │  Startups    │   Public Feed       │  Role panels │
 * └──────────────┴─────────────────────┴──────────────┘
 *
 * On tablet: left + center stack; right hides.
 * On mobile:  single column, right hidden behind "more" toggle.
 *
 * Props:
 *   left    ReactNode  — startup sidebar content
 *   center  ReactNode  — feed content
 *   right   ReactNode  — role-specific panels
 */
export default function DashboardFeedLayout({ left, center, right }) {
  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="flex gap-5 items-start">
        {/* ── Left — startups ─────────────────────── */}
        <aside className="hidden lg:flex w-56 xl:w-64 shrink-0 flex-col gap-4 sticky top-4">
          {left}
        </aside>

        {/* ── Center — feed ───────────────────────── */}
        <section className="flex-1 min-w-0 space-y-4">
          {center}
        </section>

        {/* ── Right — role panels ─────────────────── */}
        <aside className="hidden xl:flex w-72 shrink-0 flex-col gap-4 sticky top-4">
          {right}
        </aside>
      </div>
    </div>
  );
}
