import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, ChevronUp, Eye, X, CheckCircle, ExternalLink, FileCheck, ShieldCheck } from "lucide-react";
import { adminGetStartupDetail } from "../../../services/adminApi";
import { adminApproveVerification, adminRejectVerification, adminStartReview } from "../../../services/verificationApi";
import api from "../../../services/api";
import { Skel, Pager } from "../adminShared";

/* â”€â”€ StartupDetailPanel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function StartupDetailPanel({ startupId, verReqId, initialStatus, onApprove, onReject, onClose }) {
  const [detail,  setDetail]  = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [remarks, setRemarks] = useState("");
  const [mode,    setMode]    = useState(null);
  const [acting,  setActing]  = useState(false);
  const [actErr,  setActErr]  = useState("");

  const reload = useCallback(() => {
    setLoading(true); setError("");
    adminGetStartupDetail(startupId)
      .then(setDetail)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [startupId]);
  useEffect(() => { reload(); }, [reload]);

  const canAct    = initialStatus === "pending" || initialStatus === "under_review";
  const latestReq = detail?.verificationHistory?.[0] || null;

  const doApprove = async () => {
    setActing(true); setActErr("");
    try { await onApprove(remarks || null); setMode(null); }
    catch (e) { setActErr(e.message); setActing(false); }
  };
  const doReject = async () => {
    if (!remarks.trim()) { setActErr("Rejection reason is required."); return; }
    setActing(true); setActErr("");
    try { await onReject(remarks.trim()); setMode(null); }
    catch (e) { setActErr(e.message); setActing(false); }
  };

  if (loading) return <div className="flex h-40 items-center justify-center"><RefreshCw className="h-6 w-6 animate-spin text-blue-500" /></div>;
  if (error)   return <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle className="h-4 w-4 shrink-0"/>{error}</div>;

  const s         = detail?.startup || {};
  const members   = detail?.members || [];
  const files     = detail?.files   || [];
  const history   = detail?.verificationHistory || [];
  const logoFile  = files.find(f => f.file_type === "logo");
  const certFile  = files.find(f => f.file_type === "registration_certificate")
    || (s.registration_certificate_url ? { cloud_url: s.registration_certificate_url } : null);
  const mediaFiles = files.filter(f => ["pitch_deck","demo_video"].includes(f.file_type));
  const fmt   = v => v ? String(v).replace(/_/g," ") : "â€”";
  const money = v => Number(v) > 0 ? `$${Number(v).toLocaleString()}` : "â€”";

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 text-base font-bold text-blue-700 overflow-hidden">
            {logoFile ? <img src={logoFile.cloud_url} alt="" className="h-full w-full object-cover"/> : (s.name||"S").slice(0,2).toUpperCase()}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">{s.name}</h3>
            <p className="text-xs text-slate-500">{s.industry||s.category_name||"â€”"} Â· {s.stage||"â€”"} Â· {s.country||"â€”"}</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4"/></button>
      </div>

      <div className="flex flex-wrap gap-2">
        {[["Status",fmt(s.status)],["Verification",fmt(s.verification_status)],["Funding",money(s.funding_required)],["Equity",s.equity_offered>0?`${s.equity_offered}%`:null]].map(([l,v])=>v?(
          <span key={l} className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-600">
            <span className="font-medium text-slate-400">{l}:</span> {v}
          </span>
        ):null)}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-4">
          {s.description && (
            <div className="rounded-xl border border-slate-100 bg-white p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">Description</p>
              <p className="text-sm leading-relaxed text-slate-700">{s.description}</p>
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Registration</p>
            {[["Type",fmt(s.registration_type)],["Number",s.registration_number],["Country",s.country],["Province",s.province],["District",s.district]].map(([l,v])=>v?(
              <div key={l} className="flex border-b border-slate-50 last:border-0">
                <span className="w-2/5 shrink-0 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{l}</span>
                <span className="flex-1 px-3 py-2 text-sm text-slate-800">{v}</span>
              </div>
            ):null)}
          </div>
          {(s.problem||s.solution||s.mission||s.vision||s.business_model||s.revenue_model) && (
            <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Business</p>
              {[["Problem",s.problem],["Solution",s.solution],["Mission",s.mission],["Vision",s.vision],["Business Model",s.business_model],["Revenue",s.revenue_model]].map(([l,v])=>v?(
                <div key={l} className="flex border-b border-slate-50 last:border-0">
                  <span className="w-2/5 shrink-0 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{l}</span>
                  <span className="flex-1 px-3 py-2 text-sm text-slate-800 break-words">{v}</span>
                </div>
              ):null)}
            </div>
          )}
          <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Founder</p>
            {[["Name",`${s.owner_first||""} ${s.owner_last||""}`.trim()],["Email",s.owner_email],["Headline",s.owner_headline],["Country",s.owner_country]].map(([l,v])=>v?(
              <div key={l} className="flex border-b border-slate-50 last:border-0">
                <span className="w-2/5 shrink-0 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{l}</span>
                <span className="flex-1 px-3 py-2 text-sm text-slate-800">{v}</span>
              </div>
            ):null)}
          </div>
        </div>

        <div className="space-y-4">
          {members.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Team ({members.length})</p>
              <div className="divide-y divide-slate-50">
                {members.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-xs font-bold text-blue-700 overflow-hidden">
                      {m.photo_url ? <img src={m.photo_url} alt="" className="h-full w-full object-cover rounded-full"/> : (m.name||"?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-800 truncate">{m.name}</p>
                      <p className="text-xs text-slate-500">{m.position||"Member"}{m.ownership_percentage>0?` Â· ${m.ownership_percentage}%`:""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {certFile && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">Registration Certificate</p>
              <a href={certFile.cloud_url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-50 transition">
                <FileCheck className="h-4 w-4 shrink-0"/><span className="flex-1 truncate">Open Certificate</span><ExternalLink className="h-3.5 w-3.5 shrink-0"/>
              </a>
            </div>
          )}
          {mediaFiles.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Media & Docs</p>
              <div className="divide-y divide-slate-50">
                {mediaFiles.map(f => (
                  <a key={f.id} href={f.cloud_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${f.file_type==="pitch_deck"?"bg-red-100 text-red-600":"bg-blue-100 text-blue-600"}`}>
                      {f.file_type==="pitch_deck"?"PDF":"VID"}
                    </span>
                    <span className="flex-1 text-sm text-slate-700 truncate">{f.title||fmt(f.file_type)}</span>
                    <ExternalLink className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
                  </a>
                ))}
              </div>
            </div>
          )}
          {history.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-white overflow-hidden">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400 bg-slate-50 border-b border-slate-100">Verification History</p>
              <div className="divide-y divide-slate-50">
                {history.map(h => (
                  <div key={h.id} className="px-3 py-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        h.status==="approved"?"bg-emerald-50 text-emerald-700":h.status==="rejected"?"bg-red-50 text-red-600":h.status==="under_review"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700"
                      }`}>{fmt(h.status)}</span>
                      <span className="text-xs text-slate-400">{new Date(h.created_at).toLocaleDateString()}</span>
                      {h.reviewer_first && <span className="text-xs text-slate-400">Â· {h.reviewer_first} {h.reviewer_last||""}</span>}
                    </div>
                    {h.remarks && <p className="mt-0.5 text-xs italic text-slate-500">"{h.remarks}"</p>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {canAct && mode === null && (
        <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-100">
          <button onClick={() => { setMode("approve"); setRemarks(""); setActErr(""); }}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 transition">
            <CheckCircle className="h-4 w-4"/>Approve Startup
          </button>
          <button onClick={() => { setMode("reject"); setRemarks(""); setActErr(""); }}
            className="flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-5 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100 transition">
            <X className="h-4 w-4"/>Reject
          </button>
          {latestReq?.status === "pending" && (
            <button onClick={async () => { await adminStartReview(verReqId); reload(); }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
              <Eye className="h-4 w-4"/>Mark Under Review
            </button>
          )}
        </div>
      )}

      {mode && (
        <div className={`rounded-2xl border p-4 space-y-3 ${mode==="approve"?"border-emerald-100 bg-emerald-50":"border-red-100 bg-red-50"}`}>
          <p className="text-sm font-semibold text-slate-800">{mode==="approve"?"âœ… Confirm Approval":"âŒ Confirm Rejection"}</p>
          <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
            placeholder={mode==="approve"?"Optional note for the founderâ€¦":"Rejection reason (required, visible to founder)â€¦"}
            className="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"/>
          {actErr && <p className="text-xs text-red-600">{actErr}</p>}
          <div className="flex gap-2">
            {mode==="approve"
              ? <button onClick={doApprove} disabled={acting} className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 transition">
                  {acting ? <RefreshCw className="h-4 w-4 animate-spin"/> : <CheckCircle className="h-4 w-4"/>}{acting?"Approvingâ€¦":"Confirm Approve"}
                </button>
              : <button onClick={doReject} disabled={acting||!remarks.trim()} className="flex items-center gap-1.5 rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition">
                  {acting ? <RefreshCw className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4"/>}{acting?"Rejectingâ€¦":"Confirm Reject"}
                </button>}
            <button onClick={() => { setMode(null); setActErr(""); }} className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* â”€â”€ VerificationSection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function VerificationSection() {
  const [data,       setData]      = useState({ rows: [], total: 0 });
  const [status,     setS]         = useState("pending");
  const [typeFilter, setTF]        = useState("startup_registration");
  const [page,       setP]         = useState(1);
  const [loading,    setL]         = useState(true);
  const [expanded,   setExpanded]  = useState(null);
  const [actionOk,   setActionOk]  = useState("");
  const [actionErr,  setActionErr] = useState("");

  const load = useCallback(async () => {
    setL(true);
    try {
      const params = { status, limit: 20, offset: (page - 1) * 20 };
      if (typeFilter) params.verification_type = typeFilter;
      const res = await api.get("/verifications", { params });
      setData(res.data.data ?? { rows: [], total: 0 });
      setExpanded(null);
    } catch { /**/ } finally { setL(false); }
  }, [status, typeFilter, page]);
  useEffect(() => { load(); }, [load]);

  const handleApprove = async (reqId, remarks) => {
    setActionErr(""); setActionOk("");
    try { await adminApproveVerification(reqId, remarks); setActionOk("Startup verified and published."); load(); }
    catch (e) { setActionErr(e.message); }
  };
  const handleReject = async (reqId, remarks) => {
    setActionErr(""); setActionOk("");
    try { await adminRejectVerification(reqId, remarks); setActionOk("Verification rejected."); load(); }
    catch (e) { setActionErr(e.message); }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700">
        <strong>Startup verification only.</strong> Investor accounts are auto-verified on registration.
        Review each startup's full profile, registration certificate, and team before approving.
      </div>
      {actionOk && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>âœ… {actionOk}</span>
          <button onClick={() => setActionOk("")}><X className="h-4 w-4" /></button>
        </div>
      )}
      {actionErr && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{actionErr}
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select value={typeFilter} onChange={e => { setTF(e.target.value); setP(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs">
          <option value="startup_registration">Startup Registrations</option>
          <option value="">All Types</option>
        </select>
        {["pending","under_review","approved","rejected"].map(s => (
          <button key={s} onClick={() => { setS(s); setP(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${status === s ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
            {s.replace(/_/g," ")}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{Array(5).fill(0).map((_,i) => <Skel key={i} h="h-16" />)}</div>
      ) : (data.rows||[]).length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-14 text-center">
          <ShieldCheck className="h-10 w-10 text-slate-300" />
          <p className="text-sm text-slate-400">No verification requests match this filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {(data.rows||[]).map(v => {
            const isOpen = expanded === v.id;
            const canAct = ["pending","under_review"].includes(v.status);
            return (
              <div key={v.id} className={`rounded-2xl border bg-white shadow-sm overflow-hidden transition ${isOpen ? "border-blue-200 ring-1 ring-blue-100" : "border-slate-100 hover:border-slate-200"}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700">
                    {(v.startup_name||v.first_name||"?").slice(0,2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-900 text-sm truncate">
                        {v.startup_name || `${v.first_name||""} ${v.last_name||""}`.trim()}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                        v.status==="approved"?"bg-emerald-50 text-emerald-700":v.status==="rejected"?"bg-red-50 text-red-600":v.status==="under_review"?"bg-blue-50 text-blue-700":"bg-amber-50 text-amber-700"
                      }`}>{v.status.replace(/_/g," ")}</span>
                      {canAct && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">Action needed</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{v.email} Â· {new Date(v.created_at).toLocaleDateString()}</p>
                  </div>
                  <button onClick={() => setExpanded(isOpen ? null : v.id)}
                    className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition ${isOpen ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:bg-slate-50"}`}>
                    {isOpen ? <><ChevronUp className="h-3.5 w-3.5"/>Close</> : <><Eye className="h-3.5 w-3.5"/>Review</>}
                  </button>
                </div>
                {isOpen && v.startup_id && (
                  <div className="border-t border-slate-100 px-4 py-5">
                    <StartupDetailPanel startupId={v.startup_id} verReqId={v.id} initialStatus={v.status}
                      onApprove={(r) => handleApprove(v.id, r)} onReject={(r) => handleReject(v.id, r)}
                      onClose={() => setExpanded(null)} />
                  </div>
                )}
                {isOpen && !v.startup_id && (
                  <div className="border-t border-slate-100 px-4 py-4 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2 text-sm">
                      <div><p className="text-xs text-slate-400">Applicant</p><p className="font-medium">{v.first_name} {v.last_name}</p></div>
                      <div><p className="text-xs text-slate-400">Email</p><p>{v.email}</p></div>
                      <div><p className="text-xs text-slate-400">Type</p><p className="capitalize">{v.verification_type?.replace(/_/g," ")}</p></div>
                    </div>
                    {v.document_url && (
                      <a href={v.document_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                        <ExternalLink className="h-4 w-4"/>View Document
                      </a>
                    )}
                    {canAct && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(v.id, null)}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700">Approve</button>
                        <button onClick={async () => { const r = window.prompt("Rejection reason:"); if(r?.trim()) handleReject(v.id, r.trim()); }}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100">Reject</button>
                      </div>
                    )}
                    <button onClick={() => setExpanded(null)} className="text-xs text-slate-400 hover:text-slate-600">Close â†‘</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <Pager page={page} total={data.total} onChange={setP} />
    </div>
  );
}

