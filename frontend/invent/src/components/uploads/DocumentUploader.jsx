/**
 * DocumentUploader — file picker for PDFs, Word and PowerPoint docs.
 * Shows filename, file size, and document icon after selection.
 * Does NOT upload automatically — calls onUpload only on user confirmation.
 *
 * Props:
 *   onUpload(file, onProgress) => Promise<data>
 *   label?          — field label
 *   accept?         — MIME types string (defaults to all allowed doc types)
 *   maxMB?          — max size in MB (default: 20)
 *   required?
 *   isPrivate?      — show "private document" badge if true
 *   disabled?
 */
import { useRef, useState } from "react";
import { FileText, X, Upload, AlertCircle, Check, Lock } from "lucide-react";
import UploadProgress from "./UploadProgress";
import { validateFile, formatFileSize, ALLOWED_TYPES } from "../../services/uploadApi";

const DEFAULT_ACCEPT = ALLOWED_TYPES.document.join(",");

function DocIcon({ mimeType }) {
  if (mimeType?.includes("pdf")) return "PDF";
  if (mimeType?.includes("powerpoint") || mimeType?.includes("presentation")) return "PPT";
  if (mimeType?.includes("word") || mimeType?.includes("document")) return "DOC";
  return "FILE";
}

export default function DocumentUploader({
  onUpload,
  label = "Upload Document",
  accept = DEFAULT_ACCEPT,
  maxMB = 20,
  required = false,
  isPrivate = false,
  disabled = false,
}) {
  const inputRef              = useRef(null);
  const [file, setFile]         = useState(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState("idle"); // idle | ready | uploading | success | error
  const [error, setError]       = useState(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFileSelect(selectedFile) {
    if (!selectedFile) return;

    const check = validateFile(selectedFile, "document");
    if (!check.valid) {
      setError(check.error);
      return;
    }
    if (selectedFile.size > maxMB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${maxMB} MB.`);
      return;
    }

    setError(null);
    setFile(selectedFile);
    setStatus("ready");
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

  function onFileChange(e) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFileSelect(f);
  }

  function remove() {
    setFile(null);
    setStatus("idle");
    setError(null);
    setProgress(0);
  }

  const isUploading = status === "uploading";
  const isReady     = status === "ready";
  const isSuccess   = status === "success";

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-700">
          {label}
          {required && <span className="text-red-500" aria-label="required">*</span>}
          {isPrivate && (
            <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500">
              <Lock className="h-2.5 w-2.5" aria-hidden="true" /> Private
            </span>
          )}
        </label>
      )}

      {/* Drop zone */}
      {status === "idle" && (
        <div
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-all ${
            dragOver
              ? "border-primary bg-primary/5"
              : error
              ? "border-red-300 bg-red-50"
              : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5"
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
          <FileText className="h-10 w-10 text-slate-300" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-slate-600">Click to select or drag here</p>
            <p className="mt-0.5 text-xs text-slate-400">
              PDF, Word, PowerPoint · Max {maxMB} MB
            </p>
          </div>
        </div>
      )}

      {/* Selected file card */}
      {(isReady || isUploading || isSuccess) && file && (
        <div className={`rounded-2xl border p-4 ${
          isSuccess ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"
        }`}>
          <div className="flex items-start gap-3">
            {/* Type badge */}
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
              <DocIcon mimeType={file.type} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{formatFileSize(file.size)}</p>

              {/* Progress */}
              {isUploading && (
                <div className="mt-2">
                  <UploadProgress progress={progress} status="uploading" />
                </div>
              )}

              {/* Success state */}
              {isSuccess && (
                <p className="mt-1 flex items-center gap-1 text-xs font-medium text-green-600">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" /> Uploaded successfully
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-2">
              {isReady && (
                <button
                  type="button"
                  onClick={handleUpload}
                  disabled={disabled}
                  aria-label="Upload file"
                  className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-60 transition"
                >
                  <Upload className="h-3.5 w-3.5" aria-hidden="true" /> Upload
                </button>
              )}
              {!isUploading && (
                <button
                  type="button"
                  onClick={remove}
                  disabled={disabled}
                  aria-label="Remove file"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-red-50 hover:text-red-500 transition"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800">Upload failed</p>
              <p className="mt-0.5 text-xs text-red-600">{error}</p>
            </div>
            <button
              type="button"
              onClick={remove}
              aria-label="Dismiss"
              className="text-red-400 hover:text-red-600 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleUpload}
            className="mt-3 text-xs font-medium text-red-700 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Inline error (validation) */}
      {error && status === "idle" && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      {isPrivate && status === "idle" && (
        <p className="mt-1.5 flex items-center gap-1 text-xs text-slate-400">
          <Lock className="h-3 w-3" aria-hidden="true" />
          This document will be stored securely and not publicly accessible.
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        aria-hidden="true"
        onChange={onFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
