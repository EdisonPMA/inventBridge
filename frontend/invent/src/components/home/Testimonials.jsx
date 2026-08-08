import SectionHeader from "../common/SectionHeader";
import VerifiedBadge from "../common/VerifiedBadge";

const testimonials = [
  {
    quote: "Innovest helped us connect with the right investors in just 3 weeks. We closed our seed round faster than we thought possible.",
    name: "Edison M.", role: "Founder, GreenTech AI", initials: "EM",
  },
  {
    quote: "As an investor, the verified startup profiles give me confidence. I can evaluate opportunities without worrying about fraudulent claims.",
    name: "Sarah K.", role: "Angel Investor", initials: "SK",
  },
  {
    quote: "We launched our accelerator program through Innovest and received 40+ quality applications in the first month.",
    name: "TechCorp Foundation", role: "Incubator Organization", initials: "TC",
  },
];

export default function Testimonials() {
  return (
    <section className="section-padding bg-gradient-to-br from-primary-light via-white to-white">
      <div className="section-container">
        <SectionHeader tag="Success Stories" title="What Our Members Say" center />
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {testimonials.map((t) => (
            <div key={t.name} className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
              <p className="text-sm leading-relaxed text-slate-600">&ldquo;{t.quote}&rdquo;</p>
              <div className="mt-6 flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary">
                  {t.initials}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <div className="flex items-center gap-1.5">
                    <p className="text-xs text-slate-500">{t.role}</p>
                    <VerifiedBadge />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
