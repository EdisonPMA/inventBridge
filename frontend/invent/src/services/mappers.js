/** Map backend startup row → frontend StartupCard shape */
export function mapStartup(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    industry: row.industry || row.category_name || "General",
    stage: row.stage || "Early",
    fundingRequired: Number(row.funding_required ?? row.fundingRequired ?? 0),
    equityOffered: Number(row.equity_offered ?? row.equityOffered ?? 0),
    country: row.country,
    verificationStatus: row.verification_status ?? row.verificationStatus ?? "pending",
    description: row.description,
    logo: row.logo_file_url || row.logo_url || row.logo || null,
    followerCount: Number(row.follower_count ?? 0),
    saveCount: Number(row.save_count ?? 0),
  };
}

/** Map backend investor/user row → featured investor card */
export function mapInvestor(row) {
  const first = row.first_name || row.firstName || "";
  const last = row.last_name || row.lastName || "";
  const name = `${first} ${last}`.trim() || "Investor";
  return {
    id: row.id,
    name,
    company: row.headline || row.bio?.slice(0, 40) || "Independent Investor",
    interests: row.industry ? [row.industry] : ["Multi-sector"],
    country: row.country || "Global",
    investments: Number(row.investment_count || 0),
    verified: ["verified", "premium"].includes(row.verification_level),
    avatar: `${first.charAt(0)}${last.charAt(0) || ""}`.toUpperCase() || "IN",
  };
}

/** Map backend organization user → partner card */
export function mapOrganization(row) {
  const first = row.first_name || "";
  const last = row.last_name || "";
  const name = `${first} ${last}`.trim() || row.headline || "Organization";
  return { id: row.id, name };
}

/** Map backend category → category card */
export function mapCategory(row) {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    count: Number(row.startup_count || 0),
  };
}

/** Map backend post → activity feed item */
export function mapPost(row) {
  const author =
    row.startup_name ||
    `${row.first_name || ""} ${row.last_name || ""}`.trim() ||
    "Member";
  const first = (row.first_name || author).charAt(0);
  const last = (row.last_name || "").charAt(0);
  return {
    id: row.id,
    actor: author,
    action: row.content,
    time: formatRelativeTime(row.created_at),
    avatar: `${first}${last || author.charAt(1) || ""}`.toUpperCase().slice(0, 2),
    likes: Number(row.like_count || 0),
    comments: Number(row.comment_count || 0),
  };
}

export function formatRelativeTime(date) {
  if (!date) return "";
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function formatStatValue(n) {
  const num = Number(n || 0);
  if (num >= 1000) return `${Math.floor(num / 100) / 10}K`;
  return String(num);
}
