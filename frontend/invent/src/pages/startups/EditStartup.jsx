import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Save, RefreshCw, CheckCircle, AlertCircle, Send, Eye } from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupTeam from "../../components/startups/StartupTeam";
import StartupFiles from "../../components/startups/StartupFiles";
import StartupVerificationBadge from "../../components/startups/StartupVerificationBadge";
import FundingSummary from "../../components/startups/FundingSummary";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import {
  getStartupById, updateStartup, getMembers,
  getStartupFiles, submitStartupForVerification, getCategories, getIndustries,
} from "../../services/startupApi";

const STAGES   = ["idea", "prototype", "mvp", "growth", "scaling"];
const REG_TYPES = ["early_stage", "registered", "incorporated"];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";
const textareaCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 resize-none";

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const TABS = ["Profile", "Team", "Files", "Funding"];

export default function EditStartup() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const justCreated = location.state?.justCreated;

  const [tab, setTab]         = useState("Profile");
  const [startup, setStartup] = useState(null);
  const [form, setForm]       = useState({});
  const [members, setMembers] = useState([]);
  const [files, setFiles]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError]     = useState("");

  const loadAll = async () => {
    setLoading(true);
    try {
      const [s, mems, fls, cats, inds] = await Promise.all([
        getStartupById(id),
        getMembers(id),
        getStartupFiles(id),
        getCategories(),
        getIndustries(),
      ]);
      setStartup(s);
      setForm({
        name: s.name || "", category_id: s.category_id || "",
        industry: s.industry || "", stage: s.stage || "",
        description: s.description || "", problem: s.problem || "",
        solution: s.solution || "", mission: s.mission || "",
        vision: s.vision || "", business_model: s.business_model || "",
        revenue_model: s.revenue_model || "",
        funding_required: s.funding_required || "", equity_offered: s.equity_offered || "",
        country: s.country || "", province: s.province || "",
        district: s.district || "",
        registration_type: s.registration_type || "early_stage",
        registration_number: s.registration_number || "",
        status: s.status || "draft",
      });
      setMembers(mems);
      setFiles(fls);
      setCategories(cats);
      setIndustries(inds);
    } catch {
      setError("Failed to load startup.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, [id]);

  const isOwner = startup?.owner_id === user?.id;

  const handleChange = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const handleSave = async () => {
    setSaving(true); setError(""); setSuccess("");
    try {
      const payload = {
        ...form,
        funding_required: form.funding_required ? parseFloat(form.funding_required) : 0,
        equity_offered:   form.equity_offered   ? parseFloat(form.equity_offered)   : 0,
        category_id:      form.category_id      ? parseInt(form.category_id)        : undefined,
      };
      const res = await updateStartup(id, payload);
      if (res?.requiresVerification) {
        setSuccess("Changes saved. Your startup has been removed from public view and needs re-verification.");
      } else {
        setSuccess("Changes saved successfully.");
      }
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (!window.confirm("Submit for verification? Ensure your profile and documents are complete.")) return;
    setSubmitting(true); setError(""); setSuccess("");
    try {
      await submitStartupForVerification(id);
      setSuccess("Submitted for verification. Our team will review your startup shortly.");
      loadAll();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!startup) {
    return <DashboardLayout><p className="text-center text-slate-500 mt-20">Startup not found.</p></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-slate-900">{startup.name}</h1>
              <StartupVerificationBadge status={startup.verification_status} size="md" />
            </div>
            <p className="mt-1 text-slate-500">
              Status: <span className="font-medium capitalize">{startup.status}</span>
            </p>
          </div>
          {isOwner && (
            <div className="flex flex-wrap gap-2">
              {startup.status === "published" ? (
                <Button variant="secondary" size="sm" onClick={() => navigate(`/startups/${startup.slug || id}`)}>
                  <Eye className="h-4 w-4" /> View Public Page
                </Button>
              ) : (
                <Button variant="secondary" size="sm" onClick={() => navigate(`/startups/${startup.slug || id}`)}>
                  <Eye className="h-4 w-4" /> Preview (not public yet)
                </Button>
              )}
              {(startup.status === "draft" || startup.status === "submitted" || startup.verification_status === "rejected" || (startup.verification_status === "pending" && startup.status !== "submitted")) && (
                <Button size="sm" disabled={submitting} onClick={handleSubmitVerification}>
                  <Send className="h-4 w-4" />{submitting ? "Submitting…" : "Submit for Verification"}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Re-verification warning — shown when startup was edited after verification */}
        {startup.verification_status === "pending" && startup.status === "draft" && !justCreated && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Re-verification required</p>
              <p className="mt-0.5 text-amber-700">
                This startup has been edited and is no longer publicly visible.
                Ensure your documents are up to date, then submit for verification to restore investor access.
              </p>
            </div>
          </div>
        )}

        {/* Just created banner */}
        {justCreated && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" />
            Startup created! Now add your team members, upload documents, and submit for verification.
          </div>
        )}

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Tabs */}
        <div className="flex rounded-xl bg-slate-100 p-1 gap-1">
          {TABS.map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${tab === t ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {t}
            </button>
          ))}
        </div>

        {/* Tab: Profile */}
        {tab === "Profile" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Startup Name">
                <input value={form.name} onChange={(e) => handleChange("name", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Category">
                <select value={form.category_id} onChange={(e) => handleChange("category_id", e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Industry">
                <select value={form.industry} onChange={(e) => handleChange("industry", e.target.value)} className={inputCls}>
                  <option value="">Select industry…</option>
                  {industries.map((ind) => <option key={ind.id} value={ind.name}>{ind.name}</option>)}
                </select>
              </Field>
              <Field label="Stage">
                <select value={form.stage} onChange={(e) => handleChange("stage", e.target.value)} className={inputCls}>
                  <option value="">Select…</option>
                  {STAGES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                </select>
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={(e) => handleChange("country", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Province / City">
                <input value={form.province} onChange={(e) => handleChange("province", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Description">
              <textarea value={form.description} onChange={(e) => handleChange("description", e.target.value)} rows={3} className={textareaCls} />
            </Field>
            <Field label="Problem">
              <textarea value={form.problem} onChange={(e) => handleChange("problem", e.target.value)} rows={3} className={textareaCls} />
            </Field>
            <Field label="Solution">
              <textarea value={form.solution} onChange={(e) => handleChange("solution", e.target.value)} rows={3} className={textareaCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Mission">
                <input value={form.mission} onChange={(e) => handleChange("mission", e.target.value)} className={inputCls} />
              </Field>
              <Field label="Vision">
                <input value={form.vision} onChange={(e) => handleChange("vision", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <Field label="Business Model">
              <textarea value={form.business_model} onChange={(e) => handleChange("business_model", e.target.value)} rows={3} className={textareaCls} />
            </Field>
            <Field label="Revenue Model">
              <textarea value={form.revenue_model} onChange={(e) => handleChange("revenue_model", e.target.value)} rows={3} className={textareaCls} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Registration Type">
                <select value={form.registration_type} onChange={(e) => handleChange("registration_type", e.target.value)} className={inputCls}>
                  {REG_TYPES.map((t) => <option key={t} value={t}>{t.split("_").map((w) => w.charAt(0).toUpperCase()+w.slice(1)).join(" ")}</option>)}
                </select>
              </Field>
              <Field label="Registration Number">
                <input value={form.registration_number} onChange={(e) => handleChange("registration_number", e.target.value)} className={inputCls} />
              </Field>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Saving…</> : <><Save className="h-4 w-4" /> Save Changes</>}
              </Button>
            </div>
          </div>
        )}

        {/* Tab: Team */}
        {tab === "Team" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <StartupTeam startupId={id} members={members} isOwner={isOwner} onUpdate={loadAll} />
          </div>
        )}

        {/* Tab: Files */}
        {tab === "Files" && (
          <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
            <StartupFiles startupId={id} files={files} isOwner={isOwner} onUpdate={loadAll} />
          </div>
        )}

        {/* Tab: Funding */}
        {tab === "Funding" && (
          <div className="space-y-5">
            <FundingSummary
              fundingRequired={form.funding_required}
              equityOffered={form.equity_offered}
            />
            <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
              <h3 className="font-semibold text-slate-800">Edit Funding</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Funding Required (USD)">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                    <input type="number" min="0" value={form.funding_required}
                      onChange={(e) => handleChange("funding_required", e.target.value)}
                      className={`${inputCls} pl-7`} />
                  </div>
                </Field>
                <Field label="Equity Offered (%)">
                  <div className="relative">
                    <input type="number" min="0" max="100" step="0.5" value={form.equity_offered}
                      onChange={(e) => handleChange("equity_offered", e.target.value)}
                      className={`${inputCls} pr-8`} />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">%</span>
                  </div>
                </Field>
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSave} disabled={saving}>
                  {saving ? "Saving…" : <><Save className="h-4 w-4" /> Save</>}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
