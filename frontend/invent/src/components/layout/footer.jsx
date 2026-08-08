import { Link } from "react-router-dom";
import Logo from "../common/Logo";

const companyLinks = [
  { label: "About", to: "/home#about" },
  { label: "Careers", to: "/careers" },
  { label: "Contact", to: "/home#contact" },
];
const resourceLinks = [
  { label: "Help Center", to: "/help" },
  { label: "FAQs", to: "/faqs" },
  { label: "Blog", to: "/blog" },
];
const legalLinks = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];
const socialLinks = [
  { label: "LinkedIn", href: "https://linkedin.com", icon: "in" },
  { label: "Facebook", href: "https://facebook.com", icon: "f" },
  { label: "X", href: "https://x.com", icon: "x" },
  { label: "Instagram", href: "https://instagram.com", icon: "ig" },
];

export default function Footer() {
  return (
    <footer id="contact" className="border-t border-slate-100 bg-slate-900 text-slate-300">
      <div className="section-container section-padding pb-8">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Link to="/home" className="inline-flex items-center">
              <Logo size="md" variant="dark" />
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-400">
              Connecting innovation with investment. The trusted ecosystem for startups, investors, and organizations worldwide.
            </p>
            <div className="mt-6 flex gap-3">
              {socialLinks.map(({ label, icon, href }) => (
                <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-800 text-xs font-bold uppercase text-slate-400 transition hover:bg-primary hover:text-white">
                  {icon}
                </a>
              ))}
            </div>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Company</h3>
            <ul className="space-y-2.5">
              {companyLinks.map((l) => (
                <li key={l.label}><Link to={l.to} className="text-sm hover:text-primary">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Resources</h3>
            <ul className="space-y-2.5">
              {resourceLinks.map((l) => (
                <li key={l.label}><Link to={l.to} className="text-sm hover:text-primary">{l.label}</Link></li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-white">Legal</h3>
            <ul className="space-y-2.5">
              {legalLinks.map((l) => (
                <li key={l.label}><Link to={l.to} className="text-sm hover:text-primary">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-12 border-t border-slate-800 pt-8 text-center text-sm text-slate-500">
          &copy; {new Date().getFullYear()} Innovest. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
