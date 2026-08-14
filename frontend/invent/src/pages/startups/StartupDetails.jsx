import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  MapPin, TrendingUp, Users, Bookmark, BookmarkCheck,
  Heart, HeartOff, Edit, RefreshCw, ExternalLink,
  Building2, DollarSign, MessageSquare,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupVerificationBadge from "../../components/startups/StartupVerificationBadge";
import FundingSummary from "../../components/startups/FundingSummary";
import Button from "../../components/common/Button";
import InvestmentOfferModal from "../../components/investment/InvestmentOfferModal";
import { useAuth } from "../../hooks/useAuth";
import {
  getStartupById, getStartupBySlug, getMembers, getStartupFiles,
  toggleFollow, getFollowStatus, toggleSaveStartup,
} from "../../services/startupApi";
import { getSaveStatus } from "../../services/discoveryApi";
import { getOrCreateDm } from "../../services/conversationApi";

const SECTION = "rounded-2xl border border-slate-100 bg-white p-6 shadow-sm";
const heading = "mb-4 font-semibold text-slate-800";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex border-b border-slate-50 last:border-0">
      <span className="w-1/3 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">{label}</span>
      <span className="flex-1 px-3 py-2 text-sm text-slate-800">{value}</span>
    </div>
  );
}

function TextSection({ title, content }) {
  if (!content) return null;
  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-700 mb-1">{title}</h4>
      <p className="text-sm leading-relaxed text-slate-600">{content}</p>
    </div>
  );
}

export default function StartupDetails() {
  const { id } = useParams();
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // id can be a numeric id OR a slug — detect once at component level
  const isNumericId = /^\d+$/.test(id);

  const [startup, setStartup]   = useState(null);
  const [members, setMembers]   = useState([]);
  const [files, setFiles]       = useState([]);
  const [following, setFollowing] = useState(false);
  const [saved, setSaved]         = useState(false);
  const [loading, setLoading]     = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [offerSuccess,   setOfferSuccess]   = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Use slug endpoint for slug params, numeric id endpoint for numeric params
      const s = await (isNumericId ? getStartupById(id) : getStartupBySlug(id));

      // Members and files always need the numeric DB id
      const [mems, fls] = await Promise.all([
        getMembers(s.id),
        getStartupFiles(s.id),
      ]);
      setStartup(s);
      setMembers(mems);
      // Only expose public files (no registration_certificate to non-owners)
      const isOwner = s.owner_id === user?.id;
      const publicTypes = ["logo", "pitch_deck", "demo_video"];
      setFiles(isOwner ? fls : fls.filter((f) => publicTypes.includes(f.file_type)));

      if (isAuthenticated) {
        try {
          const [fStatus, sStatus] = await Promise.all([
            getFollowStatus(s.id),
            getSaveStatus(s.id).catch(() => ({ saved: false })),
          ]);
          setFollowing(fStatus.following);
          setSaved(sStatus.saved);
        } catch { /* silent */ }
      }
    } catch {
      setStartup(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleFollow = async () => {
    if (!isAuthenticated) { navigate("/"); return; }
    if (!startup) return;
    setActionLoading("follow");
    try {
      const res = await toggleFollow(startup.id);
      setFollowing(res.following);
    } catch { /* silent */ }
    finally { setActionLoading(""); }
  };

  const handleSave = async () => {
    if (!isAuthenticated) { navigate("/"); return; }
    if (!startup) return;
    setActionLoading("save");
    try {
      const res = await toggleSaveStartup(startup.id);
      setSaved(res.saved ?? !saved);
    } catch { /* silent */ }
    finally { setActionLoading(""); }
  };

  const handleContactFounder = async () => {
    if (!isAuthenticated) { navigate("/"); return; }
    if (!startup?.owner_id) return;
    setActionLoading("contact");
    try {
      const conv = await getOrCreateDm(startup.owner_id);
      navigate(`/messages/${conv.id}`);
    } catch { /* silent */ }
    finally { setActionLoading(""); }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!startup) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center gap-4 py-20 text-center">
          <p className="text-slate-500">Startup not found or is not publicly available.</p>
          <Button variant="secondary" onClick={() => navigate(-1)}>Go Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  const isOwner = startup.owner_id === user?.id;
  const isInvestor = user?.role === "investor";
  const pitchFiles  = files.filter((f) => f.file_type === "pitch_deck");
  const videoFiles  = files.filter((f) => f.file_type === "demo_video");
  const logoFile    = files.find((f) => f.file_type === "logo");
  const initials    = startup.name?.slice(0, 2).toUpperCase();

  return (
    <DashboardLayout>
      <div className="max-w-5xl space-y-6">

        {/* Investment offer modal */}
        {showOfferModal && (
          <InvestmentOfferModal
            startup={startup}
            onClose={() => setShowOfferModal(false)}
            onSuccess={() => { setShowOfferModal(false); setOfferSuccess(true); }}
          />
        )}

        {offerSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 flex items-center justify-between">
            <span>✅ Your investment offer has been submitted. The founder has been notified.</span>
            <button onClick={() => setOfferSuccess(false)} className="text-emerald-500 hover:text-emerald-700 ml-4">✕</button>
          </div>
        )}

        {/* Hero header */}
        <div className={`${SECTION}`}>
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-light to-primary/20 text-xl font-bold text-primary overflow-hidden">
              {logoFile
                ? <img src={logoFile.cloud_url} alt={startup.name} className="h-full w-full object-cover" />
                : initials
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">{startup.name}</h1>
                <StartupVerificationBadge status={startup.verification_status} size="md" />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-slate-500">
                {startup.industry && <span className="rounded-full bg-slate-100 px-3 py-0.5 font-medium">{startup.industry}</span>}
                {startup.stage && <span className="flex items-center gap-1"><TrendingUp className="h-4 w-4" />{startup.stage}</span>}
                {startup.country && <span className="flex items-center gap-1"><MapPin className="h-4 w-4" />{startup.country}{startup.province ? `, ${startup.province}` : ""}</span>}
                {startup.category_name && <span className="flex items-center gap-1"><Building2 className="h-4 w-4" />{startup.category_name}</span>}
              </div>
              {startup.description && (
                <p className="mt-3 text-slate-600 leading-relaxed">{startup.description}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
              {isOwner && (
                <Button size="sm" variant="secondary" onClick={() => navigate(`/inventor/startups/${id}/edit`)}>
                  <Edit className="h-4 w-4" /> Edit
                </Button>
              )}
              {!isOwner && (
                <>
                  <Button size="sm" variant={following ? "primary" : "secondary"} onClick={handleFollow}
                    disabled={actionLoading === "follow"}>
                    {following ? <><HeartOff className="h-4 w-4" /> Unfollow</> : <><Heart className="h-4 w-4" /> Follow</>}
                  </Button>
                  <Button size="sm"
                    variant={saved ? "primary" : "secondary"}
                    onClick={saved ? undefined : handleSave}
                    disabled={actionLoading === "save" || saved}
                    title={saved ? "Already saved" : "Save startup"}
                    aria-label={saved ? "Already saved" : "Save startup"}
                  >
                    {saved
                      ? <><BookmarkCheck className="h-4 w-4" /> Saved</>
                      : <><Bookmark className="h-4 w-4" /> Save</>}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleContactFounder}
                    disabled={actionLoading === "contact"}>
                    <MessageSquare className="h-4 w-4" />
                    {actionLoading === "contact" ? "Opening…" : "Contact Founder"}
                  </Button>
                  {isInvestor && (
                    <Button size="sm" onClick={() => setShowOfferModal(true)}>
                      <DollarSign className="h-4 w-4" /> Make Offer
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left main */}
          <div className="lg:col-span-2 space-y-5">
            {/* About */}
            <div className={SECTION}>
              <h2 className={heading}>About</h2>
              <div className="space-y-4">
                <TextSection title="Problem" content={startup.problem} />
                <TextSection title="Solution" content={startup.solution} />
                <TextSection title="Mission" content={startup.mission} />
                <TextSection title="Vision" content={startup.vision} />
                {!startup.problem && !startup.solution && <p className="text-sm text-slate-400">No details added yet.</p>}
              </div>
            </div>

            {/* Business */}
            {(startup.business_model || startup.revenue_model) && (
              <div className={SECTION}>
                <h2 className={heading}>Business</h2>
                <div className="space-y-4">
                  <TextSection title="Business Model" content={startup.business_model} />
                  <TextSection title="Revenue Model" content={startup.revenue_model} />
                </div>
              </div>
            )}

            {/* Team */}
            <div className={SECTION}>
              <h2 className={heading}>Team</h2>
              {members.length === 0 ? (
                <p className="text-sm text-slate-400">No team members listed.</p>
              ) : (
                <div className="divide-y divide-slate-50">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 py-3 first:pt-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-light text-sm font-bold text-primary overflow-hidden">
                        {m.photo_url
                          ? <img src={m.photo_url} alt="" className="h-full w-full object-cover" />
                          : (m.name || "?").charAt(0).toUpperCase()
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{m.name}</p>
                        <p className="text-xs text-slate-500">
                          {m.position || "Member"}
                          {m.ownership_percentage > 0 && <span className="ml-1 text-primary">{m.ownership_percentage}%</span>}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Media */}
            {(pitchFiles.length > 0 || videoFiles.length > 0) && (
              <div className={SECTION}>
                <h2 className={heading}>Media & Documents</h2>
                <div className="space-y-3">
                  {pitchFiles.map((f) => (
                    <a key={f.id} href={f.cloud_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-primary hover:bg-slate-50 transition">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-500 text-xs font-bold">PDF</div>
                      <span className="flex-1 text-sm font-medium text-slate-700">{f.title || "Pitch Deck"}</span>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  ))}
                  {videoFiles.map((f) => (
                    <a key={f.id} href={f.cloud_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 hover:border-primary hover:bg-slate-50 transition">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-500 text-xs font-bold">VID</div>
                      <span className="flex-1 text-sm font-medium text-slate-700">{f.title || "Demo Video"}</span>
                      <ExternalLink className="h-4 w-4 text-slate-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <div className="space-y-5">
            <FundingSummary
              fundingRequired={startup.funding_required}
              equityOffered={startup.equity_offered}
            />

            {/* Details */}
            <div className={SECTION}>
              <h2 className={heading}>Details</h2>
              <div className="rounded-xl overflow-hidden border border-slate-100">
                <InfoRow label="Stage" value={startup.stage} />
                <InfoRow label="Industry" value={startup.industry} />
                <InfoRow label="Country" value={startup.country} />
                <InfoRow label="Registration" value={startup.registration_type?.split("_").map((w) => w.charAt(0).toUpperCase()+w.slice(1)).join(" ")} />
                <InfoRow label="Owner" value={`${startup.owner_first_name || ""} ${startup.owner_last_name || ""}`.trim() || "—"} />
              </div>
            </div>

            {/* Verification info */}
            <div className={SECTION}>
              <h2 className={heading}>Verification</h2>
              <StartupVerificationBadge status={startup.verification_status} size="md" />
              <p className="mt-2 text-xs text-slate-500">
                {startup.verification_status === "verified"
                  ? "This startup has been verified by the Innovest team."
                  : "Verification is pending or not yet submitted."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
