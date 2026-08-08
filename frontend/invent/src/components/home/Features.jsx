import { ShieldCheck, TrendingUp, Users, Lock, Zap, Globe } from "lucide-react";
import SectionHeader from "../common/SectionHeader";

const features = [
  { icon: ShieldCheck, title: "Verified Ecosystem", desc: "Every user and startup goes through a verification process to ensure trust and credibility.", color: "bg-emerald-50 text-emerald-600" },
  { icon: TrendingUp, title: "Startup Growth", desc: "Showcase your idea, attract the right investors, and scale with structured support.", color: "bg-blue-50 text-blue-600" },
  { icon: Users, title: "Professional Network", desc: "Build meaningful connections with founders, investors, mentors, and organizations.", color: "bg-violet-50 text-violet-600" },
  { icon: Lock, title: "Secure Collaboration", desc: "Your pitch decks and startup data are protected with role-based access control.", color: "bg-red-50 text-red-500" },
  { icon: Zap, title: "Fast Matching", desc: "Our smart engine connects startups with the most relevant investors in your space.", color: "bg-amber-50 text-amber-600" },
  { icon: Globe, title: "Global Reach", desc: "Access opportunities across 10+ industries and startups from across the continent.", color: "bg-teal-50 text-teal-600" },
];

export default function Features() {
  return (
    <section id="features" className="section-padding bg-white">
      <div className="section-container">
        <SectionHeader
          tag="Why Innovest"
          title="Everything You Need to Grow"
          description="A complete platform built for the full startup investment lifecycle — from idea to funding and beyond."
          center
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm transition hover:shadow-md hover:border-slate-200">
              <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${f.color}`}>
                <f.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
