/**
 * Transactional email utility — wraps Nodemailer.
 * Gracefully no-ops when SMTP is not configured (dev/test environments).
 *
 * Required env vars (all optional — emails are skipped when absent):
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   EMAIL_FROM  — "InventBridge <no-reply@inventbridge.com>"
 */
const nodemailer = require("nodemailer");

const CONFIGURED =
  process.env.SMTP_HOST &&
  process.env.SMTP_USER &&
  process.env.SMTP_PASS;

const transporter = CONFIGURED
  ? nodemailer.createTransport({
      host:   process.env.SMTP_HOST,
      port:   parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
  : null;

const FROM = process.env.EMAIL_FROM || "InventBridge <no-reply@inventbridge.com>";

/**
 * Send a transactional email. Silently skips when SMTP is not configured.
 * Always fire-and-forget safe — never throws.
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
async function sendEmail({ to, subject, html, text }) {
  if (!transporter || !to) return;
  try {
    await transporter.sendMail({ from: FROM, to, subject, html, text: text || "" });
  } catch (err) {
    // Log but never bubble up — email failure must not break the API response
    console.error("[Email] Failed to send to", to, "—", err.message);
  }
}

/* ── Investment email templates ──────────────────── */

function investmentOfferEmail({ founderEmail, founderName, investorName, startupName, amount, equity }) {
  const fmt = (n) => Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
  return sendEmail({
    to:      founderEmail,
    subject: `New Investment Offer for ${startupName}`,
    text:    `Hi ${founderName},\n\n${investorName} submitted an investment offer of ${fmt(amount)} for ${equity}% equity in "${startupName}".\n\nLog in to review and respond.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#2563eb">New Investment Offer 💼</h2>
        <p>Hi <strong>${founderName}</strong>,</p>
        <p><strong>${investorName}</strong> submitted an investment offer for your startup <strong>"${startupName}"</strong>:</p>
        <table style="margin:16px 0;border-collapse:collapse;width:100%">
          <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Amount</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${fmt(amount)}</td></tr>
          <tr><td style="padding:8px 12px;background:#f8fafc;border:1px solid #e2e8f0;font-weight:600">Equity</td><td style="padding:8px 12px;border:1px solid #e2e8f0">${equity}%</td></tr>
        </table>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/inventor/investment-offers"
           style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Review Offer →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · You're receiving this because you're a founder on the platform.</p>
      </div>`,
  });
}

function investmentAcceptedEmail({ investorEmail, investorName, founderName, startupName }) {
  return sendEmail({
    to:      investorEmail,
    subject: `Your investment offer for ${startupName} was accepted 🎉`,
    text:    `Hi ${investorName},\n\nGreat news! ${founderName} accepted your investment offer for "${startupName}".\n\nLog in to proceed with next steps.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#059669">Offer Accepted 🎉</h2>
        <p>Hi <strong>${investorName}</strong>,</p>
        <p><strong>${founderName}</strong> accepted your investment offer for <strong>"${startupName}"</strong>.</p>
        <p>Log in to coordinate next steps and finalize the deal.</p>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/investor/investments"
           style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          View Investment →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · You're receiving this because you're an investor on the platform.</p>
      </div>`,
  });
}

function investmentFinalizedEmail({ recipientEmail, recipientName, startupName, role }) {
  return sendEmail({
    to:      recipientEmail,
    subject: `Investment deal for ${startupName} has been finalized`,
    text:    `Hi ${recipientName},\n\nThe investment deal for "${startupName}" has been finalized. Log in to view the agreement.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#7c3aed">Deal Finalized ✅</h2>
        <p>Hi <strong>${recipientName}</strong>,</p>
        <p>The investment deal for <strong>"${startupName}"</strong> has been finalized.</p>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/${role === "investor" ? "investor" : "inventor"}/investments"
           style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          View Agreement →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · You're receiving this because you're involved in this investment.</p>
      </div>`,
  });
}

/* ── Account status email templates ─────────────── */

function accountSuspendedEmail({ recipientEmail, recipientName, reason }) {
  return sendEmail({
    to:      recipientEmail,
    subject: "Your InventBridge account has been suspended",
    text:    `Hi ${recipientName},\n\nYour account has been suspended.\n\nReason: ${reason}\n\nIf you believe this is a mistake, please contact support.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#dc2626">Account Suspended</h2>
        <p>Hi <strong>${recipientName}</strong>,</p>
        <p>Your InventBridge account has been suspended.</p>
        <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px">
          <p style="margin:0;font-size:14px;color:#7f1d1d"><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>If you believe this is a mistake, please contact our support team.</p>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · This is an automated account notification.</p>
      </div>`,
  });
}

function accountReactivatedEmail({ recipientEmail, recipientName }) {
  return sendEmail({
    to:      recipientEmail,
    subject: "Your InventBridge account has been reactivated",
    text:    `Hi ${recipientName},\n\nGreat news — your account has been reactivated. You can now log in and access the platform.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#059669">Account Reactivated ✓</h2>
        <p>Hi <strong>${recipientName}</strong>,</p>
        <p>Your InventBridge account has been <strong>reactivated</strong>. You can now log in and access the platform.</p>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/"
           style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Log In →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · This is an automated account notification.</p>
      </div>`,
  });
}

/* ── Startup verification email templates ────────── */

function startupVerifiedEmail({ founderEmail, founderName, startupName }) {
  return sendEmail({
    to:      founderEmail,
    subject: `Your startup "${startupName}" has been verified! 🎉`,
    text:    `Hi ${founderName},\n\nCongratulations! Your startup "${startupName}" has been verified and is now publicly visible to investors.\n\nLog in to review investor activity.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#059669">Startup Verified 🎉</h2>
        <p>Hi <strong>${founderName}</strong>,</p>
        <p>Congratulations! Your startup <strong>"${startupName}"</strong> has been verified and is now <strong>publicly visible to investors</strong>.</p>
        <p>Investors can now discover your startup and submit investment offers.</p>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/inventor/dashboard"
           style="display:inline-block;background:#059669;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Go to Dashboard →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · You're receiving this because you're a founder on the platform.</p>
      </div>`,
  });
}

function startupRejectedEmail({ founderEmail, founderName, startupName, reason }) {
  return sendEmail({
    to:      founderEmail,
    subject: `Verification update for "${startupName}"`,
    text:    `Hi ${founderName},\n\nYour startup "${startupName}" verification was not approved.\n\nReason: ${reason || "Please review your submission and resubmit."}\n\nYou can update your startup details and resubmit.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#dc2626">Verification Update</h2>
        <p>Hi <strong>${founderName}</strong>,</p>
        <p>Your startup <strong>"${startupName}"</strong> verification was <strong>not approved</strong>.</p>
        ${reason ? `
        <div style="margin:16px 0;padding:12px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:4px">
          <p style="margin:0;font-size:14px;color:#7f1d1d"><strong>Reason:</strong> ${reason}</p>
        </div>` : ""}
        <p>Please review your startup profile, address any issues, and resubmit for verification.</p>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/inventor/startups"
           style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          Edit & Resubmit →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · You're receiving this because you're a founder on the platform.</p>
      </div>`,
  });
}

function startupSubmittedEmail({ founderEmail, founderName, startupName }) {
  return sendEmail({
    to:      founderEmail,
    subject: `Verification submitted for "${startupName}"`,
    text:    `Hi ${founderName},\n\nYour startup "${startupName}" has been submitted for verification. Our team will review it shortly — usually within 2-3 business days.\n\nWe'll notify you once a decision is made.\n\nInventBridge Team`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
        <h2 style="color:#2563eb">Verification Submitted ✓</h2>
        <p>Hi <strong>${founderName}</strong>,</p>
        <p>Your startup <strong>"${startupName}"</strong> has been submitted for verification.</p>
        <p>Our team will review your submission — usually within <strong>2–3 business days</strong>. We'll notify you once a decision is made.</p>
        <a href="${process.env.CLIENT_ORIGIN || "http://localhost:5173"}/inventor/dashboard"
           style="display:inline-block;background:#2563eb;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:600">
          View Dashboard →
        </a>
        <p style="margin-top:24px;color:#64748b;font-size:13px">InventBridge · You're receiving this because you're a founder on the platform.</p>
      </div>`,
  });
}

module.exports = {
  sendEmail,
  investmentOfferEmail, investmentAcceptedEmail, investmentFinalizedEmail,
  accountSuspendedEmail, accountReactivatedEmail,
  startupVerifiedEmail, startupRejectedEmail, startupSubmittedEmail,
};