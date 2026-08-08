/**
 * aiApi.js — Frontend client for InventBridge AI endpoints.
 *
 * All calls go through the authenticated axios instance (api.js).
 * The OpenAI API key is never used or visible here — it lives on the server.
 *
 * Every function throws on error so callers can handle via try/catch or .catch().
 */
import api from "./api";

/* ── 1. Startup recommendations (investor) ──────── */
/**
 * Get AI-ranked startup recommendations for the logged-in investor.
 * @param {object} opts
 * @param {number} [opts.limit=5]  Number of recommendations (1–10)
 * @returns {{ recommendations: Array }}
 */
export async function getStartupRecommendations({ limit = 5 } = {}) {
  const res = await api.post("/ai/startup-recommendations", { limit });
  return res.data;
}

/* ── 2. Investor matches (startup founder) ───────── */
/**
 * Get AI-ranked investor matches for a specific startup.
 * @param {object} opts
 * @param {number} opts.startup_id
 * @param {number} [opts.limit=5]
 * @returns {{ matches: Array }}
 */
export async function getInvestorMatches({ startup_id, limit = 5 }) {
  const res = await api.post("/ai/investor-matches", { startup_id, limit });
  return res.data;
}

/* ── 3. Startup analysis ─────────────────────────── */
/**
 * Get a deep AI analysis of a startup profile.
 * @param {number} startup_id
 * @returns {{ startup_id, startup_name, analysis }}
 */
export async function analyseStartup(startup_id) {
  const res = await api.post("/ai/startup-analysis", { startup_id });
  return res.data;
}

/* ── 4. Explain recommendation ───────────────────── */
/**
 * Explain why a startup is (or isn't) a good match for an investor.
 * @param {object} opts
 * @param {number} opts.startup_id
 * @param {number} [opts.investor_id]  Defaults to logged-in user
 * @returns {{ explanation }}
 */
export async function explainRecommendation({ startup_id, investor_id } = {}) {
  const res = await api.post("/ai/explain-recommendation", { startup_id, investor_id });
  return res.data;
}

/* ── 5. Profile improvement suggestions ─────────── */
/**
 * Get actionable suggestions to improve a profile.
 * @param {object} [opts]
 * @param {number} [opts.startup_id]  If provided, analyses the startup; otherwise analyses the user's own profile
 * @returns {{ subject_type, subject_name, suggestions }}
 */
export async function getProfileSuggestions({ startup_id } = {}) {
  const res = await api.post("/ai/profile-suggestions", { startup_id });
  return res.data;
}

/* ── 6. Startup / ecosystem insights ────────────── */
/**
 * Get AI-generated insights.
 * @param {object} [opts]
 * @param {number} [opts.startup_id]  If provided, startup-specific; otherwise platform-level (admin/org only)
 * @returns {{ scope, insights }}
 */
export async function getStartupInsights({ startup_id } = {}) {
  const res = await api.post("/ai/startup-insights", { startup_id });
  return res.data;
}
