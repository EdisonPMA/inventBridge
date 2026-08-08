import SectionHeader from "../common/SectionHeader";

const partners = [
  "Google for Startups", "Africa Tech Summit", "World Bank IFC",
  "USAID", "Tony Elumelu Foundation", "Y Combinator Alumni",
  "Seedstars", "GSMA Innovation Fund",
];

export default function Partners() {
  return (
    <section id="organizations" className="section-padding bg-white">
      <div className="section-container">
        <SectionHeader tag="Ecosystem Partners" title="Trusted by Leading Organizations" center />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {partners.map((p) => (
            <div key={p} className="flex items-center justify-center rounded-2xl border border-slate-100 bg-slate-50 px-4 py-5 text-center">
              <span className="text-sm font-medium text-slate-500">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
