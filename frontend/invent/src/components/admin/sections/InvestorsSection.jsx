import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { adminListInvestors } from "../../../services/adminApi";
import api from "../../../services/api";
import { Skel, Badge, Pager, TH, Dlg, sv } from "../adminShared";

export default function InvestorsSection() {
  const [data,    setData] = useState({ investors: [], total: 0 });
  const [search,  setSrch] = useState("");
  const [page,    setP]    = useState(1);
  const [loading, setL]    = useState(true);
  const [confirm, setC]    = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListInvestors({ search, page })); } catch { /**/ } finally { setL(false); }
  }, [search, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSrch(e.target.value); setP(1); }} placeholder="Search investorâ€¦"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <TH cols={["Investor","Email","Verification","Investments","Status","Actions"]} />
              <tbody className="divide-y divide-slate-50">
                {data.investors.map(inv => (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{inv.first_name} {inv.last_name || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[170px] truncate">{inv.email}</td>
                    <td className="px-4 py-3"><Badge label={inv.verification_level || "unverified"} variant={sv(inv.verification_level)} /></td>
                    <td className="px-4 py-3 text-slate-700">{inv.investment_count ?? 0}</td>
                    <td className="px-4 py-3"><Badge label={inv.status} variant={sv(inv.status)} /></td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          const ns = inv.status === "active" ? "suspended" : "active";
                          setC({ msg: `${ns === "suspended" ? "Suspend" : "Activate"} ${inv.email}?`, req: ns === "suspended",
                            cb: async (r) => { await api.patch(`/admin/users/${inv.id}/status`, { status: ns, reason: r }); setC(null); load(); }
                          });
                        }}
                        className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${inv.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"}`}>
                        {inv.status === "active" ? "Suspend" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.investors.length && <p className="py-12 text-center text-sm text-slate-400">No investors found.</p>}
          </div>
        )}
        <Pager page={page} total={data.total} onChange={setP} />
      </div>
    </div>
  );
}

