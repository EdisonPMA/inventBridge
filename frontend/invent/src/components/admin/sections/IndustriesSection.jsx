import { useState, useEffect, useCallback } from "react";
import { RefreshCw, AlertCircle, Layers } from "lucide-react";
import api from "../../../services/api";
import { Skel, Badge } from "../adminShared";

export default function IndustriesSection() {
  const [industries, setIndustries] = useState([]);
  const [loading,    setL]          = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [error,      setError]      = useState("");
  const [modal,      setModal]      = useState(null);
  const [name,       setName]       = useState("");
  const [desc,       setDesc]       = useState("");
  const [icon,       setIcon]       = useState("");
  const [status,     setStatus]     = useState("active");
  const [confirm,    setConfirm]    = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { const res = await api.get("/industries"); setIndustries(res.data.industries ?? []); }
    catch (e) { setError(e.message); }
    finally { setL(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  function openAdd()  { setName(""); setDesc(""); setIcon(""); setStatus("active"); setModal({ mode: "add" }); }
  function openEdit(ind) { setName(ind.name); setDesc(ind.description || ""); setIcon(ind.icon || ""); setStatus(ind.status || "active"); setModal({ mode: "edit", ind }); }

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      if (modal.mode === "add") {
        await api.post("/industries", { name: name.trim(), description: desc.trim() || null, icon: icon.trim() || null });
      } else {
        await api.put(`/industries/${modal.ind.id}`, { name: name.trim(), description: desc.trim() || null, icon: icon.trim() || null, status });
      }
      setModal(null); await load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(ind) {
    setConfirm(null);
    try { await api.delete(`/industries/${ind.id}`); await load(); }
    catch (e) { setError(e.message); }
  }

  return (
    <div className="space-y-4">
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4">
            <h3 className="font-semibold text-slate-800">{modal.mode === "add" ? "Add Industry" : "Edit Industry"}</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Name <span className="text-red-500">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HealthTech"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
                <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={2} placeholder="Short descriptionâ€¦"
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Icon name / emoji</label>
                <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g. ðŸ¥ or heart-pulse"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
              </div>
              {modal.mode === "edit" && (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Status</label>
                  <select value={status} onChange={e => setStatus(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              )}
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <button onClick={() => { setModal(null); setError(""); }}
                className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={handleSave} disabled={saving || !name.trim()}
                className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition">
                {saving ? "Savingâ€¦" : modal.mode === "add" ? "Add Industry" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <p className="mb-4 text-sm font-medium text-slate-800">
              Delete <strong>{confirm.name}</strong>? This cannot be undone and will fail if startups are using this industry.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirm(null)} className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
              <button onClick={() => handleDelete(confirm)} className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 transition">Delete</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{industries.length} industries</p>
        <div className="flex gap-2">
          <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button onClick={openAdd} className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition">
            <Layers className="h-4 w-4" /> Add Industry
          </button>
        </div>
      </div>

      {error && !modal && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />{error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden">
        {loading ? <div className="p-4 space-y-2">{Array(5).fill(0).map((_, i) => <Skel key={i} h="h-10" />)}</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left">
                  {["Icon","Name","Description","Startups","Status","Actions"].map(c => (
                    <th key={c} className="px-4 py-3 text-xs font-medium text-slate-500">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {industries.map(ind => (
                  <tr key={ind.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-lg">{ind.icon || <span className="text-slate-300 text-xs">â€”</span>}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{ind.name}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 max-w-[220px] truncate">{ind.description || <span className="text-slate-300">â€”</span>}</td>
                    <td className="px-4 py-3 text-slate-700">{ind.startup_count ?? 0}</td>
                    <td className="px-4 py-3"><Badge label={ind.status} variant={ind.status === "active" ? "success" : "default"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        <button onClick={() => openEdit(ind)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-200 transition">Edit</button>
                        <button onClick={() => setConfirm(ind)} disabled={(ind.startup_count ?? 0) > 0}
                          title={(ind.startup_count ?? 0) > 0 ? "Cannot delete â€” has startups" : "Delete industry"}
                          className="rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 disabled:opacity-40 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!industries.length && <p className="py-12 text-center text-sm text-slate-400">No industries yet. Add one above.</p>}
          </div>
        )}
      </div>
    </div>
  );
}

