export default function SectionHeader({ tag, title, description, center = false }) {
  return (
    <div className={center ? "text-center" : ""}>
      {tag && (
        <span className="mb-3 inline-block rounded-full bg-primary-light px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          {tag}
        </span>
      )}
      <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">{title}</h2>
      {description && (
        <p className={`mt-4 text-slate-500 ${center ? "mx-auto max-w-2xl" : "max-w-2xl"}`}>{description}</p>
      )}
    </div>
  );
}
