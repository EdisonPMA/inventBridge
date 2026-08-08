const router = require("express").Router();
const c = require("../controllers/Conversation.controller");
const { requireAuth } = require("../middelwares/auth.middleware");
const { rejectSuspended } = require("../middelwares/suspended.middleware");
const { rejectAdmin } = require("../middelwares/rejectAdmin.middleware");
const validate = require("../middelwares/validate");
const { body, query } = require("express-validator");

/* ── Validators ──────────────────────────────────── */
const createConvV = [
  body("participant_ids").isArray({ min: 1 }).withMessage("participant_ids required."),
  body("type").optional().isIn(["group","team","org","support"]).withMessage("Invalid type."),
  body("title").optional({ nullable: true }).isLength({ max: 255 }),
];

const sendMsgV = [
  body("message").optional({ nullable: true }).isLength({ max: 10000 }),
  body("attachment_url").optional({ nullable: true }).isURL({ protocols: ["https"] }),
  body("attachment_type").optional({ nullable: true })
    .isIn(["image","video","file","audio","shared_post","document"]),
  body("mime_type").optional({ nullable: true }).isLength({ max: 100 }),
  body("file_size").optional({ nullable: true }).isInt({ min: 0 }),
  body("file_name").optional({ nullable: true }).isLength({ max: 255 }),
  body("message").custom((val, { req }) => {
    if (!val && !req.body.attachment_url) throw new Error("message or attachment_url required.");
    return true;
  }),
];

const editMsgV = [
  body("message").notEmpty().withMessage("message required.").isLength({ max: 10000 }),
];

const contactReqV = [
  body("receiver_id").notEmpty().isInt({ min: 1 }).toInt(),
  body("message").optional({ nullable: true }).isLength({ max: 500 }),
  body("startup_id").optional({ nullable: true }).isInt({ min: 1 }).toInt(),
];

const respondV = [
  body("action").isIn(["accept","decline"]).withMessage("action must be accept or decline."),
];

/* ── Static routes BEFORE /:id ───────────────────── */

// Contact request workflow
router.post("/contact-request",           requireAuth, rejectAdmin, rejectSuspended, contactReqV, validate, c.sendContactRequest);
router.get("/contact-requests",           requireAuth, rejectAdmin, c.getContactRequests);
router.post("/contact-requests/:id/respond", requireAuth, rejectAdmin, respondV, validate, c.respondContactRequest);

// Conversation lists
router.get("/",                           requireAuth, c.getMyConversations);
router.get("/archived",                   requireAuth, c.getArchivedConversations);

// DM find-or-create
router.post("/dm/:userId",                requireAuth, rejectAdmin, rejectSuspended, c.getOrCreateDm);

// Create group/team/org conversation
router.post("/",                          requireAuth, rejectAdmin, rejectSuspended, createConvV, validate, c.createConversation);

/* ── Dynamic /:id routes ─────────────────────────── */

// Read
router.get("/:id",                        requireAuth, c.getConversationById);
router.get("/:id/messages",               requireAuth, c.getMessages);
router.get("/:id/messages/search",        requireAuth, c.searchMessages);
router.get("/:id/messages/pinned",        requireAuth, c.getPinnedMessages);

// Conversation management
router.put("/:id/title",                  requireAuth, rejectAdmin,
  body("title").notEmpty().isLength({ max: 255 }), validate, c.updateTitle);
router.put("/:id/archive",               requireAuth, c.toggleArchive);
router.put("/:id/mute",                  requireAuth, c.toggleMute);
router.post("/:id/participants",         requireAuth, rejectAdmin,
  body("user_id").notEmpty().isInt({ min: 1 }).toInt(), validate, c.addParticipant);
router.delete("/:id/participants/:userId", requireAuth, rejectAdmin, c.removeParticipant);
router.delete("/:id",                    requireAuth, rejectAdmin, c.deleteConversation);

// Message operations
router.post("/:id/messages",             requireAuth, rejectAdmin, rejectSuspended, sendMsgV, validate, c.sendMessage);
router.put("/:id/messages/:msgId",       requireAuth, editMsgV, validate, c.editMessage);
router.delete("/:id/messages/:msgId",    requireAuth, c.deleteMessage);
router.put("/:id/messages/:msgId/read",  requireAuth, c.markMessageRead);
router.put("/:id/messages/:msgId/pin",   requireAuth, c.togglePin);
router.post("/:id/messages/:msgId/react", requireAuth, rejectSuspended,
  body("emoji").notEmpty().isLength({ max: 10 }), validate, c.toggleReaction);

module.exports = router;
