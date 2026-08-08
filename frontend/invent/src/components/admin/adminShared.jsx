/**
 * Shared primitives used across all admin section components.
 * Import from here — never duplicate these in section files.
 */
import { useState } from "react";

// ── Skeleton loader ──────────────────────────────────────────────────────────
export function Skel({ h = "h-24" }) {
  return <div className={`animate-pulse rounded-2xl bg-slate-100 ${h}`} />;
}

// ── Status badge ─────────────────────────────────────────────────────────────
export const BADGE = {
  success: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border border-amber-200",
  danger:  "bg-red-50 text-red-600 border border-red-200",
  info:    "bg-blue-50 text-blue-700 border border-blue-200",
  purple:  "bg-violet-50 text-violet-700 border border-violet-200",
  default: "bg-slate-100 text-slate-600 border border-slate-200",
};

export function Badge({ label, variant = "default" }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${BADGE[variant] || BADGE.default}`}>
      {String(label || "").replace(/_/g, " ")}
    </span>
  );
}

// ── Status → variant mapper ───────────────────────────────────────────────────
export function sv(s) {
  const m = {
    active: "success", verified: "success", approved: "success", resolved: "success",
    pending: "warning", under_review: "warning",
    suspended: "danger", rejected: "danger", dismissed: "danger", cancelled: "danger",
    negotiating: "info", accepted: "success", finalized: "purple",
  };
  return m[s] || "default";
}

// ── Pagination ────────────────────────────────────────────────────────────────
export function Pager({ page, total, limit = 20, onChange }) {
  const pages = Math.ceil((total || 0) / limit);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-sm">
      <span className="text-slate-500">{total} total · page {page} of {pages}</span>
      <div className="flex gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 transition">← Prev</button>
        <button disabled={page >= pages} onClick={() => onChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 disabled:opacity-40 transition">Next →</button>
      </div>
    </div>
  );
}

// ── Table header ─────────────────────────────────────────────────────────────
export function TH({ cols }) {
  return (
    <thead>
      <tr className="border-b border-slate-100 bg-slate-50 text-left">
        {cols.map(c => <th key={c} className="px-4 py-3 text-xs font-medium text-slate-500">{c}</th>)}
      </tr>
    </thead>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────────
export function Dlg({ message, onConfirm, onCancel, requireReason = false }) {
  const [r, setR] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
        <p className="mb-4 text-sm font-medium text-slate-800">{message}</p>
        {requireReason && (
          <textarea value={r} onChange={e => setR(e.target.value)}
            placeholder="Reason (required)…" rows={3}
            className="mb-4 w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none" />
        )}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={() => onConfirm(r)} disabled={requireReason && !r.trim()}
            className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition">Confirm</button>
        </div>
      </div>
    </div>
  );
}

// ── Role change modal (replaces window.prompt) ────────────────────────────────
export function RoleModal({ user, onConfirm, onCancel }) {
  const [role, setRole] = useState(user.role);
  const ROLES = ["inventor", "investor", "organization", "admin"];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-semibold text-slate-800">Change Role</h3>
        <p className="text-xs text-slate-500">User: <span className="font-medium text-slate-700">{user.email}</span></p>
        <select value={role} onChange={e => setRole(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-blue-400 focus:outline-none">
          {ROLES.map(r => <option key={r} value={r} className="capitalize">{r}</option>)}
        </select>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition">Cancel</button>
          <button onClick={() => onConfirm(role)} disabled={role === user.role}
            className="flex-1 rounded-xl bg-blue-600 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition">
            Update Role
          </button>
        </div>
      </div>
    </div>
  );
}
