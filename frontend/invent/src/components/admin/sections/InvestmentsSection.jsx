import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { adminListInvestments, adminSuspendInvestment } from "../../../services/adminApi";
import { Skel, Badge, Pager, TH, Dlg, sv } from "../adminShared";

export default function InvestmentsSection() {
  const [data,    setData] = useState({ investments: [], total: 0 });
  const [status,  setS]    = useState("");
  const [page,    setP]    = useState(1);
  const [loading, setL]    = useState(true);
  const [confirm, setC]    = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListInvestments({ status, page })); } catch { /**/ } finally { setL(false); }
  }, [status, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      <div className="flex flex-wrap gap-2 items-center">
        {["","pending","negotiating","accepted","rejected","cancelled"].map(s => (
          <button key={s} onClick={() => { setS(s); setP(1); }}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${status === s ? "bg-blue-600 text-white" : "border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
            {s || "All"}
          </button>
        ))}
        <button onClick={load} className="ml-auto rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <TH cols={["Investor","Startup","Amount","Equity","Status","Date","Actions"]} />
              <tbody className="divide-y divide-slate-50">
                {data.investments.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{inv.investor_first} {inv.investor_last || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-600 max-w-[130px] truncate">{inv.startup_name}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">${Number(inv.offered_amount).toLocaleString()}</td>
                    <td className="px-4 py-3 text-slate-600">{inv.equity_percentage}%</td>
                    <td className="px-4 py-3"><Badge label={inv.status} variant={sv(inv.status)} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {!["cancelled","rejected","finalized"].includes(inv.status) && (
                        <button onClick={() => setC({ msg: `Suspend offer from ${inv.investor_first}?`, req: true, cb: async (r) => { if (!r) return; await adminSuspendInvestment(inv.id, r); setC(null); load(); } })}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 transition">Suspend</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.investments.length && <p className="py-12 text-center text-sm text-slate-400">No investment offers.</p>}
          </div>
        )}
        <Pager page={page} total={data.total} onChange={setP} />
      </div>
    </div>
  );
}

