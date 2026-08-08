import { useState } from "react";
import { Shield, AlertCircle } from "lucide-react";
import Button from "../common/Button";
import VerificationDocument from "./VerificationDocument";

const INVESTOR_TYPES = [
  { value: "individual", label: "Individual Investor" },
  { value: "business",   label: "Business / Institutional Investor" },
];

const REG_TYPES = ["sole_proprietorship", "llc", "corporation", "partnership", "ngo", "other"];

const inputCls = "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

function Field({ label, required, children, hint }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

/**
 * @param {Function} onSubmit(data) — called with form payload
 * @param {boolean}  loading
 * @param {string}   error
 */
export default function VerificationForm({ onSubmit, loading = false, error = "" }) {
  const [investorType,        setInvestorType]        = useState("individual");
  const [businessName,        setBusinessName]        = useState("");
  const [registrationNumber,  setRegistrationNumber]  = useState("");
  const [registrationType,    setRegistrationType]    = useState("");
  const [country,             setCountry]             = useState("");
  const [province,            setProvince]            = useState("");
  const [district,            setDistrict]            = useState("");
  const [documentUrl,         setDocumentUrl]         = useState("");
  const [formError,           setFormError]           = useState("");

  const validate = () => {
    if (!country.trim())             return "Country is required.";
    if (investorType === "business" && !businessName.trim())
                                     return "Business name is required.";
    if (investorType === "business" && !registrationNumber.trim())
                                     return "Registration number is required.";
    if (investorType === "business" && !documentUrl)
                                     return "Please upload your registration certificate.";
    return null;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) { setFormError(validationError); return; }
    setFormError("");
    onSubmit({
      investor_type:       investorType,
      business_name:       businessName || null,
      registration_number: registrationNumber || null,
      registration_type:   registrationType || null,
      country:             country.trim(),
      province:            province || null,
      district:            district || null,
      document_url:        documentUrl || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {(formError || error) && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {formError || error}
        </div>
      )}

      {/* Investor type */}
      <Field label="Investor Type" required>
        <div className="grid gap-3 sm:grid-cols-2">
          {INVESTOR_TYPES.map((t) => (
            <button key={t.value} type="button"
              onClick={() => setInvestorType(t.value)}
              className={`rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition ${
                investorType === t.value
                  ? "border-primary bg-primary-light/30 text-primary"
                  : "border-slate-200 text-slate-700 hover:border-slate-300"
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Business fields — only for business investors */}
      {investorType === "business" && (
        <>
          <Field label="Business / Organization Name" required>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Horizon Ventures Ltd" className={inputCls} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Registration Number" required
              hint="As it appears on the official certificate">
              <input value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)}
                placeholder="e.g. CPR/2024/001234" className={inputCls} />
            </Field>
            <Field label="Registration Type">
              <select value={registrationType} onChange={(e) => setRegistrationType(e.target.value)}
                className={inputCls}>
                <option value="">Select…</option>
                {REG_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </>
      )}

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Country" required>
          <input value={country} onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. Kenya" className={inputCls} />
        </Field>
        <Field label="Province / State">
          <input value={province} onChange={(e) => setProvince(e.target.value)}
            placeholder="e.g. Nairobi" className={inputCls} />
        </Field>
        <Field label="District / City">
          <input value={district} onChange={(e) => setDistrict(e.target.value)}
            placeholder="e.g. Westlands" className={inputCls} />
        </Field>
      </div>

      {/* Document upload */}
      <Field
        label={investorType === "business" ? "Registration Certificate" : "Identity / Proof Document"}
        required={investorType === "business"}
        hint="PDF, DOC, JPG or PNG — max 20 MB. Stored securely and only accessible to authorized staff."
      >
        <VerificationDocument onUploaded={setDocumentUrl} currentUrl={documentUrl} />
      </Field>

      <Button type="submit" size="lg" disabled={loading} className="w-full sm:w-auto">
        {loading
          ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Submitting…</>
          : <><Shield className="h-4 w-4" /> Submit Verification</>
        }
      </Button>
    </form>
  );
}
