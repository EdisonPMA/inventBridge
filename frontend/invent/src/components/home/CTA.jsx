import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import Button from "../common/Button";

export default function CTA() {
  return (
    <section className="section-padding bg-gradient-to-br from-emerald-700 via-green-800 to-teal-900">
      <div className="section-container text-center">
        <h2 className="text-3xl font-bold text-white md:text-4xl">Ready to Join the Ecosystem?</h2>
        <p className="mx-auto mt-4 max-w-xl text-white/70">
          Whether you&apos;re building the next big startup or looking for the right investment, Innovest is your platform.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Button size="lg" className="bg-white text-primary hover:bg-slate-100" as={Link} to="/?tab=signup">
            Get Started Free <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="lg" className="border border-white/30 text-white hover:bg-white/10" as={Link} to="/home#explore">
            Explore Startups
          </Button>
        </div>
      </div>
    </section>
  );
}
