/**
 * Investment controller â€” full offer + negotiation workflow.
 *
 * State machine:
 *   pending â†’ negotiating | accepted | rejected | cancelled
 *   negotiating â†’ accepted | rejected | cancelled
 *   accepted â†’ finalized
 *   rejected / cancelled / finalized â†’ terminal
 *
 * Real-time: socket emission to the target user if online.
 * Fallback:  email sent for the 3 highest-impact events (offer, accept, finalize).
 */
const Investment   = require("../models/Investment.model");
const Startup      = require("../models/Startup.model");
const Notification = require("../models/Notification.model");
const Conversation = require("../models/Conversation.model");
const db           = require("../config/database");
const { emitToUser } = require("../socket/investmentHandlers");
const {
  investmentOfferEmail,
  investmentAcceptedEmail,
  investmentFinalizedEmail,
} = require("../utils/email");

/* â”€â”€ helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
const ALLOWED_STATUSES = ["pending","negotiating","accepted","rejected","cancelled","finalized"];

const TRANSITIONS = {
  pending:     ["negotiating","accepted","rejected","cancelled"],
  negotiating: ["accepted","rejected","cancelled"],
  accepted:    ["finalized"],
  rejected:    [],
  cancelled:   [],
  finalized:   [],
};

/** Emit socket event + persist DB notification. Both are fire-and-forget. */
function notify(req, { event, payload, userId, title, message }) {
  try {
    const io          = req.app.get("io");
    const onlineUsers = req.app.get("onlineUsers");
    if (io && onlineUsers) emitToUser(io, onlineUsers, userId, event, payload);
  } catch { /* never block */ }

  Notification.create({ user_id: userId, title, message, type: "investment" }).catch(() => {});
}

/* â”€â”€ GET profile email for a user â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getUserContact(userId) {
  try {
    const [[row]] = await db.execute(
      `SELECT u.email, p.first_name, p.last_name
       FROM users u LEFT JOIN profiles p ON p.user_id = u.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );
    return row || null;
  } catch { return null; }
}

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   POST /api/investments
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
async function createInvestment(req, res) {
  try {
    const investorId = req.user.id;
    const { startup_id, offered_amount, equity_percentage, notes } = req.body;

    if (!startup_id)
      return res.status(400).json({ message: "startup_id is required." });
    if (!offered_amount || Number(offered_amount) <= 0)
      return res.status(422).json({ message: "offered_amount must be greater than 0." });
    if (!equity_percentage || Number(equity_percentage) <= 0 || Number(equity_percentage) > 100)
      return res.status(422).json({ message: "equity_percentage must be between 0.01 and 100." });

    let startup;
    try { startup = await Startup.findById(startup_id); }
    catch { return res.status(404).json({ message: "Startup not found." }); }

    if (startup.status !== "published")
      return res.status(422).json({ message: "This startup is not accepting investment offers." });
    if (startup.verification_status !== "verified")
      return res.status(422).json({ message: "Only verified startups can receive investment offers." });
    if (startup.owner_id === investorId)
      return res.status(400).json({ message: "You cannot invest in your own startup." });

    const investment = await Investment.create({
      startup_id:        Number(startup_id),
      investor_id:       investorId,
      offered_amount:    Number(offered_amount),
      equity_percentage: Number(equity_percentage),
      notes:             notes?.trim() || null,
    });

    const amtFmt = `$${Number(offered_amount).toLocaleString()}`;

    // Socket + DB notification to founder
    notify(req, {
      event:   "new_investment_offer",
      payload: { investment },
      userId:  startup.owner_id,
      title:   "New Investment Offer",
      message: `You received an investment offer of ${amtFmt} for "${startup.name}".`,
    });

    // Email fallback â€” critical event: founder must know even if offline
    Promise.all([
      getUserContact(investorId),
      getUserContact(startup.owner_id),
    ]).then(([investor, founder]) => {
      if (!founder?.email) return;
      investmentOfferEmail({
        founderEmail:  founder.email,
        founderName:   `${founder.first_name || ""} ${founder.last_name || ""}`.trim() || "Founder",
        investorName:  investor
          ? `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "An investor"
          : "An investor",
        startupName:   startup.name,
        amount:        Number(offered_amount),
        equity:        Number(equity_percentage),
      });
    }).catch(() => {});

    // Auto-create DM / group conversation (non-blocking)
    (async () => {
      try {
        const [activeInvestors] = await db.execute(
          `SELECT DISTINCT investor_id FROM investments
           WHERE startup_id = ? AND status NOT IN ('cancelled','rejected')`,
          [Number(startup_id)]
        );
        if (activeInvestors.length >= 2) {
          const allParticipants = [...new Set([startup.owner_id, ...activeInvestors.map(r => r.investor_id)])];
          const [[existing]] = await db.execute(
            `SELECT id FROM conversations WHERE type = 'group' AND title = ? LIMIT 1`,
            [`${startup.name} â€” Investor Group`]
          );
          if (existing) {
            await Conversation.addParticipant(existing.id, investorId).catch(() => {});
            // Notify all existing participants that a new investor joined
            try {
              const io = req.app.get("io");
              const onlineUsers = req.app.get("onlineUsers");
              if (io && onlineUsers) {
                const participants = await Conversation.getParticipants(existing.id);
                const systemMsg = await require("../models/Message.model").create({
                  conversation_id: existing.id,
                  sender_id: startup.owner_id,
                  message: `A new investor joined the group.`,
                });
                io.to(`conversation:${existing.id}`).emit("new_message", systemMsg);
                io.to(`conversation:${existing.id}`).emit("participant_added", {
                  conversationId: existing.id,
                  userId: investorId,
                });
              }
            } catch { /* non-critical */ }
          } else {
            const newConv = await Conversation.create({
              type: "group", title: `${startup.name} â€” Investor Group`,
              created_by: startup.owner_id, participant_ids: allParticipants,
            });
            // Broadcast the new group to all participants
            try {
              const io = req.app.get("io");
              const onlineUsers = req.app.get("onlineUsers");
              if (io && onlineUsers) {
                allParticipants.forEach(uid => {
                  const sockets = onlineUsers.get(uid);
                  if (sockets) sockets.forEach(sid => io.to(sid).emit("conversation_created", newConv));
                });
              }
            } catch { /* non-critical */ }
          }
        } else {
          await Conversation.findOrCreatePrivate(investorId, startup.owner_id);
        }
      } catch { /* non-critical */ }
    })();

    return res.status(201).json({ message: "Investment offer submitted.", investment });
  } catch (err) {
    const status = err.message.includes("already exists") ? 409 : 400;
    return res.status(status).json({ message: err.message });
  }
}

/* â”€â”€ GET /api/investments  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getAllInvestments(req, res) {
  try {
    const { status, startup_id, investor_id, limit = 20, offset = 0 } = req.query;
    const result = await Investment.findAll({
      status, startup_id, investor_id,
      limit: parseInt(limit), offset: parseInt(offset),
    });
    return res.json(result);
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* â”€â”€ GET /api/investments/mine â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getMyInvestments(req, res) {
  try {
    const { status } = req.query;
    const investments = await Investment.findByInvestor(req.user.id, { status });
    return res.json({ investments });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* â”€â”€ GET /api/investments/received â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getReceivedInvestments(req, res) {
  try {
    const { status } = req.query;
    const investments = await Investment.findByFounder(req.user.id, { status });
    return res.json({ investments });
  } catch (err) { return res.status(500).json({ message: err.message }); }
}

/* â”€â”€ GET /api/investments/startup/:startupId â”€â”€â”€â”€â”€â”€â”€ */
async function getStartupInvestments(req, res) {
  try {
    const startup = await Startup.findById(req.params.startupId);
    if (startup.owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Not authorized." });
    const { status } = req.query;
    const investments = await Investment.findByStartup(req.params.startupId, { status });
    return res.json({ investments });
  } catch (err) { return res.status(404).json({ message: err.message }); }
}

/* â”€â”€ GET /api/investments/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getInvestmentById(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);
    const isParty =
      investment.investor_id === req.user.id ||
      startup.owner_id       === req.user.id ||
      req.user.role          === "admin";
    if (!isParty) return res.status(403).json({ message: "Not authorized." });
    return res.json({ investment });
  } catch (err) { return res.status(404).json({ message: err.message }); }
}

/* â”€â”€ GET /api/investments/:id/history â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function getInvestmentHistory(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);
    const isParty =
      investment.investor_id === req.user.id ||
      startup.owner_id       === req.user.id ||
      req.user.role          === "admin";
    if (!isParty) return res.status(403).json({ message: "Not authorized." });
    const history = await Investment.getHistory(investment.id);
    return res.json({ history });
  } catch (err) { return res.status(404).json({ message: err.message }); }
}

/* â”€â”€ PATCH /api/investments/:id/accept â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function acceptInvestment(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);

    if (startup.owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Only the startup founder can accept offers." });
    if (!TRANSITIONS[investment.status]?.includes("accepted"))
      return res.status(409).json({ message: `Cannot accept an offer with status: ${investment.status}.` });

    const updated = await Investment.updateStatus(investment.id, "accepted", req.user.id);

    notify(req, {
      event: "investment_offer_accepted", payload: { investment: updated },
      userId: investment.investor_id,
      title:  "Investment Offer Accepted",
      message: `Your investment offer for "${startup.name}" has been accepted.`,
    });

    // Email fallback â€” critical: investor needs to know even if offline
    Promise.all([
      getUserContact(investment.investor_id),
      getUserContact(startup.owner_id),
    ]).then(([investor, founder]) => {
      if (!investor?.email) return;
      investmentAcceptedEmail({
        investorEmail: investor.email,
        investorName:  `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "Investor",
        founderName:   founder
          ? `${founder.first_name || ""} ${founder.last_name || ""}`.trim() || "the founder"
          : "the founder",
        startupName: startup.name,
      });
    }).catch(() => {});

    return res.json({ message: "Offer accepted.", investment: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ PATCH /api/investments/:id/reject â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function rejectInvestment(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);

    if (startup.owner_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Only the startup founder can reject offers." });
    if (!TRANSITIONS[investment.status]?.includes("rejected"))
      return res.status(409).json({ message: `Cannot reject an offer with status: ${investment.status}.` });

    const updated = await Investment.updateStatus(investment.id, "rejected", req.user.id);

    notify(req, {
      event: "investment_offer_rejected", payload: { investment: updated },
      userId: investment.investor_id,
      title:  "Investment Offer Declined",
      message: `Your investment offer for "${startup.name}" has been declined.`,
    });

    return res.json({ message: "Offer rejected.", investment: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ PATCH /api/investments/:id/negotiate â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function negotiateInvestment(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);

    const isParty =
      startup.owner_id       === req.user.id ||
      investment.investor_id === req.user.id ||
      req.user.role          === "admin";
    if (!isParty) return res.status(403).json({ message: "Not authorized." });
    if (!TRANSITIONS[investment.status]?.includes("negotiating"))
      return res.status(409).json({ message: `Cannot move to negotiation from status: ${investment.status}.` });

    const updated  = await Investment.updateStatus(investment.id, "negotiating", req.user.id);
    const notifyId = startup.owner_id === req.user.id ? investment.investor_id : startup.owner_id;

    notify(req, {
      event: "investment_offer_negotiating", payload: { investment: updated },
      userId: notifyId,
      title:  "Investment Negotiation Started",
      message: `Negotiation has started for the investment offer on "${startup.name}".`,
    });

    const conv = await Conversation.findOrCreatePrivate(investment.investor_id, startup.owner_id);
    return res.json({ message: "Offer moved to negotiation.", investment: updated, conversation: conv });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ PATCH /api/investments/:id/cancel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function cancelInvestment(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);

    if (investment.investor_id !== req.user.id && req.user.role !== "admin")
      return res.status(403).json({ message: "Only the investor can cancel their offer." });
    if (!TRANSITIONS[investment.status]?.includes("cancelled"))
      return res.status(409).json({ message: `Cannot cancel an offer with status: ${investment.status}.` });

    const updated = await Investment.updateStatus(investment.id, "cancelled", req.user.id);
    const startup = await Startup.findById(investment.startup_id);

    notify(req, {
      event: "investment_offer_cancelled", payload: { investment: updated },
      userId: startup.owner_id,
      title:  "Investment Offer Cancelled",
      message: `An investor cancelled their offer for "${startup.name}".`,
    });

    return res.json({ message: "Offer cancelled.", investment: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ PATCH /api/investments/:id/finalize â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function finalizeInvestment(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);

    const isParty =
      startup.owner_id       === req.user.id ||
      investment.investor_id === req.user.id ||
      req.user.role          === "admin";
    if (!isParty) return res.status(403).json({ message: "Not authorized." });
    if (!TRANSITIONS[investment.status]?.includes("finalized"))
      return res.status(409).json({ message: `Cannot finalize from status: ${investment.status}.` });

    const { agreement_url } = req.body;
    const updated = agreement_url
      ? await Investment.attachAgreement(investment.id, agreement_url, req.user.id)
      : await Investment.updateStatus(investment.id, "finalized", req.user.id);

    const notifyId   = startup.owner_id === req.user.id ? investment.investor_id : startup.owner_id;
    const notifyRole = notifyId === investment.investor_id ? "investor" : "inventor";

    notify(req, {
      event: "investment_finalized", payload: { investment: updated },
      userId: notifyId,
      title:  "Investment Finalized",
      message: `The investment deal for "${startup.name}" has been finalized.`,
    });

    // Email both parties â€” finalization is the highest-impact event
    Promise.all([
      getUserContact(investment.investor_id),
      getUserContact(startup.owner_id),
    ]).then(([investor, founder]) => {
      if (investor?.email) {
        investmentFinalizedEmail({
          recipientEmail: investor.email,
          recipientName:  `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || "Investor",
          startupName:    startup.name,
          role:           "investor",
        });
      }
      if (founder?.email) {
        investmentFinalizedEmail({
          recipientEmail: founder.email,
          recipientName:  `${founder.first_name || ""} ${founder.last_name || ""}`.trim() || "Founder",
          startupName:    startup.name,
          role:           "inventor",
        });
      }
    }).catch(() => {});

    return res.json({ message: "Investment finalized.", investment: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ PUT /api/investments/:id/status  (general) â”€â”€â”€â”€ */
async function updateInvestmentStatus(req, res) {
  try {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: "status is required." });
    if (!ALLOWED_STATUSES.includes(status))
      return res.status(422).json({ message: `Invalid status. Allowed: ${ALLOWED_STATUSES.join(", ")}` });

    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);
    const isFounder  = startup.owner_id       === req.user.id;
    const isInvestor = investment.investor_id  === req.user.id;
    const isAdmin    = req.user.role           === "admin";

    if (!isAdmin) {
      if (!isFounder && !isInvestor)
        return res.status(403).json({ message: "Not authorized." });
      if (isInvestor && !["cancelled"].includes(status))
        return res.status(403).json({ message: "Investors can only cancel their offer." });
      if (isFounder && !["accepted","rejected","negotiating"].includes(status))
        return res.status(403).json({ message: "Founders can only accept, reject, or negotiate." });
    }

    if (!TRANSITIONS[investment.status]?.includes(status))
      return res.status(409).json({ message: `Invalid transition: ${investment.status} â†’ ${status}.` });

    const updated  = await Investment.updateStatus(investment.id, status, req.user.id);
    const notifyId = isFounder ? investment.investor_id : startup.owner_id;

    const eventMap = {
      accepted:    "investment_offer_accepted",
      rejected:    "investment_offer_rejected",
      negotiating: "investment_offer_negotiating",
    };

    notify(req, {
      event:   eventMap[status] || "investment_update",
      payload: { investment: updated },
      userId:  notifyId,
      title:   "Investment Update",
      message: `Your investment for "${startup.name}" is now: ${status}.`,
    });

    return res.json({ message: `Investment ${status}.`, investment: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ PUT /api/investments/:id/offer  (counter-offer) â”€ */
async function updateOffer(req, res) {
  try {
    const investment = await Investment.findById(req.params.id);
    const startup    = await Startup.findById(investment.startup_id);
    const isParty    =
      investment.investor_id === req.user.id ||
      startup.owner_id       === req.user.id ||
      req.user.role          === "admin";
    if (!isParty) return res.status(403).json({ message: "Not authorized." });
    const updated = await Investment.updateOffer(req.params.id, req.body, req.user.id);
    return res.json({ message: "Offer updated.", investment: updated });
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

/* â”€â”€ DELETE /api/investments/:id  (admin) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function deleteInvestment(req, res) {
  try {
    const result = await Investment.remove(req.params.id);
    return res.json(result);
  } catch (err) { return res.status(400).json({ message: err.message }); }
}

module.exports = {
  createInvestment, getAllInvestments,
  getMyInvestments, getReceivedInvestments,
  getStartupInvestments, getInvestmentById,
  getInvestmentHistory,
  acceptInvestment, rejectInvestment,
  negotiateInvestment, cancelInvestment,
  finalizeInvestment, updateInvestmentStatus,
  updateOffer, deleteInvestment,
};

