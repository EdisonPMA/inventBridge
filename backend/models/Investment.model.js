/**
 * Investment model â€” table: investments
 * Tracks investment offers, negotiations and closed deals.
 * Statuses: pending | negotiating | accepted | rejected | completed | cancelled | finalized
 *
 * Every mutating operation appends a row to investment_history (fire-and-forget).
 */
const db = require("../config/database");
const History = require("./InvestmentHistory.model");

const WITH_RELATIONS = `
  i.*,
  s.name AS startup_name, s.slug AS startup_slug,
  s.stage, s.industry, s.owner_id AS startup_owner_id,
  s.verification_status AS startup_verification,
  ip.first_name AS investor_first, ip.last_name AS investor_last,
  ip.profile_photo AS investor_photo
`;

const JOIN_RELATIONS = `
  JOIN startups s ON s.id = i.startup_id
  JOIN users inv ON inv.id = i.investor_id
  LEFT JOIN profiles ip ON ip.user_id = i.investor_id
`;

/* â”€â”€ CREATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function create({
  startup_id, investor_id, requested_amount = 0,
  offered_amount = 0, equity_percentage = 0, notes = null,
}) {
  // Prevent duplicate pending offer from same investor to same startup
  const [existing] = await db.execute(
    `SELECT id FROM investments
     WHERE startup_id = ? AND investor_id = ? AND status IN ('pending','negotiating')`,
    [startup_id, investor_id]
  );
  if (existing.length)
    throw new Error("An active investment offer already exists for this startup.");

  const [result] = await db.execute(
    `INSERT INTO investments
       (startup_id, investor_id, requested_amount, offered_amount, equity_percentage, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [startup_id, investor_id, requested_amount, offered_amount, equity_percentage, notes]
  );
  const investment = await findById(result.insertId);

  // Record initial offer in history
  History.record({
    investmentId:    investment.id,
    proposedBy:      investor_id,
    eventType:       "initial_offer",
    offeredAmount:   offered_amount,
    equityPercentage: equity_percentage,
    notes,
  });

  return investment;
}

/* â”€â”€ READ â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function findById(id) {
  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM investments i ${JOIN_RELATIONS}
     WHERE i.id = ? LIMIT 1`,
    [id]
  );
  if (!rows.length) throw new Error("Investment not found.");
  return rows[0];
}

async function findByStartup(startup_id, { status } = {}) {
  const where = status
    ? "WHERE i.startup_id = ? AND i.status = ?"
    : "WHERE i.startup_id = ?";
  const params = status ? [startup_id, status] : [startup_id];

  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM investments i ${JOIN_RELATIONS}
     ${where} ORDER BY i.created_at DESC`,
    params
  );
  return rows;
}

async function findByInvestor(investor_id, { status } = {}) {
  const where = status
    ? "WHERE i.investor_id = ? AND i.status = ?"
    : "WHERE i.investor_id = ?";
  const params = status ? [investor_id, status] : [investor_id];

  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM investments i ${JOIN_RELATIONS}
     ${where} ORDER BY i.created_at DESC`,
    params
  );
  return rows;
}

async function findAll({ status, startup_id, investor_id, limit = 20, offset = 0 } = {}) {
  const conditions = [];
  const params = [];
  if (status)      { conditions.push("i.status = ?");      params.push(status); }
  if (startup_id)  { conditions.push("i.startup_id = ?");  params.push(startup_id); }
  if (investor_id) { conditions.push("i.investor_id = ?"); params.push(investor_id); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS} FROM investments i ${JOIN_RELATIONS}
     ${where} ORDER BY i.created_at DESC LIMIT ${safeLimit} OFFSET ${safeOffset}`,
    [...params, limit, offset]
  );
  const [[{ total }]] = await db.execute(
    `SELECT COUNT(*) AS total FROM investments i ${where}`, params
  );
  return { rows, total };
}

/* â”€â”€ UPDATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function updateStatus(id, status, actorId = null) {
  const valid = ["pending","negotiating","accepted","rejected","completed","cancelled","finalized"];
  if (!valid.includes(status)) throw new Error(`Invalid status: ${status}`);
  await db.execute("UPDATE investments SET status = ? WHERE id = ?", [status, id]);
  const updated = await findById(id);

  // Record the status transition
  if (actorId) {
    History.record({
      investmentId: id,
      proposedBy:   actorId,
      eventType:    "status_change",
      notes:        status,
    });
  }

  return updated;
}

async function updateOffer(id, { offered_amount, equity_percentage, notes }, actorId = null) {
  const fields = [];
  const values = [];
  if (offered_amount    !== undefined) { fields.push("offered_amount = ?");    values.push(offered_amount); }
  if (equity_percentage !== undefined) { fields.push("equity_percentage = ?"); values.push(equity_percentage); }
  if (notes             !== undefined) { fields.push("notes = ?");             values.push(notes); }
  if (!fields.length) throw new Error("No fields to update.");

  await db.execute(
    `UPDATE investments SET ${fields.join(", ")} WHERE id = ?`, [...values, id]
  );
  const updated = await findById(id);

  // Record counter-offer in history
  if (actorId) {
    History.record({
      investmentId:    id,
      proposedBy:      actorId,
      eventType:       "counter_offer",
      offeredAmount:   offered_amount   ?? updated.offered_amount,
      equityPercentage: equity_percentage ?? updated.equity_percentage,
      notes:           notes ?? null,
    });
  }

  return updated;
}

async function attachAgreement(id, agreement_url, actorId = null) {
  await db.execute(
    "UPDATE investments SET agreement_url = ?, status = 'finalized' WHERE id = ?",
    [agreement_url, id]
  );
  const updated = await findById(id);

  if (actorId) {
    History.record({
      investmentId: id,
      proposedBy:   actorId,
      eventType:    "agreement_signed",
      notes:        agreement_url,
    });
  }

  return updated;
}

/* â”€â”€ DELETE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function remove(id) {
  const [result] = await db.execute("DELETE FROM investments WHERE id = ?", [id]);
  if (!result.affectedRows) throw new Error("Investment not found.");
  return { message: "Investment record deleted." };
}

/* â”€â”€ STATS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
async function totalFunded(startup_id) {
  const [[{ total }]] = await db.execute(
    `SELECT COALESCE(SUM(offered_amount), 0) AS total
     FROM investments WHERE startup_id = ? AND status = 'completed'`,
    [startup_id]
  );
  return total;
}

/** All offers received by a founder (across all their startups) */
async function findByFounder(founder_id, { status } = {}) {
  const conditions = ["s.owner_id = ?"];
  const params     = [founder_id];
  if (status) { conditions.push("i.status = ?"); params.push(status); }

  const where = `WHERE ${conditions.join(" AND ")}`;
  const [rows] = await db.execute(
    `SELECT ${WITH_RELATIONS}
     FROM investments i ${JOIN_RELATIONS}
     ${where}
     ORDER BY i.created_at DESC`,
    params
  );
  return rows;
}

module.exports = {
  create, findById, findByStartup, findByInvestor, findByFounder, findAll,
  updateStatus, updateOffer, attachAgreement, remove, totalFunded,
  getHistory: History.findByInvestment,
};
