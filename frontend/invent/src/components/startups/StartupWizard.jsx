import { useState, useEffect } from "react";
import { Check, ChevronLeft, ChevronRight, Save, AlertCircle } from "lucide-react";
import Button from "../common/Button";
import { getCategories, getIndustries } from "../../services/startupApi";

/* ── Field components ─────────────────────────────── */
function Field({ label, error, required, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

const inputCls = (err) =>
  `w-full rounded-xl border ${err ? "border-red-300" : "border-slate-200"} bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20`;

const textareaCls = (err) =>
  `w-full rounded-xl border ${err ? "border-red-300" : "border-slate-200"} bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none`;

/* ── Step definitions ─────────────────────────────── */
const STEPS = [
  "Basic Info",
  "Problem & Solution",
  "Business Model",
  "Funding",
  "Location",
  "Registration",
  "Visibility",
  "Review",
];

const STAGES = ["idea", "prototype", "mvp", "growth", "scaling"];
const REGISTRATION_TYPES = ["early_stage", "registered", "incorporated"];

/* ── Individual step forms ────────────────────────── */
function Step1({ data, onChange, errors, categories, catsLoading, catsError, industries, indsLoading, indsError }) {
  return (
    <div className="space-y-4">
      <Field label="Startup Name" required error={errors.name}>
        <input value={data.name} onChange={(e) => onChange("name", e.target.value)}
          placeholder="e.g. GreenTech AI" className={inputCls(errors.name)} />
      </Field>
      <Field label="Category" required error={errors.category_id}>
        {catsLoading ? (
          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            Loading categories…
          </div>
        ) : catsError ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {catsError}
          </div>
        ) : (
          <select value={data.category_id} onChange={(e) => onChange("category_id", e.target.value)}
            className={inputCls(errors.category_id)}>
            <option value="">Select category…</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Industry" required error={errors.industry}>
        {indsLoading ? (
          <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-400">
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-primary" />
            Loading industries…
          </div>
        ) : indsError ? (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {indsError}
          </div>
        ) : (
          <select value={data.industry} onChange={(e) => onChange("industry", e.target.value)}
            className={inputCls(errors.industry)}>
            <option value="">Select industry…</option>
            {industries.map((ind) => <option key={ind.id} value={ind.name}>{ind.name}</option>)}
          </select>
        )}
      </Field>
      <Field label="Stage" required error={errors.stage}>
        <select value={data.stage} onChange={(e) => onChange("stage", e.target.value)}
          className={inputCls(errors.stage)}>
          <option value="">Select stage…</option>
          {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
      </Field>
      <Field label="Short Description" required error={errors.description}>
        <textarea value={data.description} onChange={(e) => onChange("description", e.target.value)}
          rows={3} placeholder="What does your startup do? (max 500 chars)"
          maxLength={500} className={textareaCls(errors.description)} />
      </Field>
    </div>
  );
}

function Step2({ data, onChange, errors }) {
  return (
    <div className="space-y-4">
      <Field label="Problem" error={errors.problem}>
        <textarea value={data.problem} onChange={(e) => onChange("problem", e.target.value)}
          rows={4} placeholder="What problem are you solving?" className={textareaCls(errors.problem)} />
      </Field>
      <Field label="Solution" error={errors.solution}>
        <textarea value={data.solution} onChange={(e) => onChange("solution", e.target.value)}
          rows={4} placeholder="How does your startup solve it?" className={textareaCls(errors.solution)} />
      </Field>
      <Field label="Mission" error={errors.mission}>
        <input value={data.mission} onChange={(e) => onChange("mission", e.target.value)}
          placeholder="Your mission statement" className={inputCls(errors.mission)} />
      </Field>
      <Field label="Vision" error={errors.vision}>
        <input value={data.vision} onChange={(e) => onChange("vision", e.target.value)}
          placeholder="Your long-term vision" className={inputCls(errors.vision)} />
      </Field>
    </div>
  );
}

function Step3({ data, onChange, errors }) {
  return (
    <div className="space-y-4">
      <Field label="Business Model" error={errors.business_model}>
        <textarea value={data.business_model} onChange={(e) => onChange("business_model", e.target.value)}
          rows={4} placeholder="How does the business operate?" className={textareaCls(errors.business_model)} />
      </Field>
      <Field label="Revenue Model" error={errors.revenue_model}>
        <textarea value={data.revenue_model} onChange={(e) => onChange("revenue_model", e.target.value)}
          rows={4} placeholder="How do you make money?" className={textareaCls(errors.revenue_model)} />
      </Field>
    </div>
  );
}

function Step4({ data, onChange, errors }) {
  return (
    <div className="space-y-4">
      <Field label="Funding Required (USD)" required error={errors.funding_required}>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
          <input type="number" min="0" step="1000" value={data.funding_required}
            onChange={(e) => onChange("funding_required", e.target.value)}
            placeholder="250000" className={`${inputCls(errors.funding_required)} pl-7`} />
        </div>
      </Field>
      <Field label="Equity Offered (%)" required error={errors.equity_offered}>
        <div className="relative">
          <input type="number" min="0" max="100" step="0.5" value={data.equity_offered}
            onChange={(e) => onChange("equity_offered", e.target.value)}
            placeholder="10" className={`${inputCls(errors.equity_offered)} pr-8`} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
        </div>
      </Field>
      <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-xs text-amber-700">
        This information will be shown to verified investors after your startup is published.
      </div>
    </div>
  );
}

function Step5({ data, onChange, errors }) {
  return (
    <div className="space-y-4">
      <Field label="Country" error={errors.country}>
        <input value={data.country} onChange={(e) => onChange("country", e.target.value)}
          placeholder="e.g. Kenya" className={inputCls(errors.country)} />
      </Field>
      <Field label="Province / State" error={errors.province}>
        <input value={data.province} onChange={(e) => onChange("province", e.target.value)}
          placeholder="e.g. Nairobi" className={inputCls(errors.province)} />
      </Field>
      <Field label="District / City" error={errors.district}>
        <input value={data.district} onChange={(e) => onChange("district", e.target.value)}
          placeholder="e.g. Westlands" className={inputCls(errors.district)} />
      </Field>
    </div>
  );
}

function Step6({ data, onChange, errors }) {
  return (
    <div className="space-y-4">
      <Field label="Registration Type" error={errors.registration_type}>
        <select value={data.registration_type} onChange={(e) => onChange("registration_type", e.target.value)}
          className={inputCls(errors.registration_type)}>
          {REGISTRATION_TYPES.map((t) => (
            <option key={t} value={t}>{t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}</option>
          ))}
        </select>
      </Field>
      <Field label="Registration Number" error={errors.registration_number}>
        <input value={data.registration_number} onChange={(e) => onChange("registration_number", e.target.value)}
          placeholder="e.g. CPR/2024/001234" className={inputCls(errors.registration_number)} />
      </Field>
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
        You can upload your registration certificate after creating the startup in the Documents section.
      </div>
    </div>
  );
}

function Step7({ data, onChange }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Choose who can see your startup profile.</p>
      {[
        { value: "draft", label: "Draft (private)", desc: "Only visible to you. Save your progress." },
        { value: "published", label: "Published", desc: "Visible to all investors. Note: will require verification before appearing in discovery." },
      ].map((opt) => (
        <button key={opt.value} type="button" onClick={() => onChange("status", opt.value)}
          className={`w-full rounded-xl border-2 p-4 text-left transition ${data.status === opt.value ? "border-primary bg-primary-light/30" : "border-slate-200 hover:border-slate-300"}`}>
          <p className="font-medium text-slate-800">{opt.label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{opt.desc}</p>
        </button>
      ))}
    </div>
  );
}

function Step8({ data, categories }) {
  const cat = categories.find((c) => String(c.id) === String(data.category_id));
  const rows = [
    ["Name", data.name],
    ["Category", cat?.name || "—"],
    ["Industry", data.industry],
    ["Stage", data.stage],
    ["Funding Required", data.funding_required ? `$${Number(data.funding_required).toLocaleString()}` : "—"],
    ["Equity Offered", data.equity_offered ? `${data.equity_offered}%` : "—"],
    ["Country", data.country || "—"],
    ["Initial Status", data.status],
  ];
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">Review your startup before creating it. You can edit everything after creation.</p>
      <div className="rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex border-b border-slate-50 last:border-0">
            <span className="w-1/3 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500">{k}</span>
            <span className="flex-1 px-4 py-2.5 text-sm text-slate-800">{v || "—"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main wizard ──────────────────────────────────── */
const INITIAL = {
  name: "", category_id: "", industry: "", stage: "", description: "",
  problem: "", solution: "", mission: "", vision: "",
  business_model: "", revenue_model: "",
  funding_required: "", equity_offered: "",
  country: "", province: "", district: "",
  registration_type: "early_stage", registration_number: "",
  status: "draft",
};

function validateStep(step, data) {
  const e = {};
  if (step === 0) {
    if (!data.name.trim())       e.name        = "Required";
    if (!data.category_id)       e.category_id = "Required";
    if (!data.industry.trim())   e.industry    = "Required";
    if (!data.stage)             e.stage       = "Required";
    if (!data.description.trim()) e.description = "Required";
  }
  if (step === 3) {
    if (Number(data.funding_required) < 0) e.funding_required = "Must be ≥ 0";
    if (Number(data.equity_offered) < 0 || Number(data.equity_offered) > 100)
      e.equity_offered = "Must be 0–100";
  }
  return e;
}

export default function StartupWizard({ onSubmit, loading = false, submitError = "" }) {
  const [step, setStep]         = useState(0);
  const [data, setData]         = useState(INITIAL);
  const [errors, setErrors]     = useState({});
  const [categories, setCategories]     = useState([]);
  const [catsLoading, setCatsLoading]   = useState(true);
  const [catsError,   setCatsError]     = useState("");
  const [industries,   setIndustries]   = useState([]);
  const [indsLoading,  setIndsLoading]  = useState(true);
  const [indsError,    setIndsError]    = useState("");

  useEffect(() => {
    setCatsLoading(true);
    setCatsError("");
    getCategories()
      .then((cats) => {
        setCategories(cats);
        if (!cats.length) setCatsError("No categories available yet. Ask an admin to add some.");
      })
      .catch(() => setCatsError("Could not load categories. Please refresh and try again."))
      .finally(() => setCatsLoading(false));

    setIndsLoading(true);
    setIndsError("");
    getIndustries()
      .then((inds) => {
        setIndustries(inds);
        if (!inds.length) setIndsError("No industries available yet. Ask an admin to add some.");
      })
      .catch(() => setIndsError("Could not load industries. Please refresh and try again."))
      .finally(() => setIndsLoading(false));
  }, []);

  const onChange = (field, value) => {
    setData((p) => ({ ...p, [field]: value }));
    setErrors((p) => { const n = { ...p }; delete n[field]; return n; });
  };

  const goNext = () => {
    const e = validateStep(step, data);
    if (Object.keys(e).length) { setErrors(e); return; }
    setStep((s) => s + 1);
  };

  const goPrev = () => setStep((s) => s - 1);

  const handleSubmit = () => {
    const payload = {
      ...data,
      funding_required: data.funding_required ? parseFloat(data.funding_required) : 0,
      equity_offered:   data.equity_offered   ? parseFloat(data.equity_offered)   : 0,
      category_id:      data.category_id      ? parseInt(data.category_id)        : undefined,
    };
    onSubmit(payload);
  };

  const stepComponents = [
    <Step1 key={0} data={data} onChange={onChange} errors={errors} categories={categories} catsLoading={catsLoading} catsError={catsError} industries={industries} indsLoading={indsLoading} indsError={indsError} />,
    <Step2 key={1} data={data} onChange={onChange} errors={errors} />,
    <Step3 key={2} data={data} onChange={onChange} errors={errors} />,
    <Step4 key={3} data={data} onChange={onChange} errors={errors} />,
    <Step5 key={4} data={data} onChange={onChange} errors={errors} />,
    <Step6 key={5} data={data} onChange={onChange} errors={errors} />,
    <Step7 key={6} data={data} onChange={onChange} />,
    <Step8 key={7} data={data} categories={categories} />,
  ];

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-col items-center gap-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-all ${
                i < step ? "bg-primary text-white"
                : i === step ? "border-2 border-primary bg-white text-primary"
                : "bg-slate-100 text-slate-400"
              }`}>
                {i < step ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <span className={`hidden text-[10px] sm:block ${i === step ? "text-primary font-medium" : "text-slate-400"}`}>
                {s}
              </span>
            </div>
          ))}
        </div>
        <div className="h-1.5 rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }} />
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm min-h-[360px]">
        <h2 className="mb-5 text-lg font-bold text-slate-900">
          Step {step + 1}: {STEPS[step]}
        </h2>
        {stepComponents[step]}
      </div>

      {/* Error banner */}
      {submitError && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {submitError}
        </div>
      )}

      {/* Navigation */}
      <div className="mt-5 flex items-center justify-between">
        <Button variant="secondary" size="md" disabled={step === 0} onClick={goPrev}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>

        {step < STEPS.length - 1 ? (
          <Button size="md" onClick={goNext}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="md" disabled={loading} onClick={handleSubmit}>
            {loading
              ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Creating…</>
              : <><Save className="h-4 w-4" /> Create Startup</>
            }
          </Button>
        )}
      </div>
    </div>
  );
}
