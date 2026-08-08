/**
 * investmentApi.js — Investment offer workflow API calls.
 * All operations use JWT — never pass investor_id from the frontend.
 */
import api from "./api";

/* ── Create offer ────────────────────────────────── */
export async function createInvestment({ startup_id, offered_amount, equity_percentage, notes }) {
  const res = await api.post("/investments", {
    startup_id,
    offered_amount:    Number(offered_amount),
    equity_percentage: Number(equity_percentage),
    notes,
  });
  return res.data;
}

/* ── Read ────────────────────────────────────────── */
/** Investor: my sent offers */
export async function getMyInvestments(status) {
  const params = status ? { status } : {};
  const res = await api.get("/investments/mine", { params });
  return res.data.investments ?? [];
}

/** Founder: offers received on my startups */
export async function getReceivedInvestments(status) {
  const params = status ? { status } : {};
  const res = await api.get("/investments/received", { params });
  return res.data.investments ?? [];
}

export async function getStartupInvestments(startupId, status) {
  const params = status ? { status } : {};
  const res = await api.get(`/investments/startup/${startupId}`, { params });
  return res.data.investments ?? [];
}

export async function getInvestmentById(id) {
  const res = await api.get(`/investments/${id}`);
  return res.data.investment;
}

/* ── State transitions ───────────────────────────── */
export async function acceptInvestment(id) {
  const res = await api.patch(`/investments/${id}/accept`);
  return res.data;
}

export async function rejectInvestment(id) {
  const res = await api.patch(`/investments/${id}/reject`);
  return res.data;
}

export async function negotiateInvestment(id) {
  const res = await api.patch(`/investments/${id}/negotiate`);
  return res.data; // includes { investment, conversation }
}

export async function cancelInvestment(id) {
  const res = await api.patch(`/investments/${id}/cancel`);
  return res.data;
}

export async function finalizeInvestment(id, agreement_url) {
  const res = await api.patch(`/investments/${id}/finalize`, { agreement_url });
  return res.data;
}

export async function updateOffer(id, { offered_amount, equity_percentage, notes }) {
  const res = await api.put(`/investments/${id}/offer`, {
    offered_amount, equity_percentage, notes,
  });
  return res.data;
}

/** Full negotiation history — array of events oldest-first */
export async function getInvestmentHistory(id) {
  const res = await api.get(`/investments/${id}/history`);
  return res.data.history ?? [];
}
