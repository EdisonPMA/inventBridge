import { useRef, useState } from "react";
import { Plus, Trash2, Save, X, Pencil, User, Camera, Loader2 } from "lucide-react";
import Button from "../common/Button";
import { addMember, removeMember, updateMember, uploadMemberPhoto } from "../../services/startupApi";

const EMPTY_FORM = { name: "", email: "", position: "", bio: "", ownership_percentage: "" };
const inputCls = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20";

/* ── Member avatar with optional photo upload ────── */
function MemberAvatar({ member, startupId, isOwner, onPhotoUploaded }) {
  const inputRef   = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState("");

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Reset so same file can be re-selected after an error
    e.target.value = "";
    setUploading(true);
    setError("");
    try {
      await uploadMemberPhoto(startupId, member.id, file);
      onPhotoUploaded?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="relative shrink-0">
      {/* Circle avatar */}
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light overflow-hidden text-primary">
        {member.photo_url ? (
          <img src={member.photo_url} alt={member.name}
            className="h-full w-full object-cover rounded-full" />
        ) : (
          <User className="h-5 w-5" />
        )}
      </div>

      {/* Camera overlay button — owner only */}
      {isOwner && (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            title="Upload photo"
            className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-white border border-slate-200 shadow-sm text-slate-500 hover:text-primary hover:border-primary transition disabled:opacity-50">
            {uploading
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Camera className="h-3 w-3" />
            }
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </>
      )}

      {/* Inline upload error tooltip */}
      {error && (
        <p className="absolute left-0 top-12 z-10 w-48 rounded-lg border border-red-200 bg-white px-2 py-1 text-xs text-red-600 shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}

/* ── Inline member form (add / edit) ─────────────── */
function MemberForm({ initial = EMPTY_FORM, onSave, onCancel, saving, title }) {
  const [form, setForm] = useState(initial);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name:                form.name.trim(),
      email:               form.email.trim()               || null,
      position:            form.position.trim()            || null,
      bio:                 form.bio.trim()                  || null,
      ownership_percentage: form.ownership_percentage !== ""
        ? parseFloat(form.ownership_percentage) : 0,
    });
  };

  return (
    <form onSubmit={handleSubmit}
      className="rounded-2xl border border-primary/20 bg-primary-light/30 p-4 space-y-3">
      <p className="text-sm font-medium text-slate-700">{title}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Full Name *</label>
          <input type="text" required value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Alice Kamau"
            className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Email (optional)</label>
          <input type="email" value={form.email}
            onChange={(e) => set("email", e.target.value)}
            placeholder="alice@example.com"
            className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Position</label>
          <input type="text" value={form.position}
            onChange={(e) => set("position", e.target.value)}
            placeholder="CTO, Designer, Advisor…"
            className={inputCls} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-600">Equity %</label>
          <input type="number" min="0" max="100" step="0.01" value={form.ownership_percentage}
            onChange={(e) => set("ownership_percentage", e.target.value)}
            placeholder="0"
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-600">Short Bio (optional)</label>
        <textarea value={form.bio} rows={2}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="Brief background or role description…"
          maxLength={500}
          className={inputCls + " resize-none"} />
      </div>

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={saving || !form.name.trim()}>
          <Save className="h-3.5 w-3.5" />{saving ? "Saving…" : "Save"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          <X className="h-3.5 w-3.5" /> Cancel
        </Button>
      </div>
    </form>
  );
}

/* ── Main component ──────────────────────────────── */
export default function StartupTeam({ startupId, members = [], isOwner = false, onUpdate }) {
  const [adding,  setAdding]  = useState(false);
  const [editing, setEditing] = useState(null);   // member id being edited
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const handleAdd = async (data) => {
    setSaving(true); setError("");
    try {
      await addMember(startupId, data);
      setAdding(false);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (memberId, data) => {
    setSaving(true); setError("");
    try {
      await updateMember(startupId, memberId, data);
      setEditing(null);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (memberId) => {
    if (!window.confirm("Remove this team member?")) return;
    setError("");
    try {
      await removeMember(startupId, memberId);
      onUpdate?.();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-slate-800">Team Members</h3>
        {isOwner && !adding && (
          <Button size="sm" variant="secondary"
            onClick={() => { setAdding(true); setEditing(null); }}>
            <Plus className="h-4 w-4" /> Add Member
          </Button>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </p>
      )}

      {/* Add form */}
      {adding && (
        <MemberForm
          title="Add Team Member"
          saving={saving}
          onSave={handleAdd}
          onCancel={() => { setAdding(false); setError(""); }}
        />
      )}

      {/* Members list */}
      {members.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">No team members yet.</p>
      ) : (
        <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden shadow-sm">
          {members.map((m) => (
            <div key={m.id}>
              {editing === m.id ? (
                <div className="p-3">
                  <MemberForm
                    title="Edit Member"
                    initial={{
                      name:                m.name  || "",
                      email:               m.email || "",
                      position:            m.position || "",
                      bio:                 m.bio   || "",
                      ownership_percentage: m.ownership_percentage ?? "",
                    }}
                    saving={saving}
                    onSave={(data) => handleUpdate(m.id, data)}
                    onCancel={() => { setEditing(null); setError(""); }}
                  />
                </div>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">
                  {/* Avatar with photo upload */}
                  <MemberAvatar
                    member={m}
                    startupId={startupId}
                    isOwner={isOwner}
                    onPhotoUploaded={onUpdate}
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {m.name}
                      {m.position && (
                        <span className="ml-2 text-xs text-slate-400">· {m.position}</span>
                      )}
                    </p>
                    {m.email && (
                      <p className="text-xs text-slate-500">{m.email}</p>
                    )}
                    {m.bio && (
                      <p className="mt-0.5 text-xs text-slate-400 line-clamp-2">{m.bio}</p>
                    )}
                    {m.ownership_percentage > 0 && (
                      <span className="mt-0.5 inline-block text-xs font-medium text-primary">
                        {m.ownership_percentage}% equity
                      </span>
                    )}
                  </div>

                  {/* Edit / Remove actions */}
                  {isOwner && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => { setEditing(m.id); setAdding(false); setError(""); }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                        title="Edit member">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(m.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                        title="Remove member">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
