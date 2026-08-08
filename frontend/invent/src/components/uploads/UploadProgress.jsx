/**
 * UploadProgress — animated progress bar for file uploads.
 * Shows percentage, loading state, and completion/error states.
 */

export default function UploadProgress({ progress, status = "uploading", fileName }) {
  const isComplete = status === "success";
  const isError    = status === "error";
  const isUploading = status === "uploading";

  const barColor = isComplete
    ? "bg-green-500"
    : isError
    ? "bg-red-500"
    : "bg-primary";

  const label = isComplete
    ? "Upload complete"
    : isError
    ? "Upload failed"
    : `Uploading… ${progress ?? 0}%`;

  return (
    <div className="w-full space-y-1.5" role="status" aria-live="polite" aria-label={label}>
      {fileName && (
        <p className="truncate text-xs text-slate-500" title={fileName}>
          {fileName}
        </p>
      )}

      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor} ${isUploading ? "animate-pulse" : ""}`}
          style={{ width: `${isComplete ? 100 : (progress ?? 0)}%` }}
          role="progressbar"
          aria-valuenow={isComplete ? 100 : (progress ?? 0)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      <p className={`text-xs font-medium ${isComplete ? "text-green-600" : isError ? "text-red-600" : "text-slate-500"}`}>
        {label}
      </p>
    </div>
  );
}
