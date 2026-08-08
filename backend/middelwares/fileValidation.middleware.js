/**
 * fileValidation.middleware.js
 * Additional post-multer validation run after req.file is populated.
 * Gives cleaner error messages than raw multer errors.
 *
 * Usage (after multer):
 *   router.post('/upload', multerInstance.single('file'),
 *                          validateFile({ maxMB: 5, types: ['image/jpeg'] }),
 *                          handler);
 */

/**
 * Build a middleware that validates req.file after multer runs.
 * @param {Object} opts
 * @param {number}   opts.maxMB   — max allowed megabytes (default 10)
 * @param {string[]} opts.types   — allowed MIME types (default: all)
 * @param {boolean}  opts.required — whether a file is required (default true)
 */
function validateFile({ maxMB = 10, types = [], required = true } = {}) {
  return (req, res, next) => {
    if (!req.file) {
      if (required) {
        return res.status(400).json({ message: "A file is required for this request." });
      }
      return next();
    }

    // Size check (multer should already block, this is a safety net)
    const maxBytes = maxMB * 1024 * 1024;
    if (req.file.size > maxBytes) {
      return res.status(413).json({
        message: `File is too large. Maximum allowed size is ${maxMB} MB.`,
      });
    }

    // MIME type check
    if (types.length && !types.includes(req.file.mimetype)) {
      return res.status(415).json({
        message: `Unsupported file type "${req.file.mimetype}". Allowed: ${types.join(", ")}.`,
      });
    }

    // Sanitise original filename (prevent path traversal)
    if (req.file.originalname) {
      req.file.originalname = req.file.originalname
        .replace(/[^a-zA-Z0-9._-]/g, "_")
        .substring(0, 200);
    }

    next();
  };
}

/** Shortcut validators for common use cases */
const isImage = validateFile({
  types: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  maxMB: 8,
});

const isPdf = validateFile({
  types: ["application/pdf"],
  maxMB: 20,
});

const isDocument = validateFile({
  types: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  maxMB: 30,
});

const isVideo = validateFile({
  types: ["video/mp4", "video/quicktime", "video/x-msvideo", "video/webm"],
  maxMB: 200,
});

const isImageOrVideo = validateFile({ maxMB: 100 }); // MIME checked by multer filter

module.exports = { validateFile, isImage, isPdf, isDocument, isVideo, isImageOrVideo };
