import { useState, useRef } from "react";
import { Upload, FileText, Video, Image, Trash2, Download, Eye, Lock, X } from "lucide-react";
import {
  uploadPitchDeck, uploadStartupDocument, uploadRegistrationCertificate,
  uploadStartupVideo, uploadStartupLogo, deleteStartupFile,
} from "../../services/startupApi";
import { getSecureFileUrl } from "../../services/uploadApi";

const fileTypeConfig = {
  logo:                    { label: "Logo",                  icon: Image,    accept: "image/*",                              uploadFn: "logo"  },
  pitch_deck:              { label: "Pitch Deck",            icon: FileText, accept: ".pdf,.ppt,.pptx",                     uploadFn: "pitch" },
  registration_certificate:{ label: "Registration Cert.",   icon: FileText, accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png",     uploadFn: "cert"  },
  financial_report:        { label: "Financial Report",     icon: FileText, accept: ".pdf,.doc,.docx",                     uploadFn: "doc"   },
  legal_doc:               { label: "Legal Document",       icon: FileText, accept: ".pdf,.doc,.docx",                     uploadFn: "doc"   },
  demo_video:              { label: "Demo Video",            icon: Video,    accept: "video/*",                              uploadFn: "video" },
};

/* ── File viewer modal ────────────────────────── */
function FileViewer({ url, mimeType, title, onClose }) {
  const isImage  = mimeType?.startsWith("image/");
  const isVideo  = mimeType?.startsWith("video/");
  const isPdf    = mimeType === "application/pdf";
  const isDoc    = !isImage && !isVideo && !isPdf;

  function handleDownload() {
    const a = document.createElement("a");
    a.href = url;
    a.download = title || "document";
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <p className="font-semibold text-slate-800 truncate text-sm">{title || "Document"}</p>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 transition"
            >
              <Download className="h-3.5 w-3.5" /> Download
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-slate-50 p-2 min-h-[400px]">
          {isImage && (
            <img src={url} alt={title} className="mx-auto max-h-[70vh] object-contain rounded-lg" />
          )}
          {isVideo && (
            <video src={url} controls className="mx-auto w-full max-h-[70vh] rounded-lg" />
          )}
          {isPdf && (
            <iframe
              src={`${url}#toolbar=1`}
              title={title}
              className="w-full h-[70vh] rounded-lg border-0"
            />
          )}
          {isDoc && (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <FileText className="h-16 w-16 text-slate-300" />
              <p className="text-sm text-slate-500">Preview not available for this file type.</p>
              <button
                onClick={handleDownload}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition"
              >
                <Download className="h-4 w-4" /> Download to view
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Single file row ──────────────────────────── */
function FileRow({ file, isOwner, onDelete }) {
  const [deleting,  setDeleting]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [viewer,    setViewer]    = useState(null); // { url, mimeType, title }
  const cfg  = fileTypeConfig[file.file_type] || { icon: FileText, label: file.file_type };
  const Icon = cfg.icon;

  const sizeLabel = file.file_size
    ? file.file_size > 1_000_000
      ? `${(file.file_size / 1_000_000).toFixed(1)} MB`
      : `${Math.round(file.file_size / 1024)} KB`
    : null;

  async function openFile() {
    setLoading(true);
    try {
      let url;
      let mimeType = file.mime_type;

      if (file.is_private || !file.cloud_url) {
        // Private file — get a short-lived signed URL from backend
        const res = await getSecureFileUrl(file.id);
        url = res.data?.signed_url || res.data?.cloud_url;
        mimeType = res.data?.mime_type || mimeType;
      } else {
        url = file.cloud_url;
      }

      if (!url) throw new Error("Could not get file URL.");
      setViewer({ url, mimeType, title: file.title || cfg.label });
    } catch (err) {
      alert(err.message || "Could not open file.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this file?")) return;
    setDeleting(true);
    try { await onDelete(file.id); }
    finally { setDeleting(false); }
  }

  return (
    <>
      {viewer && (
        <FileViewer
          url={viewer.url}
          mimeType={viewer.mimeType}
          title={viewer.title}
          onClose={() => setViewer(null)}
        />
      )}
      <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          {file.is_private
            ? <Lock className="h-4 w-4 text-amber-500" />
            : <Icon className="h-4 w-4 text-slate-500" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{file.title || cfg.label}</p>
          <p className="text-xs text-slate-400">
            {cfg.label}{file.is_private ? " · 🔒 Private" : ""}{sizeLabel ? ` · ${sizeLabel}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openFile}
            disabled={loading}
            title="View file"
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-primary disabled:opacity-50 transition"
          >
            <Eye className="h-3.5 w-3.5" />
            {loading ? "…" : "View"}
          </button>
          {isOwner && (
            <button
              disabled={deleting}
              onClick={handleDelete}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

/* ── Upload zone ─────────────────────────────── */
function UploadZone({ startupId, fileType, label, accept, uploadFn, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setError("");
    try {
      let result;
      if      (uploadFn === "logo")  result = await uploadStartupLogo(startupId, file);
      else if (uploadFn === "pitch") result = await uploadPitchDeck(startupId, file, label);
      else if (uploadFn === "video") result = await uploadStartupVideo(startupId, file, label);
      else if (uploadFn === "cert")  result = await uploadRegistrationCertificate(startupId, file, label);
      else                           result = await uploadStartupDocument(startupId, file, fileType, label);
      onUploaded?.(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 hover:border-primary hover:text-primary disabled:opacity-50 transition w-full justify-center"
      >
        <Upload className="h-4 w-4" />
        {uploading ? `Uploading ${label}…` : `Upload ${label}`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

/* ── Main component ──────────────────────────── */
export default function StartupFiles({ startupId, files = [], isOwner = false, onUpdate }) {
  const grouped = Object.fromEntries(
    Object.keys(fileTypeConfig).map((k) => [k, files.filter((f) => f.file_type === k)])
  );

  const handleDelete = async (fileId) => {
    await deleteStartupFile(startupId, fileId);
    onUpdate?.();
  };

  return (
    <div className="space-y-6">
      {Object.entries(fileTypeConfig).map(([type, cfg]) => (
        <div key={type}>
          <h4 className="mb-2 text-sm font-semibold text-slate-700 flex items-center gap-2">
            <cfg.icon className="h-4 w-4 text-slate-400" />
            {cfg.label}
          </h4>
          <div className="space-y-2">
            {grouped[type].map((f) => (
              <FileRow key={f.id} file={f} isOwner={isOwner} onDelete={handleDelete} />
            ))}
            {isOwner && (
              <UploadZone
                startupId={startupId}
                fileType={type}
                label={cfg.label}
                accept={cfg.accept}
                uploadFn={cfg.uploadFn}
                onUploaded={() => onUpdate?.()}
              />
            )}
            {!isOwner && grouped[type].length === 0 && (
              <p className="text-xs text-slate-400 italic">No {cfg.label.toLowerCase()} uploaded.</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
