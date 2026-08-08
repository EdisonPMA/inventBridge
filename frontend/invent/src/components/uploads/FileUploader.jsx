/**
 * FileUploader — unified, reusable file upload component.
 * Composes ImageUploader, DocumentUploader, or VideoUploader based on `type` prop.
 * This is the single entry point for all upload UI in the application.
 *
 * Props:
 *   type:            "image" | "cover" | "document" | "video"
 *   onUpload:        (file, onProgress) => Promise<data>
 *   label?
 *   currentUrl?      — existing image URL for image preview
 *   maxMB?
 *   required?
 *   isPrivate?       — shows lock badge for sensitive documents
 *   shape?           — for images: "square" | "wide" | "circle"
 *   disabled?
 *   className?
 *
 * Usage:
 *   // Profile photo
 *   <FileUploader type="image" shape="circle" label="Profile Photo"
 *     onUpload={(file, progress) => uploadProfilePhoto(file, progress)} />
 *
 *   // Pitch deck
 *   <FileUploader type="document" label="Pitch Deck"
 *     onUpload={(file, progress) => uploadPitchDeck(startupId, file, title, progress)} />
 *
 *   // Demo video
 *   <FileUploader type="video" label="Demo Video"
 *     onUpload={(file, progress) => uploadStartupVideo(startupId, file, title, progress)} />
 */
import ImageUploader    from "./ImageUploader";
import DocumentUploader from "./DocumentUploader";
import VideoUploader    from "./VideoUploader";

export default function FileUploader({
  type = "image",
  onUpload,
  label,
  currentUrl,
  maxMB,
  required = false,
  isPrivate = false,
  shape = "square",
  disabled = false,
  className = "",
}) {
  if (type === "video") {
    return (
      <div className={className}>
        <VideoUploader
          onUpload={onUpload}
          label={label}
          maxMB={maxMB ?? 200}
          disabled={disabled}
        />
      </div>
    );
  }

  if (type === "document") {
    return (
      <div className={className}>
        <DocumentUploader
          onUpload={onUpload}
          label={label}
          maxMB={maxMB ?? 20}
          required={required}
          isPrivate={isPrivate}
          disabled={disabled}
        />
      </div>
    );
  }

  // type === "image" | "cover"
  return (
    <div className={className}>
      <ImageUploader
        onUpload={onUpload}
        label={label}
        currentUrl={currentUrl}
        maxMB={maxMB ?? (type === "cover" ? 8 : 5)}
        shape={shape}
        disabled={disabled}
      />
    </div>
  );
}
