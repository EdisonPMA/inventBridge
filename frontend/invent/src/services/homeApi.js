import api from "./api";
import {
  mapStartup,
  mapInvestor,
  mapOrganization,
  mapCategory,
  mapPost,
} from "./mappers";

export { mapStartup, mapInvestor, mapCategory, mapPost };

export async function fetchPlatformStats() {
  const res = await api.get("/auth/stats");
  return res.data.stats;
}

export async function fetchFeaturedStartups(params = {}) {
  const res = await api.get("/startups", {
    params: {
      status: "published",
      limit: params.limit ?? 6,
      search: params.search || undefined,
      industry: params.industry || undefined,
      verification_status: params.verified ? "verified" : undefined,
    },
  });
  return (res.data.rows || []).map(mapStartup);
}

export async function fetchFeaturedInvestors(limit = 6) {
  const res = await api.get("/auth/directory", { params: { role: "investor", limit } });
  return (res.data.members || []).map(mapInvestor);
}

export async function fetchOrganizations(limit = 8) {
  const res = await api.get("/auth/directory", { params: { role: "organization", limit } });
  return (res.data.members || []).map(mapOrganization);
}

export async function fetchCategories() {
  const res = await api.get("/categories", { params: { status: "active" } });
  return (res.data.categories || []).map(mapCategory);
}

export async function fetchActivityFeed(limit = 8) {
  const res = await api.get("/posts", { params: { limit } });
  return (res.data.rows || []).map(mapPost);
}

export async function fetchOpportunities(limit = 6) {
  const res = await api.get("/startups", {
    params: {
      status: "published",
      limit,
    },
  });
  return (res.data.rows || [])
    .filter((s) => Number(s.funding_required) > 0)
    .map((s) => ({
      id: s.id,
      name: s.name,
      industry: s.industry || s.category_name,
      stage: s.stage,
      funding: Number(s.funding_required),
      country: s.country,
      status: s.verification_status,
      slug: s.slug,
    }));
}

export async function fetchSuccessStories() {
  const res = await api.get("/auth/success-stories");
  return res.data.stories || [];
}

export async function searchPlatform({ query, type = "All", limit = 12 } = {}) {
  const params = { limit };

  if (type === "Startups" || type === "All") {
    const startups = await fetchFeaturedStartups({ search: query, limit });
    if (type === "Startups") return { startups, investors: [], organizations: [] };
  }

  const [startups, investors, organizations] = await Promise.all([
    fetchFeaturedStartups({ search: query, limit }),
    type === "Investors" || type === "All"
      ? api.get("/auth/directory", { params: { role: "investor", limit } }).then((r) => (r.data.members || []).map(mapInvestor))
      : Promise.resolve([]),
    type === "Organizations" || type === "All"
      ? api.get("/auth/directory", { params: { role: "organization", limit } }).then((r) => (r.data.members || []).map(mapOrganization))
      : Promise.resolve([]),
  ]);

  return { startups, investors, organizations };
}
