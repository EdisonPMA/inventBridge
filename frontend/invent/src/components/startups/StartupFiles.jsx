import { useState, useRef } from "react";
import { Upload, FileText, Video, Image, Trash2, ExternalLink } from "lucide-react";
import Button from "../common/Button";
import {
  uploadPitchDeck, uploadStartupDocument, uploadRegistrationCertificate,
  uploadStartupVideo, uploadStartupLogo,
  deleteStartupFile,
} from "../../services/startupApi";

const fileTypeConfig = {
  logo:                    { label: "Logo",                  icon: Image,    accept: "image/*",           uploadFn: "logo" },
  pitch_deck:              { label: "Pitch Deck",            icon: FileText, accept: ".pdf,.ppt,.pptx",   uploadFn: "pitch" },
  registration_certificate:{ label: "Registration Cert.",   icon: FileText, accept: ".pdf,.doc,.docx,.jpg,.jpeg,.png", uploadFn: "cert" },
  financial_report:        { label: "Financial Report",     icon: FileText, accept: ".pdf,.doc,.docx",    uploadFn: "doc" },
  legal_doc:               { label: "Legal Document",       icon: FileText, accept: ".pdf,.doc,.docx",    uploadFn: "doc" },
  demo_video:              { label: "Demo Video",            icon: Video,    accept: "video/*",            uploadFn: "video" },
};

function FileRow({ file, isOwner, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const cfg = fileTypeConfig[file.file_type] || { icon: FileText, label: file.file_type };
  const Icon = cfg.icon;

  const handleDelete = async () => {
    if (!window.confirm("Delete this file?")) return;
    setDeleting(true);
    try { await onDelete(file.id); }
    finally { setDeleting(false); }
  };

  const sizeLabel = file.file_size
    ? file.file_size > 1_000_000
      ? `${(file.file_size / 1_000_000).toFixed(1)} MB`
      : `${Math.round(file.file_size / 1024)} KB`
    : null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 hover:border-slate-200 transition">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium text-slate-800">{file.title || cfg.label}</p>
        <p className="text-xs text-slate-400">
          {cfg.label}{sizeLabel ? ` · ${sizeLabel}` : ""}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <a href={file.cloud_url} target="_blank" rel="noopener noreferrer"
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary transition">
          <ExternalLink className="h-4 w-4" />
        </a>
        {isOwner && (
          <button disabled={deleting} onClick={handleDelete}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-50 transition">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

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
      if (uploadFn === "logo")   result = await uploadStartupLogo(startupId, file);
      else if (uploadFn === "pitch") result = await uploadPitchDeck(startupId, file, label);
      else if (uploadFn === "video") result = await uploadStartupVideo(startupId, file, label);
      else if (uploadFn === "cert")  result = await uploadRegistrationCertificate(startupId, file, label);
      else result = await uploadStartupDocument(startupId, file, fileType, label);
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
      <button type="button" disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500 hover:border-primary hover:text-primary disabled:opacity-50 transition w-full justify-center">
        <Upload className="h-4 w-4" />
        {uploading ? `Uploading ${label}…` : `Upload ${label}`}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

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
