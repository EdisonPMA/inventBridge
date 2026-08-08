/**
 * VideoUploader — file picker for startup demo/promo videos.
 * Shows filename, file size, and a local video preview after selection.
 * Upload is explicit (user must click Upload button) given file size.
 *
 * Props:
 *   onUpload(file, onProgress) => Promise<data>
 *   label?
 *   maxMB?   — default 200
 *   disabled?
 */
import { useRef, useState } from "react";
import { Video, X, Upload, AlertCircle, Check, Play } from "lucide-react";
import UploadProgress from "./UploadProgress";
import { validateFile, formatFileSize } from "../../services/uploadApi";

export default function VideoUploader({
  onUpload,
  label = "Upload Video",
  maxMB = 200,
  disabled = false,
}) {
  const inputRef              = useRef(null);
  const [file, setFile]         = useState(null);
  const [previewUrl, setPreview] = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState("idle");
  const [error, setError]       = useState(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFileSelect(selected) {
    if (!selected) return;

    const check = validateFile(selected, "video");
    if (!check.valid) { setError(check.error); return; }
    if (selected.size > maxMB * 1024 * 1024) {
      setError(`File is too large. Maximum is ${maxMB} MB.`);
      return;
    }

    setError(null);
    setFile(selected);
    setStatus("ready");
    setPreview(URL.createObjectURL(selected));
  }

  async function handleUpload() {
    if (!file || status === "uploading") return;

    setStatus("uploading");
    setProgress(0);
    setError(null);

    try {
      await onUpload(file, (pct) => setProgress(pct));
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err.message || "Upload failed. Please try again.");
    }
  }

  function remove() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreview(null);
    setStatus("idle");
    setError(null);
    setProgress(0);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  const isUploading = status === "uploading";
  const isReady     = status === "ready";
  const isSuccess   = status === "success";

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">{label}</label>
      )}

      {/* Drop zone — shown when no file selected */}
      {status === "idle" && (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver ? "border-primary bg-primary/5" : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5"
          } ${disabled ? "pointer-events-none opacity-60" : ""}`}
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={`${label}. Click or drag to upload.`}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
            <Play className="h-7 w-7 text-primary" aria-hidden="true" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-600">Click to select video or drag here</p>
            <p className="mt-0.5 text-xs text-slate-400">MP4, WEBM, MOV · Max {maxMB} MB</p>
          </div>
        </div>
      )}

      {/* File selected card */}
      {(isReady || isUploading || isSuccess) && file && (
        <div className={`overflow-hidden rounded-2xl border ${isSuccess ? "border-green-200" : "border-slate-200"}`}>
          {/* Local video preview */}
          {previewUrl && (
            <video
              src={previewUrl}
              controls
              className="w-full max-h-56 bg-black"
              aria-label="Video preview"
            />
          )}

          <div className="p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(file.size)}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {isReady && (
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={disabled}
                    className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition"
                    aria-label="Upload video"
                  >
                    <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Upload
                  </button>
                )}
                {isSuccess && (
                  <span className="flex items-center gap-1 text-xs font-medium text-green-600">
                    <Check className="h-3.5 w-3.5" aria-hidden="true" /> Uploaded
                  </span>
                )}
                {!isUploading && (
                  <button
                    type="button"
                    onClick={remove}
                    disabled={disabled}
                    aria-label="Remove video"
                    className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {isUploading && (
              <div className="mt-3">
                <UploadProgress progress={progress} status="uploading" />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {(error || status === "error") && (
        <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error || "Upload failed. Please try again."}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="sr-only"
        aria-hidden="true"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); e.target.value = ""; }}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
