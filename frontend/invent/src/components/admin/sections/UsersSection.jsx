import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { adminListUsers, adminSetUserStatus, adminSetUserRole } from "../../../services/adminApi";
import { Skel, Badge, Pager, TH, Dlg, RoleModal, sv } from "../adminShared";

export default function UsersSection() {
  const [data,      setData]  = useState({ users: [], total: 0 });
  const [search,    setSearch] = useState("");
  const [role,      setRole]   = useState("");
  const [status,    setStatus] = useState("");
  const [page,      setPage]   = useState(1);
  const [loading,   setL]      = useState(true);
  const [confirm,   setC]      = useState(null);
  const [roleModal, setRoleModal] = useState(null); // replaces window.prompt

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListUsers({ search, role, status, page })); } catch { /**/ } finally { setL(false); }
  }, [search, role, status, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      {roleModal && (
        <RoleModal
          user={roleModal}
          onConfirm={async (newRole) => {
            await adminSetUserRole(roleModal.id, newRole);
            setRoleModal(null);
            load();
          }}
          onCancel={() => setRoleModal(null)}
        />
      )}

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name or email…"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <select value={role} onChange={e => { setRole(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All Roles</option>
          {["inventor","investor","organization","admin"].map(r => <option key={r}>{r}</option>)}
        </select>
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
          <option value="">All Statuses</option>
          {["active","suspended","pending"].map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[700px]">
              <TH cols={["Name","Email","Role","Status","Joined","Actions"]} />
              <tbody className="divide-y divide-slate-50">
                {data.users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{u.first_name} {u.last_name || ""}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">{u.email}</td>
                    <td className="px-4 py-3"><Badge label={u.role} variant={u.role==="admin"?"danger":u.role==="investor"?"info":"default"} /></td>
                    <td className="px-4 py-3"><Badge label={u.status} variant={sv(u.status)} /></td>
                    <td className="px-4 py-3 text-xs text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {u.status === "active"
                          ? <button onClick={() => setC({ msg: `Suspend ${u.email}?`, req: true, cb: async (r) => { if (!r) return; await adminSetUserStatus(u.id, "suspended", r); setC(null); load(); } })}
                              className="rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 transition">Suspend</button>
                          : <button onClick={() => setC({ msg: `Reactivate ${u.email}?`, req: false, cb: async () => { await adminSetUserStatus(u.id, "active"); setC(null); load(); } })}
                              className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition">Activate</button>}
                        <button onClick={() => setRoleModal(u)}
                          className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 transition">Role</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.users.length && <p className="py-12 text-center text-sm text-slate-400">No users found.</p>}
          </div>
        )}
        <Pager page={page} total={data.total} onChange={setPage} />
      </div>
    </div>
  );
}
