/**
 * verificationService.js — strategy façade
 *
 * Switch implementations by changing the `require` below.
 * When the RDB API is available:
 *   1. Create services/rdbVerificationService.js implementing the same interface.
 *   2. Change the line below to:
 *        const provider = require("./rdbVerificationService");
 *   3. No controller or frontend changes are needed.
 *
 * The provider must export:
 *   prepareSubmission(data)
 *   canResubmit(request)
 *   isValidTransition(from, to)
 *   onApproved(request, conn)
 *   onRejected(request, conn)
 */

const provider = require("./manualVerificationService");

module.exports = {
  /** Validate submission payload. Returns { ok, message? } */
  prepareSubmission: (data) => provider.prepareSubmission(data),

  /** Returns true if this request can be resubmitted after rejection */
  canResubmit: (request) => provider.canResubmit(request),

  /** Returns true if the status transition is valid */
  isValidTransition: (from, to) => provider.isValidTransition(from, to),

  /**
   * Called inside the DB transaction after admin approves.
   * Performs any side-effects (update startup, profile, etc.)
   */
  onApproved: (request, conn) => provider.onApproved(request, conn),

  /**
   * Called inside the DB transaction after admin rejects.
   */
  onRejected: (request, conn) => provider.onRejected(request, conn),
};
