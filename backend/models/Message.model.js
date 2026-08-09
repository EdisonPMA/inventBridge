/**
 * Message model — table: messages
 *
 * Features: reply threading, soft-delete, edit, pin, reactions,
 * file attachment metadata, read receipts, pagination.
 */
const db = require("../config/database");

/* ── Reusable select ─────────────────────────────── */
const SELECT_MSG = `
  m.id, m.conversation_id, m.sender_id, m.message,
  m.attachment_url, m.attachment_type, m.mime_type, m.file_size, m.file_name, m.public_id,
  m.reply_to_id, m.is_read, m.is_pinned, m.status,
  m.edited_at, m.deleted_at, m.created_at,
  p.first_name, p.last_name, p.profile_photo,
  u.role AS sender_role,
  rm.id          AS reply_id,
  rm.message     AS reply_message,
  rm.sender_id   AS reply_sender_id,
  rm.deleted_at  AS reply_deleted_at,
  rp.first_name  AS reply_first_name,
  rp.last_name   AS reply_last_name
`;

const FROM_MSG = `
  FROM messages m
  LEFT JOIN profiles p  ON p.user_id  = m.sender_id
  LEFT JOIN users u     ON u.id       = m.sender_id
  LEFT JOIN messages rm ON rm.id      = m.reply_to_id
  LEFT JOIN profiles rp ON rp.user_id = rm.sender_id
`;

/* ── CREATE ──────────────────────────────────────── */
async function create({
  conversation_id, sender_id,
  message = null,
  attachment_url = null, attachment_type = null,
  mime_type = null, file_size = null, file_name = null, public_id = null,
  reply_to_id = null,
}) {
  if (!message && !attachment_url)
    throw new Error("Message must have content or an attachment.");

  const [result] = await db.execute(
    `INSERT INTO messages
       (conversation_id, sender_id, message,
        attachment_url, attachment_type, mime_type, file_size, file_name, public_id,
        reply_to_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [conversation_id, sender_id, message,
     attachment_url, attachment_type, mime_type, file_size, file_name, public_id,
     reply_to_id || null]
  );

  // Update conversation last_activity_at
  db.execute(
    "UPDATE conversations SET last_activity_at = NOW() WHERE id = ?",
    [conversation_id]
  ).catch(() => {});

  return findById(result.insertId);
}

/* ── READ ────────────────────────────────────────── */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${SELECT_MSG} ${FROM_MSG} WHERE m.id = ? LIMIT 1`, [id]
  );
  if (!rows.length) throw new Error("Message not found.");
  return normalise(rows[0]);
}

/**
 * Paginate messages for a conversation — newest-N then reversed to oldest-first.
 * Soft-deleted messages show as "[deleted]" placeholders (preserves reply chains).
 */
async function findByConversation(conversation_id, { limit = 50, offset = 0 } = {}) {
  const [[{ total }]] = await db.execute(
    "SELECT COUNT(*) AS total FROM messages WHERE conversation_id = ?",
    [conversation_id]
  );

  const [rows] = await db.execute(
    `SELECT ${SELECT_MSG} ${FROM_MSG}
     WHERE m.conversation_id = ?
     ORDER BY m.created_at DESC
     LIMIT ? OFFSET ?`,
    [conversation_id, limit, offset]
  );

  // Attach reactions for each message
  const msgIds = rows.map(r => r.id);
  const reactions = msgIds.length
    ? await getReactionsBatch(msgIds)
    : {};

  return {
    rows: rows.reverse().map(r => normalise(r, reactions[r.id] || [])),
    total,
  };
}

/** Search messages within a conversation by keyword */
async function search(conversation_id, keyword, { limit = 20 } = {}) {
  const pct = `%${keyword}%`;
  const [rows] = await db.execute(
    `SELECT ${SELECT_MSG} ${FROM_MSG}
     WHERE m.conversation_id = ? AND m.deleted_at IS NULL
       AND m.message LIKE ?
     ORDER BY m.created_at DESC
     LIMIT ?`,
    [conversation_id, pct, limit]
  );
  return rows.map(r => normalise(r, []));
}

/** Get all pinned messages for a conversation */
async function getPinned(conversation_id) {
  const [rows] = await db.execute(
    `SELECT ${SELECT_MSG} ${FROM_MSG}
     WHERE m.conversation_id = ? AND m.is_pinned = 1 AND m.deleted_at IS NULL
     ORDER BY m.created_at DESC`,
    [conversation_id]
  );
  const reactions = rows.length ? await getReactionsBatch(rows.map(r => r.id)) : {};
  return rows.map(r => normalise(r, reactions[r.id] || []));
}

/** Batch-fetch reactions for a list of message IDs */
async function getReactionsBatch(messageIds) {
  if (!messageIds.length) return {};
  const placeholders = messageIds.map(() => "?").join(",");
  const [rows] = await db.execute(
    `SELECT mr.message_id, mr.emoji,
            COUNT(*) AS count,
            GROUP_CONCAT(mr.user_id ORDER BY mr.user_id SEPARATOR ',') AS user_ids_str
     FROM message_reactions mr
     WHERE mr.message_id IN (${placeholders})
     GROUP BY mr.message_id, mr.emoji`,
    messageIds
  );
  const map = {};
  for (const r of rows) {
    if (!map[r.message_id]) map[r.message_id] = [];
    map[r.message_id].push({
      emoji:    r.emoji,
      count:    Number(r.count),
      user_ids: r.user_ids_str ? r.user_ids_str.split(",").map(Number) : [],
    });
  }
  return map;
}

/** Normalise flat SQL row → structured message object */
function normalise(row, reactions = []) {
  const {
    reply_id, reply_message, reply_sender_id, reply_first_name, reply_last_name, reply_deleted_at,
    ...msg
  } = row;

  // Mask soft-deleted content
  if (msg.deleted_at) {
    msg.message        = null;
    msg.attachment_url = null;
    msg.attachment_type = null;
    msg.is_deleted     = true;
  } else {
    msg.is_deleted = false;
  }

  msg.reply = reply_id
    ? {
        id:         reply_id,
        message:    reply_deleted_at ? null : reply_message,
        sender_id:  reply_sender_id,
        first_name: reply_first_name,
        last_name:  reply_last_name,
        is_deleted: !!reply_deleted_at,
      }
    : null;

  msg.reactions = reactions;
  return msg;
}

async function countUnread(user_id, conversation_id = null) {
  if (conversation_id) {
    const [[{ total }]] = await db.execute(
      `SELECT COUNT(*) AS total FROM messages
       WHERE conversation_id = ? AND sender_id != ? AND is_read = 0 AND deleted_at IS NULL`,
      [conversation_id, user_id]
    );
    return total;
  }
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM messages m
     JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id AND cp.user_id = ?
     WHERE m.sender_id != ? AND m.is_read = 0 AND m.deleted_at IS NULL`,
    [user_id, user_id]
  );
  return total;
}

/* ── UPDATE ──────────────────────────────────────── */
async function markRead(conversation_id, reader_id) {
  await db.execute(
    `UPDATE messages SET is_read = 1, status = 'read'
     WHERE conversation_id = ? AND sender_id != ? AND is_read = 0 AND deleted_at IS NULL`,
    [conversation_id, reader_id]
  );
  // Track per-participant last_read_at
  db.execute(
    `UPDATE conversation_participants SET last_read_at = NOW()
     WHERE conversation_id = ? AND user_id = ?`,
    [conversation_id, reader_id]
  ).catch(() => {});
}

async function markOneRead(id) {
  await db.execute("UPDATE messages SET is_read = 1, status = 'read' WHERE id = ?", [id]);
}

/** Edit a message (sets edited_at timestamp) */
async function edit(id, newContent) {
  if (!newContent?.trim()) throw new Error("Message content cannot be empty.");
  await db.execute(
    "UPDATE messages SET message = ?, edited_at = NOW() WHERE id = ? AND deleted_at IS NULL",
    [newContent.trim(), id]
  );
  return findById(id);
}

/** Soft-delete a message (preserves row for reply chains) */
async function softDelete(id) {
  await db.execute(
    "UPDATE messages SET deleted_at = NOW(), message = NULL, attachment_url = NULL WHERE id = ?",
    [id]
  );
  return findById(id);
}

/** Toggle pin on a message */
async function togglePin(id) {
  await db.execute(
    "UPDATE messages SET is_pinned = NOT is_pinned WHERE id = ?", [id]
  );
  return findById(id);
}

/* ── REACTIONS ───────────────────────────────────── */
async function toggleReaction(message_id, user_id, emoji) {
  // Check if reaction exists
  const [existing] = await db.execute(
    "SELECT id FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
    [message_id, user_id, emoji]
  );
  if (existing.length) {
    await db.execute(
      "DELETE FROM message_reactions WHERE message_id = ? AND user_id = ? AND emoji = ?",
      [message_id, user_id, emoji]
    );
    return { action: "removed" };
  } else {
    await db.execute(
      "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES (?, ?, ?)",
      [message_id, user_id, emoji]
    );
    return { action: "added" };
  }
}

/* ── HARD DELETE (admin) ─────────────────────────── */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM messages WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Message not found.");
  return { message: "Message deleted." };
}

module.exports = {
  create, findById, findByConversation, search,
  getPinned, getReactionsBatch,
  countUnread, markRead, markOneRead,
  edit, softDelete, togglePin, toggleReaction,
  remove,
};
