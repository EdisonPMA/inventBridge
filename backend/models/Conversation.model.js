/**
 * Conversation model
 * Tables: conversations, conversation_participants
 *
 * Conv types: private | group | investment_negotiation | team | org | support
 * Features: archiving, pinned messages, context refs (startup/investment),
 *           per-participant roles, mute, last_read_at
 */
const db = require("../config/database");

/* ── CREATE ──────────────────────────────────────── */
async function create({
  type = "private",
  conv_type = null,
  title = null,
  created_by,
  participant_ids = [],
  startup_id = null,
  investment_id = null,
}) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const finalType = conv_type || type;
    const [result] = await conn.execute(
      `INSERT INTO conversations (type, conv_type, title, created_by, startup_id, investment_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [finalType, finalType, title, created_by, startup_id || null, investment_id || null]
    );
    const conversation_id = result.insertId;

    const allParticipants = [...new Set([created_by, ...participant_ids])];
    for (const user_id of allParticipants) {
      const role = user_id === created_by ? "admin" : "member";
      await conn.execute(
        "INSERT IGNORE INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)",
        [conversation_id, user_id, role]
      );
    }

    await conn.commit();
    return findById(conversation_id, created_by);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Find or create a private DM between two users */
async function findOrCreatePrivate(user_a, user_b) {
  const [rows] = await db.execute(
    `SELECT c.id FROM conversations c
     JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = ?
     JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = ?
     WHERE c.type = 'private'
     LIMIT 1`,
    [user_a, user_b]
  );
  if (rows.length) return findById(rows[0].id, user_a);
  return create({ type: "private", created_by: user_a, participant_ids: [user_b] });
}

/** Find or create an investment-negotiation conversation */
async function findOrCreateNegotiation(investor_id, founder_id, startup_id, investment_id) {
  const [rows] = await db.execute(
    `SELECT c.id FROM conversations c
     WHERE c.conv_type = 'investment_negotiation'
       AND c.startup_id = ?
       AND c.investment_id = ?
     LIMIT 1`,
    [startup_id, investment_id]
  );
  if (rows.length) return findById(rows[0].id, investor_id);
  return create({
    type: "investment_negotiation",
    conv_type: "investment_negotiation",
    title: null,
    created_by: investor_id,
    participant_ids: [founder_id],
    startup_id,
    investment_id,
  });
}

/* ── READ ────────────────────────────────────────── */
async function findById(id, viewer_id = null) {
  const [rows] = await db.execute(
    `SELECT c.*,
            s.name AS startup_name, s.slug AS startup_slug,
            inv.id AS inv_id
     FROM conversations c
     LEFT JOIN startups s ON s.id = c.startup_id
     LEFT JOIN investments inv ON inv.id = c.investment_id
     WHERE c.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Conversation not found.");
  const conversation = rows[0];
  conversation.participants = await getParticipants(id);
  if (viewer_id) {
    const [[{ unread }]] = await db.execute(
      `SELECT COUNT(*) AS unread FROM messages
       WHERE conversation_id = ? AND sender_id != ? AND is_read = FALSE AND deleted_at IS NULL`,
      [id, viewer_id]
    );
    conversation.unread_count = unread;
  }
  return conversation;
}

async function findByUser(user_id) {
  const [rows] = await db.execute(
    `SELECT c.*,
       s.name AS startup_name, s.slug AS startup_slug,
       cp_me.is_archived AS user_archived,
       cp_me.is_muted    AS user_muted,
       cp_me.role        AS user_role,
       (SELECT CASE
          WHEN m.deleted_at IS NOT NULL THEN 'Message deleted'
          WHEN m.attachment_type = 'shared_post' THEN '📎 Shared a post'
          WHEN m.attachment_type IS NOT NULL AND m.message IS NULL THEN '📎 Attachment'
          ELSE m.message
        END
        FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
       (SELECT m.sender_id FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_id,
       (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
       (SELECT COUNT(*) FROM messages m
        WHERE m.conversation_id = c.id AND m.sender_id != ? AND m.is_read = FALSE AND m.deleted_at IS NULL) AS unread_count
     FROM conversations c
     JOIN conversation_participants cp_me ON cp_me.conversation_id = c.id AND cp_me.user_id = ?
     LEFT JOIN startups s ON s.id = c.startup_id
     WHERE cp_me.is_archived = 0
     ORDER BY COALESCE(c.last_activity_at, c.created_at) DESC`,
    [user_id, user_id]
  );

  for (const conv of rows) {
    conv.participants = await getParticipants(conv.id);
  }
  return rows;
}

/** Archived conversations for a user */
async function findArchivedByUser(user_id) {
  const [rows] = await db.execute(
    `SELECT c.*,
       (SELECT m.message FROM messages m WHERE m.conversation_id = c.id AND m.deleted_at IS NULL ORDER BY m.created_at DESC LIMIT 1) AS last_message,
       (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
     FROM conversations c
     JOIN conversation_participants cp ON cp.conversation_id = c.id AND cp.user_id = ? AND cp.is_archived = 1
     ORDER BY last_message_at DESC`,
    [user_id]
  );
  for (const conv of rows) conv.participants = await getParticipants(conv.id);
  return rows;
}

async function getParticipants(conversation_id) {
  const [rows] = await db.execute(
    `SELECT cp.user_id, cp.joined_at, cp.role, cp.is_muted, cp.last_read_at,
            p.first_name, p.last_name, p.profile_photo, p.verification_level,
            u.role AS user_role, u.status
     FROM conversation_participants cp
     JOIN users u ON u.id = cp.user_id
     LEFT JOIN profiles p ON p.user_id = cp.user_id
     WHERE cp.conversation_id = ?`,
    [conversation_id]
  );
  return rows;
}

/* ── PARTICIPANT MANAGEMENT ──────────────────────── */
async function addParticipant(conversation_id, user_id, role = "member") {
  await db.execute(
    "INSERT IGNORE INTO conversation_participants (conversation_id, user_id, role) VALUES (?, ?, ?)",
    [conversation_id, user_id, role]
  );
}

async function removeParticipant(conversation_id, user_id) {
  await db.execute(
    "DELETE FROM conversation_participants WHERE conversation_id = ? AND user_id = ?",
    [conversation_id, user_id]
  );
}

async function setParticipantMuted(conversation_id, user_id, muted) {
  await db.execute(
    "UPDATE conversation_participants SET is_muted = ? WHERE conversation_id = ? AND user_id = ?",
    [muted ? 1 : 0, conversation_id, user_id]
  );
}

async function setParticipantArchived(conversation_id, user_id, archived) {
  await db.execute(
    "UPDATE conversation_participants SET is_archived = ? WHERE conversation_id = ? AND user_id = ?",
    [archived ? 1 : 0, conversation_id, user_id]
  );
}

/* ── UPDATE ──────────────────────────────────────── */
async function updateTitle(id, title) {
  await db.execute("UPDATE conversations SET title = ? WHERE id = ?", [title, id]);
  return findById(id);
}

async function setPinnedMessage(conversation_id, message_id) {
  await db.execute(
    "UPDATE conversations SET pinned_message_id = ? WHERE id = ?",
    [message_id, conversation_id]
  );
}

/* ── DELETE ──────────────────────────────────────── */
async function remove(id) {
  await db.execute("DELETE FROM conversations WHERE id = ?", [id]);
  return { message: "Conversation deleted." };
}

module.exports = {
  create, findOrCreatePrivate, findOrCreateNegotiation,
  findById, findByUser, findArchivedByUser,
  getParticipants,
  addParticipant, removeParticipant,
  setParticipantMuted, setParticipantArchived,
  updateTitle, setPinnedMessage, remove,
};
