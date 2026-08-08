const delay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

export const stats = [
  { id: 1, icon: "users", value: 12500, label: "Registered Users", description: "Active members across the ecosystem" },
  { id: 2, icon: "rocket", value: 3200, label: "Verified Startups", description: "Innovation-driven companies" },
  { id: 3, icon: "briefcase", value: 890, label: "Verified Investors", description: "Angels, VCs, and institutions" },
  { id: 4, icon: "trending-up", value: 450, label: "Investments Facilitated", description: "Successful funding connections" },
  { id: 5, icon: "building", value: 210, label: "Organizations", description: "Incubators and accelerators" },
  { id: 6, icon: "globe", value: 42, label: "Countries", description: "Global reach and impact" },
];

export const startups = [
  {
    id: 1,
    name: "AgriNova",
    industry: "Agriculture",
    stage: "Seed",
    country: "Kenya",
    fundingRequired: "$250K",
    description: "Smart irrigation platform helping smallholder farmers increase yields by 40%.",
    verified: true,
    logo: "AN",
  },
  {
    id: 2,
    name: "MediLink",
    industry: "Healthcare",
    stage: "Series A",
    country: "Nigeria",
    fundingRequired: "$1.2M",
    description: "Telemedicine network connecting rural clinics with specialist doctors.",
    verified: true,
    logo: "ML",
  },
  {
    id: 3,
    name: "EduSpark",
    industry: "Education",
    stage: "Pre-seed",
    country: "South Africa",
    fundingRequired: "$150K",
    description: "Adaptive learning platform for STEM education in underserved communities.",
    verified: true,
    logo: "ES",
  },
  {
    id: 4,
    name: "FinFlow",
    industry: "FinTech",
    stage: "Seed",
    country: "Ghana",
    fundingRequired: "$500K",
    description: "Mobile-first banking for SMEs with integrated invoicing and credit scoring.",
    verified: false,
    logo: "FF",
  },
];

export const investors = [
  {
    id: 1,
    name: "Sarah Chen",
    company: "Horizon Ventures",
    interests: ["FinTech", "AI", "Healthcare"],
    country: "USA",
    range: "$100K – $2M",
    verified: true,
    avatar: "SC",
  },
  {
    id: 2,
    name: "James Okafor",
    company: "African Growth Capital",
    interests: ["Agriculture", "Energy", "Education"],
    country: "Nigeria",
    range: "$50K – $1M",
    verified: true,
    avatar: "JO",
  },
  {
    id: 3,
    name: "Elena Rodriguez",
    company: "Blue Ocean Partners",
    interests: ["Tourism", "Manufacturing", "FinTech"],
    country: "Spain",
    range: "$250K – $5M",
    verified: true,
    avatar: "ER",
  },
];

export const categories = [
  { id: 1, name: "Agriculture", icon: "sprout", count: 420 },
  { id: 2, name: "Healthcare", icon: "heart-pulse", count: 380 },
  { id: 3, name: "Education", icon: "graduation-cap", count: 290 },
  { id: 4, name: "AI", icon: "brain", count: 510 },
  { id: 5, name: "FinTech", icon: "wallet", count: 460 },
  { id: 6, name: "Energy", icon: "zap", count: 210 },
  { id: 7, name: "Tourism", icon: "plane", count: 175 },
  { id: 8, name: "Manufacturing", icon: "factory", count: 195 },
];

export const steps = [
  { id: 1, title: "Create Account", description: "Sign up and join the Innovest community.", icon: "user-plus" },
  { id: 2, title: "Complete Professional Profile", description: "Build credibility with a detailed profile.", icon: "file-text" },
  { id: 3, title: "Register Startup or Investor Profile", description: "Define your role in the ecosystem.", icon: "badge-check" },
  { id: 4, title: "Platform Verification", description: "Get verified for trust and visibility.", icon: "shield-check" },
  { id: 5, title: "Connect", description: "Network with founders, investors, and mentors.", icon: "users" },
  { id: 6, title: "Investment Discussion", description: "Engage in secure, structured conversations.", icon: "message-circle" },
  { id: 7, title: "Funding", description: "Close deals with confidence and transparency.", icon: "banknote" },
  { id: 8, title: "Business Growth", description: "Scale with ongoing platform support.", icon: "trending-up" },
];

export const features = [
  { id: 1, title: "Verified Community", description: "Every member goes through a verification process for trust.", icon: "shield-check" },
  { id: 2, title: "Professional Networking", description: "Connect with founders, investors, and mentors worldwide.", icon: "network" },
  { id: 3, title: "Secure Messaging", description: "End-to-end encrypted communication for sensitive discussions.", icon: "lock" },
  { id: 4, title: "Startup Discovery", description: "Advanced search and filters to find the right opportunities.", icon: "search" },
  { id: 5, title: "AI Recommendations", description: "Personalized matches powered by machine learning.", icon: "sparkles", comingSoon: true },
  { id: 6, title: "Cloud File Management", description: "Secure document sharing for pitch decks and due diligence.", icon: "cloud" },
  { id: 7, title: "Investment Tracking", description: "Monitor funding progress and portfolio performance.", icon: "bar-chart-3" },
  { id: 8, title: "Future Government Integration", description: "Streamlined compliance and grant applications.", icon: "landmark", comingSoon: true },
];

export const testimonials = [
  {
    id: 1,
    founder: "Amara Diallo",
    company: "SolarGrid Africa",
    funding: "$2.5M Series A",
    quote: "Innovest connected us with the right investors in weeks, not months. The platform's verification gave us instant credibility.",
    avatar: "AD",
    logo: "SG",
  },
  {
    id: 2,
    founder: "David Kimani",
    company: "PaySwift",
    funding: "$800K Seed",
    quote: "The networking features and secure messaging made our fundraising process seamless and professional.",
    avatar: "DK",
    logo: "PS",
  },
  {
    id: 3,
    founder: "Priya Sharma",
    company: "HealthBridge",
    funding: "$1.5M Series A",
    quote: "We found mentors, partners, and investors all in one place. Innovest is the ecosystem we always needed.",
    avatar: "PS",
    logo: "HB",
  },
];

export const activities = [
  {
    id: 1,
    type: "New Startup",
    user: "TechFlow Labs",
    avatar: "TF",
    time: "2 hours ago",
    content: "Just joined Innovest! We're building AI-powered logistics for emerging markets.",
    likes: 24,
    comments: 8,
    shares: 3,
  },
  {
    id: 2,
    type: "Funding Announcement",
    user: "GreenEnergy Co",
    avatar: "GE",
    time: "5 hours ago",
    content: "Excited to announce our $1.2M seed round led by Horizon Ventures through Innovest!",
    likes: 156,
    comments: 42,
    shares: 28,
  },
  {
    id: 3,
    type: "Product Launch",
    user: "EduNova",
    avatar: "EN",
    time: "1 day ago",
    content: "Launching our mobile learning app across 5 African countries today.",
    likes: 89,
    comments: 15,
    shares: 12,
  },
  {
    id: 4,
    type: "Milestone",
    user: "AgriTech Solutions",
    avatar: "AT",
    time: "2 days ago",
    content: "Reached 10,000 farmers on our platform! Thank you to our Innovest community.",
    likes: 203,
    comments: 31,
    shares: 45,
  },
];

export const opportunities = [
  { id: 1, title: "Africa Innovation Challenge", type: "Startup Competition", organizer: "TechHub Africa", deadline: "Aug 15, 2026", icon: "trophy" },
  { id: 2, title: "Green Energy Grant", type: "Grants", organizer: "Climate Fund Alliance", deadline: "Sep 1, 2026", icon: "leaf" },
  { id: 3, title: "Startup Accelerator Program", type: "Accelerators", organizer: "Venture Forge", deadline: "Jul 30, 2026", icon: "rocket" },
  { id: 4, title: "FinTech Incubator Cohort", type: "Incubators", organizer: "Digital Finance Lab", deadline: "Aug 20, 2026", icon: "building-2" },
  { id: 5, title: "Global Startup Summit", type: "Events", organizer: "Innovest Events", deadline: "Oct 10, 2026", icon: "calendar" },
  { id: 6, title: "Pitch Perfect Competition", type: "Pitch Competitions", organizer: "Angel Network", deadline: "Aug 5, 2026", icon: "mic" },
];

export const partners = [
  { id: 1, name: "TechHub Africa" },
  { id: 2, name: "Venture Forge" },
  { id: 3, name: "Climate Fund" },
  { id: 4, name: "Digital Finance Lab" },
  { id: 5, name: "Horizon Ventures" },
  { id: 6, name: "Growth Capital" },
  { id: 7, name: "Innovation Council" },
  { id: 8, name: "Startup Alliance" },
];

export const heroStats = [
  { label: "Startups", value: "3.2K+" },
  { label: "Investors", value: "890+" },
  { label: "Countries", value: "42" },
];

export async function fetchStats() {
  await delay();
  return stats;
}

export async function fetchStartups() {
  await delay();
  return startups;
}

export async function fetchInvestors() {
  await delay(700);
  return investors;
}

export async function fetchCategories() {
  await delay(500);
  return categories;
}

export async function fetchTestimonials() {
  await delay(650);
  return testimonials;
}

export async function fetchActivities() {
  await delay(750);
  return activities;
}

export async function fetchOpportunities() {
  await delay(550);
  return opportunities;
}

export async function fetchPartners() {
  await delay(400);
  return partners;
}
