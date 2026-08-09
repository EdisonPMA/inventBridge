import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { adminListSuspended } from "../../../services/adminApi";
import api from "../../../services/api";
import { Skel, Badge, Pager, TH, Dlg } from "../adminShared";

export default function SuspendedSection() {
  const [data,    setData] = useState({ users: [], total: 0 });
  const [page,    setP]    = useState(1);
  const [loading, setL]    = useState(true);
  const [confirm, setC]    = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListSuspended({ page })); } catch { /**/ } finally { setL(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{data.total} suspended account{data.total !== 1 ? "s" : ""}</p>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <TH cols={["Name","Email","Role","Since","Actions"]} />
              <tbody className="divide-y divide-slate-50">
                {data.users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.first_name} {u.last_name || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={u.role} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => setC({ msg: `Reactivate ${u.email}?`, req: false, cb: async () => { await api.patch(`/admin/users/${u.id}/status`, { status: "active" }); setC(null); load(); } })}
                        className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition">Reactivate</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.users.length && <p className="py-12 text-center text-sm text-slate-400">No suspended accounts.</p>}
          </div>
        )}
        <Pager page={page} total={data.total} onChange={setP} />
      </div>
    </div>
  );
}

