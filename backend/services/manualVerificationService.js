/**
 * manualVerificationService.js
 *
 * Current implementation: all verification decisions are made manually by admins.
 *
 * FUTURE RDB INTEGRATION:
 * When the RDB API becomes available, create rdbVerificationService.js that
 * implements the same interface. Switch by changing the export in
 * verificationService.js — no controllers or frontend changes required.
 *
 * Interface this service must fulfil:
 *   prepareSubmission(data)     → validate & shape data before DB insert
 *   canResubmit(request)        → returns bool — is rejection resubmittable?
 *   onApproved(request, conn)   → side-effects after admin approves (in transaction)
 *   onRejected(request, conn)   → side-effects after admin rejects (in transaction)
 */

const VALID_TRANSITIONS = {
  pending:      ["under_review"],
  under_review: ["approved", "rejected"],
  rejected:     ["pending"],          // resubmit resets to pending
  approved:     [],                   // terminal — no re-verification in v1
};

/**
 * Validates a new submission payload.
 * Returns { ok: true } or { ok: false, message }
 */
function prepareSubmission({ verification_type, document_url, registration_number }) {
  if (!verification_type) return { ok: false, message: "verification_type is required." };
  const allowed = ["startup_registration", "startup_verification", "investor_registration"];
  if (!allowed.includes(verification_type)) {
    return { ok: false, message: `verification_type must be one of: ${allowed.join(", ")}.` };
  }
  return { ok: true };
}

/**
 * Whether a rejected request can be resubmitted.
 * Manual review: always yes.
 */
function canResubmit(request) {
  return request.status === "rejected";
}

/**
 * Validate a status transition.
 */
function isValidTransition(from, to) {
  return (VALID_TRANSITIONS[from] || []).includes(to);
}

/**
 * Actions run inside the approval transaction.
 * conn = mysql2 connection (already in transaction).
 */
async function onApproved(request, conn) {
  if (request.startup_id) {
    // Startup verification: publish the startup and mark it verified.
    // Do NOT touch the owner's profile verification_level —
    // inventors are not "verified users"; only investors are.
    await conn.execute(
      "UPDATE startups SET verification_status = 'verified', status = 'published' WHERE id = ?",
      [request.startup_id]
    );
  } else {
    // Non-startup (investor) verification: mark the profile as verified.
    await conn.execute(
      "UPDATE profiles SET verification_level = 'verified' WHERE user_id = ?",
      [request.user_id]
    );
  }
}

/**
 * Actions run inside the rejection transaction.
 * For manual review: only record is sufficient — no external calls.
 */
async function onRejected(request, conn) {
  if (request.startup_id) {
    // Revert startup to draft so the inventor can edit and resubmit.
    // Clear verification_status back to 'pending' only after resubmit,
    // but set it 'rejected' now so the inventor sees the outcome.
    await conn.execute(
      "UPDATE startups SET verification_status = 'rejected', status = 'draft' WHERE id = ?",
      [request.startup_id]
    );
  }
}

module.exports = {
  prepareSubmission,
  canResubmit,
  isValidTransition,
  onApproved,
  onRejected,
};
