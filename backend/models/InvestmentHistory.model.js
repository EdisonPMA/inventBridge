/**
 * InvestmentHistory model — table: investment_history
 *
 * Records every meaningful event in an investment's lifecycle:
 *   - initial_offer    : first offer created
 *   - counter_offer    : either party updates amount/equity
 *   - status_change    : pending→negotiating, accepted, rejected, cancelled, finalized
 *   - agreement_signed : agreement PDF attached at finalization
 *
 * The `investments` row always holds the latest/current state.
 * This table is the append-only audit trail.
 */
const db = require("../config/database");

/**
 * Append a history entry. Fire-and-forget safe — never throws.
 *
 * @param {object} opts
 * @param {number}      opts.investmentId
 * @param {number}      opts.proposedBy      - userId of the actor
 * @param {string}      opts.eventType       - initial_offer | counter_offer | status_change | agreement_signed
 * @param {number|null} opts.offeredAmount
 * @param {number|null} opts.equityPercentage
 * @param {string|null} opts.notes
 */
async function record({
  investmentId,
  proposedBy,
  eventType,
  offeredAmount    = null,
  equityPercentage = null,
  notes            = null,
}) {
  try {
    await db.execute(
      `INSERT INTO investment_history
         (investment_id, proposed_by, event_type, offered_amount, equity_percentage, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [investmentId, proposedBy, eventType, offeredAmount, equityPercentage, notes]
    );
  } catch { /* never block */ }
}

/**
 * Fetch the full history for an investment, newest-last (chronological).
 * Includes proposer name and role.
 * @param {number} investmentId
 * @returns {Promise<Array>}
 */
async function findByInvestment(investmentId) {
  try {
    const [rows] = await db.execute(
      `SELECT
         ih.id, ih.event_type, ih.offered_amount, ih.equity_percentage,
         ih.notes, ih.created_at,
         u.id   AS proposer_id,
         u.role AS proposer_role,
         p.first_name, p.last_name, p.profile_photo
       FROM investment_history ih
       JOIN users u   ON u.id = ih.proposed_by
       LEFT JOIN profiles p ON p.user_id = u.id
       WHERE ih.investment_id = ?
       ORDER BY ih.created_at ASC`,
      [investmentId]
    );
    return rows;
  } catch { return []; }
}

module.exports = { record, findByInvestment };
