/**
 * aiService.js — Reusable OpenAI wrapper for InventBridge.
 *
 * Responsibilities:
 *  - Single OpenAI client instance (lazy-initialised, fails gracefully if key missing)
 *  - Context-builder helpers that convert DB rows → clean prompt strings
 *  - Core `chat()` function used by every AI controller action
 *  - Token-budget guard: truncates context strings that are too long
 *  - Structured JSON responses via response_format (where supported)
 *  - Consistent error logging without leaking internals
 *
 * NEVER called directly from routes — always goes through AI.controller.js.
 * NEVER returns raw OpenAI errors to callers — always throws clean Error objects.
 */

const OpenAI = require("openai");

/* ── Client singleton ──────────────────────────── */
let _client = null;

function getClient() {
  if (_client) return _client;

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error("OPENAI_API_KEY is not configured. Add it to your .env file.");
  }

  _client = new OpenAI({ apiKey: key });
  return _client;
}

const DEFAULT_MODEL  = () => process.env.OPENAI_MODEL || "gpt-4o-mini";
const MAX_CTX_CHARS  = 12_000; // guard against huge DB rows filling the context

/* ── Utility: trim strings to budget ──────────── */
function trim(str, max = 400) {
  if (!str) return "";
  const s = String(str).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

/* ── Context builders ──────────────────────────── */

/**
 * Build a compact textual profile of a startup for AI context.
 * @param {object} s  row from startups table (+ category_name, owner fields)
 */
function startupContext(s) {
  return [
    `Name: ${s.name}`,
    s.industry        && `Industry: ${s.industry}`,
    s.category_name   && `Category: ${s.category_name}`,
    s.stage           && `Stage: ${s.stage}`,
    s.country         && `Location: ${[s.country, s.province, s.district].filter(Boolean).join(", ")}`,
    s.funding_required && `Funding needed: $${Number(s.funding_required).toLocaleString()}`,
    s.equity_offered   && `Equity offered: ${s.equity_offered}%`,
    s.description     && `Description: ${trim(s.description, 300)}`,
    s.problem         && `Problem: ${trim(s.problem, 200)}`,
    s.solution        && `Solution: ${trim(s.solution, 200)}`,
    s.mission         && `Mission: ${trim(s.mission, 150)}`,
    s.business_model  && `Business model: ${trim(s.business_model, 150)}`,
    s.revenue_model   && `Revenue model: ${trim(s.revenue_model, 150)}`,
    s.verification_status && `Verification: ${s.verification_status}`,
    s.ai_score != null && `Completeness score: ${s.ai_score}/100`,
  ].filter(Boolean).join("\n");
}

/**
 * Build a compact investor profile for AI context.
 * @param {object} u  users row
 * @param {object} p  profiles row
 * @param {Array}  investments  investor's past investments (from investments table)
 * @param {Array}  savedStartups  startups the investor saved
 */
function investorContext(u, p, investments = [], savedStartups = []) {
  const industries = [...new Set([
    ...investments.map(i => i.industry).filter(Boolean),
    ...savedStartups.map(s => s.industry).filter(Boolean),
  ])];
  const stages = [...new Set(investments.map(i => i.stage).filter(Boolean))];
  const totalInvested = investments.reduce((acc, i) => acc + Number(i.offered_amount || 0), 0);

  return [
    p && `Name: ${[p.first_name, p.last_name].filter(Boolean).join(" ")}`,
    p?.country    && `Location: ${p.country}`,
    p?.headline   && `Headline: ${trim(p.headline, 120)}`,
    p?.bio        && `Bio: ${trim(p.bio, 200)}`,
    industries.length && `Industries of interest: ${industries.slice(0, 8).join(", ")}`,
    stages.length     && `Stages invested in: ${stages.slice(0, 5).join(", ")}`,
    investments.length && `Number of investments: ${investments.length}`,
    totalInvested > 0  && `Total invested: $${totalInvested.toLocaleString()}`,
  ].filter(Boolean).join("\n");
}

/**
 * Build a short list of startups as numbered items for ranking prompts.
 * @param {Array} startups
 */
function startupListContext(startups) {
  return startups
    .map((s, i) =>
      `[${i + 1}] ${s.name} | ${s.industry || "?"} | Stage: ${s.stage || "?"} | ` +
      `Funding: $${Number(s.funding_required || 0).toLocaleString()} | ` +
      `Country: ${s.country || "?"} | Score: ${s.ai_score || 0}/100 | ` +
      `${trim(s.description, 120)}`
    )
    .join("\n");
}

/* ── Core chat function ────────────────────────── */

/**
 * Send a chat completion request to OpenAI.
 * Returns the parsed content string.
 *
 * @param {string}   systemPrompt  Role/instructions for the model
 * @param {string}   userPrompt    The actual query / context
 * @param {object}   options
 * @param {boolean}  options.json  If true, requests JSON object response
 * @param {number}   options.maxTokens  Response length cap (default 800)
 * @param {number}   options.temperature  (default 0.4)
 */
async function chat(systemPrompt, userPrompt, {
  json = false,
  maxTokens = 800,
  temperature = 0.4,
} = {}) {
  const client = getClient();
  const model  = DEFAULT_MODEL();

  // Guard: never send more than MAX_CTX_CHARS of user content
  const safeUser = userPrompt.length > MAX_CTX_CHARS
    ? userPrompt.slice(0, MAX_CTX_CHARS) + "\n\n[Context truncated for length]"
    : userPrompt;

  const requestParams = {
    model,
    messages: [
      { role: "system",  content: systemPrompt },
      { role: "user",    content: safeUser },
    ],
    max_tokens:  maxTokens,
    temperature,
  };

  if (json) {
    requestParams.response_format = { type: "json_object" };
  }

  try {
    const response = await client.chat.completions.create(requestParams);
    const content = response.choices?.[0]?.message?.content;

    if (!content) throw new Error("OpenAI returned an empty response.");

    // Log token usage in development for cost awareness
    if (process.env.NODE_ENV !== "production" && response.usage) {
      console.log(`[AI] ${model} | prompt:${response.usage.prompt_tokens} completion:${response.usage.completion_tokens} total:${response.usage.total_tokens}`);
    }

    return content;
  } catch (err) {
    // Map OpenAI error types to clean messages
    if (err?.status === 401) throw new Error("Invalid OpenAI API key.");
    if (err?.status === 429) throw new Error("OpenAI rate limit reached. Please try again in a moment.");
    if (err?.status === 503) throw new Error("OpenAI service is temporarily unavailable.");
    if (err?.code === "context_length_exceeded") throw new Error("Context too long. Try with fewer items.");

    // Don't leak raw OpenAI internals — log server-side only
    console.error("[AI] OpenAI error:", err?.message || err);
    throw new Error("AI analysis temporarily unavailable.");
  }
}

/* ── System prompt templates ───────────────────── */

const SYSTEM = {
  recommender: `You are an intelligent startup-investor matching engine for InventBridge, a platform connecting innovative startups with investors.
Your job is to analyse investor profiles and startup data, then produce ranked, explainable recommendations.
Be concise, objective, and grounded in the data provided. Focus on: industry alignment, stage fit, funding match, geographic preference, and business model clarity.
Always respond in the exact JSON format requested.`,

  analyst: `You are a startup analysis expert for InventBridge.
Analyse startup profiles objectively, identify strengths and weaknesses, and provide actionable improvement suggestions.
Base your analysis only on the data provided. Be specific, constructive, and concise.
Always respond in the exact JSON format requested.`,

  insights: `You are a business intelligence assistant for InventBridge.
Generate data-driven insights about startup ecosystems, investment trends, and platform activity.
Be specific, use the data provided, and avoid generic statements.
Respond in the exact JSON format requested.`,
};

module.exports = {
  chat,
  startupContext,
  investorContext,
  startupListContext,
  SYSTEM,
  trim,
};
