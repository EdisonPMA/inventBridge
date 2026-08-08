import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  RefreshCw, AlertCircle, ChevronLeft, Shield,
  TrendingUp, MapPin, ShieldCheck, Clock, XCircle, CheckCircle,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import VerificationStatus from "../../components/verification/VerificationStatus";
import VerificationDocument from "../../components/verification/VerificationDocument";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import { useApi } from "../../hooks/useApi";
import {
  getStartupVerification, submitStartupVerification,
  resubmitVerification, updateVerificationDocument,
} from "../../services/verificationApi";
import { getStartupById, getMyStartups, updateStartup } from "../../services/startupApi";

/* ── Verification status badge ──────────────────── */
const VER_BADGE = {
  verified: { cls: "bg-emerald-50 text-emerald-700 border border-emerald-200", icon: ShieldCheck, label: "Verified" },
  pending:  { cls: "bg-amber-50 text-amber-700 border border-amber-200",       icon: Clock,       label: "Pending" },
  rejected: { cls: "bg-red-50 text-red-600 border border-red-200",             icon: XCircle,     label: "Rejected" },
};

function VerBadge({ status }) {
  const b = VER_BADGE[status] || { cls: "bg-slate-100 text-slate-600 border border-slate-200", icon: Shield, label: status || "—" };
  const Icon = b.icon;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${b.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {b.label}
    </span>
  );
}

/* ── Startup picker card ──────────────────────────── */
function StartupPickerCard({ startup, selected, onClick }) {
  const verStatus = startup.verification_status;
  const isLive    = startup.status === "published";
  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl border-2 p-4 transition ${
        selected ? "border-primary bg-primary-light/20" : "border-slate-100 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary/20 text-sm font-bold text-primary overflow-hidden">
          {startup.logo
            ? <img src={startup.logo} alt={startup.name} className="h-full w-full object-cover" />
            : (startup.name || "S").slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-slate-900 truncate">{startup.name}</p>
            <VerBadge status={verStatus} />
          </div>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
            {startup.industry && <span>{startup.industry}</span>}
            {startup.stage && <span className="flex items-center gap-0.5"><TrendingUp className="h-3 w-3" />{startup.stage}</span>}
            {startup.country && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{startup.country}</span>}
            <span className={`capitalize font-medium ${isLive ? "text-emerald-600" : "text-amber-600"}`}>
              {startup.status}
            </span>
          </div>
        </div>
        {selected && <CheckCircle className="h-5 w-5 shrink-0 text-primary mt-0.5" />}
      </div>
    </button>
  );
}

/* ── Main component ───────────────────────────────── */
export default function StartupVerification() {
  const { startupId: paramId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Load all inventor startups for the picker
  const { data: allStartups, loading: startupsLoading } = useApi(getMyStartups, []);
  const startupList = Array.isArray(allStartups) ? allStartups : [];

  // Which startup is selected — default to URL param or first in list
  const [selectedId, setSelectedId] = useState(paramId || null);
  const activeId = selectedId || startupList[0]?.id;

  // Load single startup + its verification
  const { data: startup, loading: startupLoading, refetch: refetchStartup } =
    useApi(() => activeId ? getStartupById(activeId) : Promise.resolve(null), [activeId]);

  const { data: verData, loading: verLoading, refetch: refetchVer } =
    useApi(() => activeId ? getStartupVerification(activeId) : Promise.resolve(null), [activeId]);

  const [submitting,    setSubmitting]    = useState(false);
  const [actionError,   setActionError]   = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [newDocUrl,     setNewDocUrl]     = useState("");

  const loading = startupsLoading || startupLoading || verLoading;

  const requests     = verData?.rows ?? [];
  const latestVerReq = requests[0] ?? null;

  const startupVerStatus = startup?.verification_status;
  const requestStatus    = latestVerReq?.status;
  const currentStatus    =
    startupVerStatus === "verified"  ? "verified"  :
    startupVerStatus === "rejected"  ? "rejected"  :
    requestStatus    === "approved"  ? "verified"  :
    requestStatus ?? startupVerStatus ?? "not_submitted";

  const isOwner = startup?.owner_id === user?.id;

  const refetchAll = () => { refetchVer(); refetchStartup(); };

  const handleSubmit = async () => {
    setSubmitting(true); setActionError(""); setActionSuccess("");
    try {
      await submitStartupVerification(activeId);
      setActionSuccess("Verification submitted. Our team will review your startup shortly.");
      refetchAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResubmit = async () => {
    if (!latestVerReq) return;
    setSubmitting(true); setActionError(""); setActionSuccess("");
    try {
      if (newDocUrl) await updateVerificationDocument(latestVerReq.id, newDocUrl);
      await resubmitVerification(latestVerReq.id, newDocUrl || null);
      setActionSuccess("Verification resubmitted. Our team will review it shortly.");
      setNewDocUrl("");
      refetchAll();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCertificate = async (url) => {
    try {
      await updateStartup(activeId, { registration_certificate_url: url });
      setNewDocUrl(url);
      setActionSuccess("Certificate uploaded. Remember to resubmit.");
      refetchStartup();
    } catch { /* silent */ }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">

        {/* Back */}
        <Button variant="ghost" size="sm" onClick={() => navigate("/inventor/dashboard")}>
          <ChevronLeft className="h-4 w-4" /> Back to Dashboard
        </Button>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Startup Verification</h1>
            <p className="mt-1 text-slate-500">
              Verify your startup registration to become publicly discoverable by investors.
            </p>
          </div>
          <button onClick={refetchAll} className="rounded-lg p-2 text-slate-400 hover:text-primary hover:bg-slate-100 transition">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Feedback */}
        {actionError && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />{actionError}
          </div>
        )}
        {actionSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            ✅ {actionSuccess}
          </div>
        )}

        {startupsLoading ? (
          <div className="flex h-40 items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : startupList.length === 0 ? (
          /* No startups at all */
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <Shield className="h-10 w-10 text-slate-300" />
            <div>
              <p className="font-semibold text-slate-600">No startups yet</p>
              <p className="mt-1 text-sm text-slate-400">Create a startup first before submitting for verification.</p>
            </div>
            <Button as={Link} to="/inventor/startups/new">Create Startup</Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-5">

            {/* ── Left: startup picker ───────────────── */}
            <div className="lg:col-span-2 space-y-3">
              <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide text-slate-400">
                Select Startup
              </h2>
              <div className="space-y-2">
                {startupList.map((s) => (
                  <StartupPickerCard
                    key={s.id}
                    startup={s}
                    selected={String(s.id) === String(activeId)}
                    onClick={() => {
                      setSelectedId(s.id);
                      setActionError("");
                      setActionSuccess("");
                      setNewDocUrl("");
                    }}
                  />
                ))}
              </div>
              <Button size="sm" variant="ghost" className="w-full" as={Link} to="/inventor/startups/new">
                <Shield className="h-3.5 w-3.5" /> + Add Startup
              </Button>
            </div>

            {/* ── Right: verification details ────────── */}
            <div className="lg:col-span-3 space-y-5">
              {(startupLoading || verLoading) ? (
                <div className="flex h-40 items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !startup ? (
                <div className="flex h-40 items-center justify-center text-slate-400 text-sm">
                  Select a startup to view verification details.
                </div>
              ) : (
                <>
                  {/* Verification status */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 font-semibold text-slate-800">Verification Status</h2>
                    <VerificationStatus
                      status={currentStatus}
                      type="startup"
                      remarks={latestVerReq?.remarks}
                      submittedAt={latestVerReq?.created_at}
                      verifiedAt={latestVerReq?.verified_at}
                      onSubmit={isOwner && currentStatus === "not_submitted" ? handleSubmit : undefined}
                      onResubmit={isOwner && currentStatus === "rejected" ? handleResubmit : undefined}
                      loading={submitting}
                    />
                  </div>

                  {/* Verified: startup is live */}
                  {currentStatus === "verified" && (
                    <div className="flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                      <div className="text-2xl select-none">🎉</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-emerald-800">Verified and publicly visible!</p>
                        <p className="mt-1 text-sm text-emerald-700">
                          Investors can discover, save, follow, and make offers on <strong>{startup.name}</strong>.
                        </p>
                        <a
                          href={`/startups/${startup.slug || startup.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition"
                        >
                          View Public Page →
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Rejected: action steps */}
                  {currentStatus === "rejected" && latestVerReq?.remarks && (
                    <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
                      <p className="font-semibold text-red-800">Action required — fix and resubmit</p>
                      <p className="text-sm text-red-700">Reason: <em>"{latestVerReq.remarks}"</em></p>
                      <ol className="list-decimal list-inside space-y-1 text-sm text-red-700">
                        <li>Edit your startup profile to fix the issue.</li>
                        <li>Upload an updated certificate below if needed.</li>
                        <li>Click "Resubmit Verification".</li>
                      </ol>
                    </div>
                  )}

                  {/* Registration info */}
                  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-semibold text-slate-800">Registration Information</h2>
                      <Button size="sm" variant="ghost" onClick={() => navigate(`/inventor/startups/${startup.id}/edit`)}>
                        <Shield className="h-3.5 w-3.5" /> Edit
                      </Button>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-100">
                      {[
                        ["Startup Name",        startup.name],
                        ["Industry",            startup.industry],
                        ["Stage",               startup.stage],
                        ["Country",             startup.country],
                        ["Province",            startup.province],
                        ["Registration Type",   startup.registration_type?.split("_").map((w) => w.charAt(0).toUpperCase()+w.slice(1)).join(" ")],
                        ["Registration Number", startup.registration_number],
                      ].map(([label, value]) => value ? (
                        <div key={label} className="flex border-b border-slate-50 last:border-0">
                          <span className="w-2/5 bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-500">{label}</span>
                          <span className="flex-1 px-4 py-2.5 text-sm text-slate-800">{value}</span>
                        </div>
                      ) : null)}
                    </div>
                    {!startup.registration_number && (
                      <p className="mt-3 text-xs text-amber-600">
                        ⚠ Registration number missing.{" "}
                        <Link to={`/inventor/startups/${startup.id}/edit`} className="font-medium underline">
                          Edit startup
                        </Link>{" "}
                        to add it before submitting.
                      </p>
                    )}
                  </div>

                  {/* Certificate upload */}
                  {currentStatus !== "verified" && isOwner && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                      <h2 className="mb-2 font-semibold text-slate-800">Registration Certificate</h2>
                      <p className="mb-4 text-sm text-slate-500">
                        Upload your official business registration certificate.
                        Private — only reviewed by Innovest staff.
                      </p>
                      <VerificationDocument
                        onUploaded={handleUpdateCertificate}
                        currentUrl={startup?.registration_certificate_url || null}
                        disabled={currentStatus === "verified"}
                      />
                    </div>
                  )}

                  {/* Verification history */}
                  {requests.length > 0 && (
                    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
                      <h2 className="mb-4 font-semibold text-slate-800">Verification History</h2>
                      <div className="space-y-2">
                        {requests.map((r, idx) => (
                          <div key={r.id} className={`flex items-start gap-3 rounded-xl border p-3 ${
                            idx === 0 ? "border-slate-200 bg-slate-50" : "border-slate-100"
                          }`}>
                            <VerBadge status={r.status === "approved" ? "verified" : r.status} />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs text-slate-400">{new Date(r.created_at).toLocaleDateString()}</p>
                              {r.remarks && <p className="mt-1 text-xs text-slate-600 italic">"{r.remarks}"</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
