import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { adminListStartups, adminSetStartupStatus } from "../../../services/adminApi";
import { Skel, Badge, Pager, TH, Dlg, sv } from "../adminShared";

export default function StartupsSection() {
  const [data,    setData] = useState({ startups: [], total: 0 });
  const [search,  setSrch] = useState("");
  const [verif,   setVerif] = useState("");
  const [page,    setP]     = useState(1);
  const [loading, setL]     = useState(true);
  const [confirm, setC]     = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListStartups({ search, verification_status: verif, page })); } catch { /**/ } finally { setL(false); }
  }, [search, verif, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSrch(e.target.value); setP(1); }} placeholder="Search startup…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <select value={verif} onChange={e => { setVerif(e.target.value); setP(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All Verification</option>
          {["pending","verified","rejected"].map(v => <option key={v}>{v}</option>)}
        </select>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[750px]">
              <TH cols={["Startup","Founder","Industry","Stage","Verification","Status","Actions"]} />
              <tbody className="divide-y divide-slate-50">
                {data.startups.map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800 max-w-[140px] truncate">{s.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.owner_first} {s.owner_last || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.industry || "—"}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{s.stage || "—"}</td>
                    <td className="px-4 py-3"><Badge label={s.verification_status} variant={sv(s.verification_status)} /></td>
                    <td className="px-4 py-3"><Badge label={s.status} variant={sv(s.status)} /></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.verification_status === "pending" && <>
                          <button onClick={() => setC({ msg: `Verify "${s.name}"?`, req: false, cb: async () => { await adminSetStartupStatus(s.id, { verification_status: "verified" }); setC(null); load(); } })}
                            className="rounded-lg bg-emerald-50 px-2 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition">Verify</button>
                          <button onClick={() => setC({ msg: `Reject "${s.name}"?`, req: true, cb: async (r) => { if (!r) return; await adminSetStartupStatus(s.id, { verification_status: "rejected", reason: r }); setC(null); load(); } })}
                            className="rounded-lg bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100 transition">Reject</button>
                        </>}
                        <button onClick={() => setC({ msg: `Suspend "${s.name}"?`, req: true, cb: async (r) => { if (!r) return; await adminSetStartupStatus(s.id, { status: "suspended", reason: r }); setC(null); load(); } })}
                          className="rounded-lg bg-amber-50 px-2 py-1 text-xs text-amber-700 hover:bg-amber-100 transition">Suspend</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.startups.length && <p className="py-12 text-center text-sm text-slate-400">No startups found.</p>}
          </div>
        )}
        <Pager page={page} total={data.total} onChange={setP} />
      </div>
    </div>
  );
}
