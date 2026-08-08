/**
 * ImageUploader — drag-and-drop / click-to-select image uploader.
 * Shows image preview before and after upload.
 * Validates type and size client-side before sending to backend.
 *
 * Props:
 *   onUpload(file, onProgress) => Promise<data>
 *   currentUrl?       — existing image URL for initial preview
 *   label?            — field label
 *   maxMB?            — max file size in MB (default: 5)
 *   aspectRatio?      — CSS aspect-ratio string, e.g. "1/1" or "3/1" (default: "1/1")
 *   shape?            — "square" | "wide" | "circle" (default: "square")
 *   disabled?
 */
import { useRef, useState } from "react";
import { Camera, X, Upload, AlertCircle, Check } from "lucide-react";
import UploadProgress from "./UploadProgress";
import { validateFile, formatFileSize, ALLOWED_TYPES, FILE_LIMITS } from "../../services/uploadApi";

export default function ImageUploader({
  onUpload,
  currentUrl = null,
  label = "Upload Image",
  maxMB = 5,
  shape = "square",
  disabled = false,
}) {
  const inputRef            = useRef(null);
  const [preview, setPreview]   = useState(currentUrl);
  const [progress, setProgress] = useState(0);
  const [status, setStatus]     = useState("idle"); // idle | uploading | success | error
  const [error, setError]       = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState(null);
  const [fileSize, setFileSize] = useState(null);

  const maxBytes = maxMB * 1024 * 1024;
  const allowedTypes = ALLOWED_TYPES.image;

  async function handleFile(file) {
    if (!file) return;

    // Client-side validation
    const check = validateFile(file, "image");
    if (!check.valid) {
      setError(check.error);
      return;
    }
    if (file.size > maxBytes) {
      setError(`File is too large. Maximum size is ${maxMB} MB.`);
      return;
    }

    setError(null);
    setFileName(file.name);
    setFileSize(formatFileSize(file.size));

    // Local preview
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    // Upload
    setStatus("uploading");
    setProgress(0);
    try {
      const data = await onUpload(file, (pct) => setProgress(pct));
      setStatus("success");
      // Update preview to the uploaded cloud URL if returned
      const cloudUrl = data?.data?.cloud_url || data?.url;
      if (cloudUrl) {
        URL.revokeObjectURL(localUrl);
        setPreview(cloudUrl);
      }
    } catch (err) {
      setStatus("error");
      setError(err.message || "Upload failed. Please try again.");
      // Revert preview
      URL.revokeObjectURL(localUrl);
      setPreview(currentUrl);
    }
  }

  function onFileChange(e) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so same file can be re-selected
    e.target.value = "";
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function remove() {
    setPreview(null);
    setStatus("idle");
    setError(null);
    setFileName(null);
    setFileSize(null);
    setProgress(0);
  }

  const containerShape =
    shape === "circle"
      ? "rounded-full aspect-square"
      : shape === "wide"
      ? "rounded-2xl aspect-[3/1]"
      : "rounded-2xl aspect-square";

  const isUploading = status === "uploading";

  return (
    <div className="w-full">
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-slate-700">
          {label}
        </label>
      )}

      <div
        className={`relative overflow-hidden border-2 transition-all ${containerShape} ${
          dragOver
            ? "border-primary bg-primary/5"
            : error
            ? "border-red-300 bg-red-50"
            : status === "success"
            ? "border-green-300"
            : "border-dashed border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary/5"
        } ${disabled || isUploading ? "pointer-events-none opacity-60" : "cursor-pointer"}`}
        onClick={() => !disabled && !isUploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={`${label}. ${preview ? "Click to replace" : "Click or drag to upload"}`}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      >
        {/* Preview */}
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className={`h-full w-full object-cover ${containerShape}`}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 p-4 text-center">
            <Camera className="h-8 w-8 text-slate-400" aria-hidden="true" />
            <p className="text-xs text-slate-500">
              Click or drag to upload
            </p>
            <p className="text-[10px] text-slate-400">
              JPEG, PNG, WEBP · Max {maxMB} MB
            </p>
          </div>
        )}

        {/* Overlay on hover when preview exists */}
        {preview && !isUploading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity hover:opacity-100">
            <Upload className="h-6 w-6 text-white" aria-hidden="true" />
            <span className="text-xs font-medium text-white">Replace</span>
          </div>
        )}

        {/* Success badge */}
        {status === "success" && (
          <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-green-500">
            <Check className="h-3.5 w-3.5 text-white" aria-hidden="true" />
          </div>
        )}

        {/* Remove button */}
        {preview && !isUploading && (
          <button
            type="button"
            aria-label="Remove image"
            className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition"
            onClick={(e) => { e.stopPropagation(); remove(); }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Progress bar */}
      {isUploading && (
        <div className="mt-2">
          <UploadProgress progress={progress} status="uploading" fileName={fileName} />
        </div>
      )}

      {/* File info */}
      {status === "success" && fileName && (
        <p className="mt-1.5 truncate text-xs text-green-600">
          ✓ {fileName} {fileSize && `(${fileSize})`}
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600" role="alert">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={allowedTypes.join(",")}
        className="sr-only"
        aria-hidden="true"
        onChange={onFileChange}
        disabled={disabled || isUploading}
      />
    </div>
  );
}
