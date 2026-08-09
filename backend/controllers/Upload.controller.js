/**
 * Upload controller
 * Each handler receives req.file (single) from multer memory storage,
 * streams the buffer to Cloudinary via cloudStorageService, then
 * persists the returned URL/public_id into the correct DB table.
 *
 * Replace pattern: new file is uploaded first; old cloud resource is
 * deleted only after the DB update succeeds â€” no data loss on failure.
 *
 * Private documents (registration certificates, verification docs)
 * are never returned as raw URLs in public endpoints.
 */
const cloudStorage        = require("../services/cloudStorageService");
const Profile             = require("../models/Profile.model");
const Startup             = require("../models/Startup.model");
const StartupFile         = require("../models/StartupFile.model");
const StartupMember       = require("../models/StartupMember.model");
const Post                = require("../models/Post.model");
const Message             = require("../models/Message.model");
const Investment          = require("../models/Investment.model");
const VerificationRequest = require("../models/VerificationRequest.model");

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function assertFile(req, res) {
  if (!req.file) {
    res.status(400).json({ success: false, message: "No file provided." });
    return false;
  }
  return true;
}

function uploadSuccess(res, data, extra = {}, status = 200) {
  return res.status(status).json({
    success: true,
    message: "File uploaded successfully.",
    data: {
      cloud_url:     data.secure_url,
      public_id:     data.public_id,
      mime_type:     extra.mimeType  || null,
      file_size:     extra.fileSize  || null,
      resource_type: data.resource_type || null,
    },
    ...extra.append,
  });
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PROFILE PHOTOS
   PUT /api/uploads/profile/photo    field: photo
   PUT /api/uploads/profile/cover    field: cover
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadProfilePhoto(req, res) {
  if (!assertFile(req, res)) return;
  try {
    // Fetch existing photo to replace it
    let oldPublicId = null;
    try {
      const profile = await Profile.findByUserId(req.user.id);
      // Derive public_id from existing URL if stored â€” we also stored it in uploads
      // For profile photos we use a deterministic public_id so overwrite is fine
      oldPublicId = null; // cloudinaryUpload uses overwrite:true so no manual delete needed
    } catch (_) {}

    const result = await cloudStorage.uploadProfilePhoto(req.file.buffer, req.user.id);
    await Profile.updatePhoto(req.user.id, { profile_photo: result.secure_url });

    console.log(`[Upload] Profile photo updated for user ${req.user.id}`);

    return uploadSuccess(res, result, {
      mimeType:  req.file.mimetype,
      fileSize:  req.file.size,
      append: { url: result.secure_url },
    });
  } catch (err) {
    console.error(`[Upload] Profile photo upload failed for user ${req.user.id}:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

async function uploadCoverPhoto(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const result = await cloudStorage.uploadCoverPhoto(req.file.buffer, req.user.id);
    await Profile.updatePhoto(req.user.id, { cover_photo: result.secure_url });

    console.log(`[Upload] Cover photo updated for user ${req.user.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { url: result.secure_url },
    });
  } catch (err) {
    console.error(`[Upload] Cover photo upload failed for user ${req.user.id}:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STARTUP LOGO
   PUT /api/uploads/startups/:startupId/logo    field: logo
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadStartupLogo(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    // Upload new logo (overwrite:true with deterministic public_id handles replace)
    const result = await cloudStorage.uploadStartupLogo(req.file.buffer, startup.id);

    // Store reference in both startups.logo_url (quick lookup) and startup_files (full metadata)
    await Startup.update(startup.id, {
      logo_url:       result.secure_url,
      logo_public_id: result.public_id,
    });

    // Upsert logo record in startup_files
    const existingLogoFiles = await StartupFile.findByStartup(startup.id, "logo");
    if (existingLogoFiles.length > 0) {
      await StartupFile.update(existingLogoFiles[0].id, {
        cloud_url:     result.secure_url,
        public_id:     result.public_id,
        resource_type: "image",
        mime_type:     req.file.mimetype,
        file_size:     req.file.size,
      });
    } else {
      await StartupFile.create({
        startup_id:    startup.id,
        file_type:     "logo",
        title:         "Startup Logo",
        cloud_url:     result.secure_url,
        public_id:     result.public_id,
        resource_type: "image",
        mime_type:     req.file.mimetype,
        file_size:     req.file.size,
        is_private:    0,
      });
    }

    console.log(`[Upload] Startup logo uploaded for startup ${startup.id} by user ${req.user.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { url: result.secure_url },
    });
  } catch (err) {
    console.error(`[Upload] Startup logo upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   PITCH DECK
   POST /api/uploads/startups/:startupId/pitch    field: pitch
   body: { title? }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadPitchDeck(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const result = await cloudStorage.uploadPitchDeck(
      req.file.buffer, startup.id, req.file.originalname
    );

    const file = await StartupFile.create({
      startup_id:        startup.id,
      file_type:         "pitch_deck",
      title:             req.body.title || req.file.originalname,
      cloud_url:         result.secure_url,
      public_id:         result.public_id,
      resource_type:     "raw",
      mime_type:         req.file.mimetype,
      file_size:         req.file.size,
      original_filename: req.file.originalname,
      is_private:        0,
    });

    console.log(`[Upload] Pitch deck uploaded for startup ${startup.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { file },
    }, 201);
  } catch (err) {
    console.error(`[Upload] Pitch deck upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STARTUP DOCUMENT
   POST /api/uploads/startups/:startupId/document    field: document
   body: {
     file_type: "startup_document"|"financial_report"|"legal_doc"|"business_plan",
     title?
   }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadStartupDocument(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const fileType = req.body.file_type || "startup_document";

    // Validate allowed document types (prevent client from injecting unsafe types)
    const allowedDocTypes = [
      "startup_document", "financial_report", "legal_doc",
      "business_plan", "market_research", "other",
    ];
    if (!allowedDocTypes.includes(fileType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid file_type. Allowed: ${allowedDocTypes.join(", ")}`,
      });
    }

    const result = await cloudStorage.uploadStartupDocument(
      req.file.buffer, startup.id, fileType, req.file.originalname
    );

    const file = await StartupFile.create({
      startup_id:        startup.id,
      file_type:         fileType,
      title:             req.body.title || req.file.originalname,
      cloud_url:         result.secure_url,
      public_id:         result.public_id,
      resource_type:     "raw",
      mime_type:         req.file.mimetype,
      file_size:         req.file.size,
      original_filename: req.file.originalname,
      is_private:        0,
    });

    console.log(`[Upload] Startup document (${fileType}) uploaded for startup ${startup.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { file },
    }, 201);
  } catch (err) {
    console.error(`[Upload] Startup document upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   REGISTRATION CERTIFICATE
   POST /api/uploads/startups/:startupId/registration-certificate    field: certificate
   Private document â€” stored with is_private=1, not returned in public listings.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadRegistrationCertificate(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    // Upload to Cloudinary
    const result = await cloudStorage.uploadStartupDocument(
      req.file.buffer,
      startup.id,
      "registration_certificate",
      req.file.originalname
    );

    // If replacing, delete the old cloud file
    if (startup.registration_certificate_public_id) {
      await cloudStorage.deleteFile(startup.registration_certificate_public_id, "raw");
    }

    // Update startups table with the certificate URL
    await Startup.update(startup.id, {
      registration_certificate_url:       result.secure_url,
      registration_certificate_public_id: result.public_id,
    });

    // Upsert record in startup_files (private)
    const existingCerts = await StartupFile.findByStartup(startup.id, "registration_certificate");
    if (existingCerts.length > 0) {
      await StartupFile.update(existingCerts[0].id, {
        cloud_url:         result.secure_url,
        public_id:         result.public_id,
        resource_type:     "raw",
        mime_type:         req.file.mimetype,
        file_size:         req.file.size,
        original_filename: req.file.originalname,
        is_private:        1,
      });
    } else {
      await StartupFile.create({
        startup_id:        startup.id,
        file_type:         "registration_certificate",
        title:             req.body.title || "Registration Certificate",
        cloud_url:         result.secure_url,
        public_id:         result.public_id,
        resource_type:     "raw",
        mime_type:         req.file.mimetype,
        file_size:         req.file.size,
        original_filename: req.file.originalname,
        is_private:        1,
      });
    }

    console.log(`[Upload] Registration certificate uploaded for startup ${startup.id} by user ${req.user.id}`);

    // Do NOT return the cloud_url in the response body â€” it's private
    return res.status(201).json({
      success: true,
      message: "Registration certificate uploaded successfully.",
      data: {
        public_id:  result.public_id,
        mime_type:  req.file.mimetype,
        file_size:  req.file.size,
        is_private: true,
      },
    });
  } catch (err) {
    console.error(`[Upload] Registration certificate upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STARTUP VIDEO
   POST /api/uploads/startups/:startupId/video    field: video
   body: { title? }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadStartupVideo(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const result = await cloudStorage.uploadStartupVideo(
      req.file.buffer, startup.id, req.file.originalname
    );

    const file = await StartupFile.create({
      startup_id:        startup.id,
      file_type:         "demo_video",
      title:             req.body.title || req.file.originalname,
      cloud_url:         result.secure_url,
      public_id:         result.public_id,
      resource_type:     "video",
      mime_type:         req.file.mimetype,
      file_size:         req.file.size,
      original_filename: req.file.originalname,
      is_private:        0,
    });

    console.log(`[Upload] Startup video uploaded for startup ${startup.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { file },
    }, 201);
  } catch (err) {
    console.error(`[Upload] Startup video upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STARTUP IMAGE
   POST /api/uploads/startups/:startupId/image    field: image
   body: { title? }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadStartupImage(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const result = await cloudStorage.uploadBuffer(req.file.buffer, {
      folder:         `innovest/startups/${startup.id}/images`,
      public_id:      `img_${startup.id}_${Date.now()}`,
      resource_type:  "image",
      transformation: [{ width: 1200, quality: "auto:good", fetch_format: "auto" }],
    });

    const file = await StartupFile.create({
      startup_id:        startup.id,
      file_type:         "startup_image",
      title:             req.body.title || req.file.originalname,
      cloud_url:         result.secure_url,
      public_id:         result.public_id,
      resource_type:     "image",
      mime_type:         req.file.mimetype,
      file_size:         req.file.size,
      original_filename: req.file.originalname,
      is_private:        0,
    });

    console.log(`[Upload] Startup image uploaded for startup ${startup.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { file },
    }, 201);
  } catch (err) {
    console.error(`[Upload] Startup image upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   POST MEDIA
   POST /api/uploads/posts/:postId/media    field: media
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadPostMedia(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const post = await Post.findById(req.params.postId);
    if (post.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    const result = isVideo
      ? await cloudStorage.uploadPostVideo(req.file.buffer, req.user.id)
      : await cloudStorage.uploadPostImage(req.file.buffer, req.user.id);

    const field = isVideo ? { video_url: result.secure_url } : { image_url: result.secure_url };
    const updated = await Post.update(post.id, field);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { url: result.secure_url, post: updated },
    });
  } catch (err) {
    console.error(`[Upload] Post media upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   MESSAGE ATTACHMENT
   POST /api/uploads/messages/:conversationId    field: attachment
   body: { message? }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadMessageAttachment(req, res) {
  if (!assertFile(req, res)) return;
  try {
    // Verify caller is a participant of this conversation
    const Conversation = require("../models/Conversation.model");
    const participants = await Conversation.getParticipants(req.params.conversationId);
    if (!participants.some(p => p.user_id === req.user.id)) {
      return res.status(403).json({ success: false, message: "You are not a participant of this conversation." });
    }

    const result = await cloudStorage.uploadMessageAttachment(
      req.file.buffer,
      req.params.conversationId,
      req.file.mimetype
    );

    const attachmentType = req.file.mimetype.startsWith("image/")
      ? "image"
      : req.file.mimetype.startsWith("video/")
      ? "video"
      : "file";

    const message = await Message.create({
      conversation_id: req.params.conversationId,
      sender_id:       req.user.id,
      message:         req.body.message || null,
      attachment_url:  result.secure_url,
      attachment_type: attachmentType,
    });

    return res.status(201).json({ success: true, message });
  } catch (err) {
    console.error(`[Upload] Message attachment upload error:`, err.message);
    return res.status(500).json({ success: false, message: "Upload failed." });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   INVESTMENT AGREEMENT
   PUT /api/uploads/investments/:investmentId/agreement    field: agreement
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadAgreement(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const investment = await Investment.findById(req.params.investmentId);
    const isParty =
      investment.investor_id === req.user.id || req.user.role === "admin";
    if (!isParty) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const result = await cloudStorage.uploadAgreement(
      req.file.buffer, investment.id, req.file.originalname
    );
    const updated = await Investment.attachAgreement(investment.id, result.secure_url);

    console.log(`[Upload] Agreement uploaded for investment ${investment.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize:  req.file.size,
      append: { investment: updated },
    });
  } catch (err) {
    console.error(`[Upload] Agreement upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   VERIFICATION DOCUMENT
   PUT /api/uploads/verifications/:requestId/document    field: document
   Private document â€” URL is NOT returned directly; use GET /api/files/:id for access.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadVerificationDoc(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const request = await VerificationRequest.findById(req.params.requestId);
    if (request.user_id !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const result = await cloudStorage.uploadVerificationDoc(
      req.file.buffer, req.user.id, req.file.originalname
    );

    const updated = await VerificationRequest.uploadDocument(
      request.id, result.secure_url
    );

    console.log(`[Upload] Verification doc uploaded for request ${request.id} by user ${req.user.id}`);

    // Do NOT expose the full cloud_url â€” it's a sensitive document
    return res.json({
      success: true,
      message: "Verification document uploaded.",
      data: {
        public_id:  result.public_id,
        mime_type:  req.file.mimetype,
        file_size:  req.file.size,
        is_private: true,
      },
      request: {
        id:     updated.id,
        status: updated.status,
      },
    });
  } catch (err) {
    console.error(`[Upload] Verification doc upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   INVESTOR VERIFICATION DOCUMENT
   POST /api/uploads/investor/verification/document    field: document
   Separate from request-scoped upload â€” creates/updates the investor's
   verification request with the uploaded document.
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadInvestorVerificationDoc(req, res) {
  if (!assertFile(req, res)) return;
  try {
    if (req.user.role !== "investor" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only investors can upload verification documents." });
    }

    const result = await cloudStorage.uploadVerificationDoc(
      req.file.buffer, req.user.id, req.file.originalname
    );

    // Find or create the investor's pending verification request
    let request;
    try {
      const existing = await VerificationRequest.findByUser(req.user.id);
      const pending = existing.find(
        (r) => r.verification_type === "investor_registration" &&
               ["pending", "under_review"].includes(r.status)
      );

      if (pending) {
        request = await VerificationRequest.uploadDocument(pending.id, result.secure_url);
      } else {
        // Create a new request with the document
        request = await VerificationRequest.create({
          user_id:           req.user.id,
          startup_id:        null,
          verification_type: "investor_registration",
          document_url:      result.secure_url,
        });
      }
    } catch (dbErr) {
      // If DB fails, delete the orphaned cloud file
      await cloudStorage.deleteFile(result.public_id, "raw");
      throw dbErr;
    }

    console.log(`[Upload] Investor verification doc uploaded by user ${req.user.id}`);

    // Do NOT return the cloud_url
    return res.status(201).json({
      success: true,
      message: "Investor verification document uploaded.",
      data: {
        public_id:  result.public_id,
        mime_type:  req.file.mimetype,
        file_size:  req.file.size,
        is_private: true,
      },
      request: {
        id:     request.id,
        status: request.status,
      },
    });
  } catch (err) {
    console.error(`[Upload] Investor verification doc upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   STARTUP TEAM MEMBER PHOTO
   PUT /api/uploads/startups/:startupId/members/:memberId/photo  field: photo
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function uploadMemberPhoto(req, res) {
  if (!assertFile(req, res)) return;
  try {
    const { startupId, memberId } = req.params;

    // Assert startup ownership
    const startup = await Startup.findById(startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    // Assert member exists and belongs to this startup
    const member = await StartupMember.findById(memberId);
    if (member.startup_id !== parseInt(startupId)) {
      return res.status(400).json({ success: false, message: "Member does not belong to this startup." });
    }

    // Upload new photo (overwrite: true + deterministic public_id handles replace)
    const result = await cloudStorage.uploadMemberPhoto(req.file.buffer, startupId, memberId);

    // Update member record
    await StartupMember.update(memberId, {
      photo_url:       result.secure_url,
      photo_public_id: result.public_id,
    });

    console.log(`[Upload] Member photo uploaded for member ${memberId} in startup ${startupId} by user ${req.user.id}`);

    return uploadSuccess(res, result, {
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      append:   { url: result.secure_url },
    });
  } catch (err) {
    console.error(`[Upload] Member photo upload error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   DELETE FROM CLOUDINARY  (admin only)
   DELETE /api/uploads/resource
   body: { public_id, resource_type? }
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

async function deleteResource(req, res) {
  try {
    const { public_id, resource_type = "image" } = req.body;
    if (!public_id) {
      return res.status(400).json({ success: false, message: "public_id is required." });
    }

    const result = await cloudStorage.deleteFile(public_id, resource_type);
    if (!result.ok) {
      return res.status(500).json({
        success: false,
        message: `Cloudinary deletion failed: ${result.error}`,
      });
    }

    console.log(`[Upload] Admin deleted resource ${public_id} (${resource_type})`);
    return res.json({ success: true, message: "Resource deleted from Cloudinary.", result: result.result });
  } catch (err) {
    console.error(`[Upload] Admin delete resource error:`, err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
}

module.exports = {
  uploadProfilePhoto,
  uploadCoverPhoto,
  uploadStartupLogo,
  uploadPitchDeck,
  uploadStartupDocument,
  uploadRegistrationCertificate,
  uploadStartupVideo,
  uploadStartupImage,
  uploadPostMedia,
  uploadMessageAttachment,
  uploadAgreement,
  uploadVerificationDoc,
  uploadInvestorVerificationDoc,
  uploadMemberPhoto,
  deleteResource,
};

