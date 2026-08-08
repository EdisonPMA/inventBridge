import { UserPlus, Search, Handshake, TrendingUp } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

const steps = [
  { icon: UserPlus, step: "01", title: "Create Your Account", desc: "Sign up as an inventor, investor, or organization. Verification builds your credibility." },
  { icon: Search, step: "02", title: "Discover Opportunities", desc: "Investors explore verified startups; founders find the right funding partners." },
  { icon: Handshake, step: "03", title: "Connect & Collaborate", desc: "Send investment interest, exchange messages, and share pitch decks securely." },
  { icon: TrendingUp, step: "04", title: "Grow Together", desc: "Track progress, close deals, and scale within the Innovest ecosystem." },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="section-padding bg-slate-50">
      <div className="section-container">
        <SectionHeader tag="The Process" title="How Innovest Works" center />
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <div key={s.step} className="relative flex flex-col items-center text-center">
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-[calc(50%+2.5rem)] top-6 hidden h-px w-[calc(100%-5rem)] bg-slate-200 lg:block" />
              )}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
                <s.icon className="h-6 w-6" aria-hidden="true" />
                <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-bold text-white">
                  {s.step}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
