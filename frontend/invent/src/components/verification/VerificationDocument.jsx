import { useRef, useState } from "react";
import { Upload, FileText, CheckCircle, AlertCircle, ExternalLink } from "lucide-react";
import { uploadVerificationDocument } from "../../services/verificationApi";

/**
 * Handles document upload flow:
 * 1. User selects file → uploads to Cloudinary via /verifications/upload-document
 * 2. Returns secure_url to parent via onUploaded(url)
 * 3. Parent stores URL and sends it with the verification form submission
 *
 * Documents never flow through the browser as binary — only the cloud URL is kept.
 */
export default function VerificationDocument({ onUploaded, currentUrl = null, disabled = false }) {
  const inputRef       = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]         = useState("");
  const [uploadedUrl, setUploadedUrl] = useState(currentUrl);

  const ACCEPTED = ".pdf,.doc,.docx,.jpg,.jpeg,.png";
  const MAX_MB   = 20;

  const handleChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File is too large. Maximum size is ${MAX_MB} MB.`);
      return;
    }

    setUploading(true);
    setError("");
    try {
      const data = await uploadVerificationDocument(file);
      setUploadedUrl(data.url);
      onUploaded?.(data.url);
    } catch (err) {
      setError(err.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={handleChange}
        disabled={disabled || uploading}
      />

      {uploadedUrl ? (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-600" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-emerald-800">Document uploaded</p>
            <p className="truncate text-xs text-emerald-600">{uploadedUrl}</p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={uploadedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-100 transition"
              title="Preview document"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
            {!disabled && (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
              >
                Replace
              </button>
            )}
          </div>
        </div>
      ) : (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-8 text-center transition hover:border-primary hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <>
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              <p className="text-sm text-slate-500">Uploading securely…</p>
            </>
          ) : (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Upload className="h-6 w-6 text-slate-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">Click to upload registration certificate</p>
                <p className="mt-1 text-xs text-slate-400">PDF, DOC, JPG, PNG — max {MAX_MB} MB</p>
              </div>
            </>
          )}
        </button>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      <p className="text-xs text-slate-400">
        <FileText className="mr-1 inline h-3 w-3" />
        Your document is stored securely and only accessible to authorized Innovest staff.
      </p>
    </div>
  );
}
