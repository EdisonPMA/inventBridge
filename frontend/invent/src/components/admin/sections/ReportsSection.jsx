import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { adminListReports, adminUpdateReport } from "../../../services/adminApi";
import { Skel, Badge, Pager, Dlg, sv } from "../adminShared";

export default function ReportsSection() {
  const [data,    setData] = useState({ rows: [], total: 0 });
  const [status,  setS]    = useState("");
  const [page,    setP]    = useState(1);
  const [loading, setL]    = useState(true);
  const [confirm, setC]    = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListReports({ status, page })); } catch { /**/ } finally { setL(false); }
  }, [status, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      <div className="flex flex-wrap gap-2 items-center">
        {["","pending","under_review","resolved","dismissed"].map(s => (
          <button key={s} onClick={() => { setS(s); setP(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${status === s ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
            {s || "All"}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading ? <div className="space-y-3">{Array(3).fill(0).map((_, i) => <Skel key={i} h="h-24" />)}</div> : (
        <div className="space-y-3">
          {!data.rows.length && <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">No reports found.</div>}
          {(data.rows || []).map(r => (
            <div key={r.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <Badge label={r.reason.replace(/_/g, " ")} variant="warning" />
                    <Badge label={r.target_type} />
                    <Badge label={r.status} variant={sv(r.status)} />
                  </div>
                  <p className="text-sm text-slate-700">{r.description || <em className="text-slate-400">No description.</em>}</p>
                  <p className="mt-1 text-xs text-slate-400">By: {r.reporter_first} {r.reporter_last} · Target #{r.target_id} · {new Date(r.created_at).toLocaleString()}</p>
                </div>
                {["pending","under_review"].includes(r.status) && (
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <button onClick={() => setC({ msg: `Mark as under review?`, req: false, cb: async () => { await adminUpdateReport(r.id, { status: "under_review" }); setC(null); load(); } })}
                      className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100 transition">Review</button>
                    <button onClick={() => setC({ msg: `Resolve report?`, req: true, cb: async (res) => { await adminUpdateReport(r.id, { status: "resolved", resolution: res }); setC(null); load(); } })}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition">Resolve</button>
                    <button onClick={() => setC({ msg: `Dismiss report?`, req: true, cb: async (res) => { await adminUpdateReport(r.id, { status: "dismissed", resolution: res }); setC(null); load(); } })}
                      className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 transition">Dismiss</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <Pager page={page} total={data.total} onChange={setP} />
    </div>
  );
}
