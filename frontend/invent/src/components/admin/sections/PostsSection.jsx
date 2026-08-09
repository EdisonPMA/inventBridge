import { useState, useEffect, useCallback } from "react";
import { Search, RefreshCw } from "lucide-react";
import { adminListPosts, adminSetPostStatus } from "../../../services/adminApi";
import { Skel, Badge, Pager, Dlg } from "../adminShared";

export default function PostsSection() {
  const [data,    setData] = useState({ posts: [], total: 0 });
  const [search,  setSrch] = useState("");
  const [page,    setP]    = useState(1);
  const [loading, setL]    = useState(true);
  const [confirm, setC]    = useState(null);

  const load = useCallback(async () => {
    setL(true);
    try { setData(await adminListPosts({ search, page })); } catch { /**/ } finally { setL(false); }
  }, [search, page]);
  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      {confirm && <Dlg message={confirm.msg} requireReason={confirm.req} onConfirm={confirm.cb} onCancel={() => setC(null)} />}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => { setSrch(e.target.value); setP(1); }} placeholder="Search post contentâ€¦"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm focus:outline-none focus:border-blue-400" />
        </div>
        <button onClick={load} className="rounded-xl border border-slate-200 px-3 py-2 text-slate-500 hover:bg-slate-50">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading ? <div className="space-y-3">{Array(4).fill(0).map((_, i) => <Skel key={i} h="h-20" />)}</div> : (
        <div className="space-y-3">
          {!data.posts.length && <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm text-slate-400">No posts found.</div>}
          {data.posts.map(p => (
            <div key={p.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800">{p.first_name} {p.last_name || ""}</p>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">{p.content}</p>
                  <div className="mt-1 flex gap-3 text-xs text-slate-400">
                    <span>ðŸ‘ {p.like_count}</span><span>ðŸ’¬ {p.comment_count}</span>
                    <Badge label={p.visibility} />
                    <span>{new Date(p.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button onClick={() => setC({ msg: "Hide this post?", req: false, cb: async () => { await adminSetPostStatus(p.id, "hide"); setC(null); load(); } })}
                    className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700 hover:bg-amber-100 transition">Hide</button>
                  <button onClick={() => setC({ msg: "Restore this post?", req: false, cb: async () => { await adminSetPostStatus(p.id, "restore"); setC(null); load(); } })}
                    className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 hover:bg-emerald-100 transition">Restore</button>
                  <button onClick={() => setC({ msg: "Remove this post permanently?", req: false, cb: async () => { await adminSetPostStatus(p.id, "remove"); setC(null); load(); } })}
                    className="rounded-lg bg-red-50 px-2.5 py-1 text-xs text-red-600 hover:bg-red-100 transition">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Pager page={page} total={data.total} onChange={setP} />
    </div>
  );
}

