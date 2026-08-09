import { useState, useEffect, useCallback } from "react";
import { RefreshCw } from "lucide-react";
import { adminGetAuditLogs } from "../../../services/adminApi";
import { Skel, Badge, Pager, TH } from "../adminShared";

export default function AuditSection() {
  const [data,    setData] = useState({ rows: [], total: 0 });
  const [page,    setP]    = useState(1);
  const [loading, setL]    = useState(true);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminGetAuditLogs({ page, limit: 30 })); } catch { /**/ } finally { setL(false); }
  }, [page]);
  useEffect(() => { load(); }, [load]);

  function fmt(details) {
    if (!details) return "â€”";
    try { const d = JSON.parse(details); return d.reason || JSON.stringify(d); } catch { return details; }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{data.total} audit entries (read-only)</p>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[620px]">
              <TH cols={["Admin","Action","Target","Details","Date"]} />
              <tbody className="divide-y divide-slate-50">
                {data.rows.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-800">{l.first_name} {l.last_name || ""}</td>
                    <td className="px-4 py-3"><Badge label={l.action.replace(/_/g, " ")} variant="info" /></td>
                    <td className="px-4 py-3 text-xs text-slate-500">{l.target_type} #{l.target_id}</td>
                    <td className="px-4 py-3 text-xs text-slate-400 max-w-[200px] truncate">{fmt(l.details)}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(l.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.rows.length && <p className="py-12 text-center text-sm text-slate-400">No audit entries.</p>}
          </div>
        )}
        <Pager page={page} total={data.total} limit={30} onChange={setP} />
      </div>
    </div>
  );
}

