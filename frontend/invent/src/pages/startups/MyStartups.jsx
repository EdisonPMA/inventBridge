import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Plus, Eye, Edit, Archive, Send, RefreshCw,
  AlertCircle, Lightbulb, MapPin, TrendingUp, ShieldCheck,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import StartupVerificationBadge from "../../components/startups/StartupVerificationBadge";
import Button from "../../components/common/Button";
import { useApi } from "../../hooks/useApi";
import { getMyStartups, archiveStartup, submitStartupForVerification } from "../../services/startupApi";

const statusColors = {
  draft:     "bg-slate-100 text-slate-600",
  submitted: "bg-blue-50 text-blue-700",
  published: "bg-emerald-50 text-emerald-700",
  archived:  "bg-red-50 text-red-600",
};

function SkeletonRow() {
  return (
    <div className="animate-pulse flex items-center gap-4 rounded-2xl border border-slate-100 bg-white p-5">
      <div className="h-12 w-12 rounded-xl bg-slate-200 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 w-1/3 rounded bg-slate-200" />
        <div className="h-3 w-1/2 rounded bg-slate-100" />
      </div>
    </div>
  );
}

export default function MyStartups() {
  const navigate = useNavigate();
  const { data: startups, loading, error, refetch } = useApi(getMyStartups, []);
  const [actionId, setActionId] = useState(null);
  const [actionError, setActionError] = useState("");

  const handleArchive = async (id) => {
    if (!window.confirm("Archive this startup? It will be hidden from investors.")) return;
    setActionId(id);
    try {
      await archiveStartup(id);
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleSubmitVerification = async (id, name) => {
    if (!window.confirm(`Submit "${name}" for verification? Make sure your profile is complete.`)) return;
    setActionId(id);
    setActionError("");
    try {
      await submitStartupForVerification(id);
      refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setActionId(null);
    }
  };

  const list = startups || [];

  return (
    <DashboardLayout>
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">My Startups</h1>
            <p className="mt-1 text-slate-500">Manage your startup profiles and verification.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={refetch} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-primary transition">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <Button size="sm" as={Link} to="/inventor/startups/new">
              <Plus className="h-4 w-4" /> Create Startup
            </Button>
          </div>
        </div>

        {/* Errors */}
        {(error || actionError) && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error || actionError}
            <button onClick={() => { setActionError(""); refetch(); }} className="ml-auto text-xs underline">Retry</button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {Array(3).fill(0).map((_, i) => <SkeletonRow key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && list.length === 0 && (
          <div className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-light">
              <Lightbulb className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-slate-800">No startups yet</p>
              <p className="mt-1 text-sm text-slate-500">Create your first startup profile to attract investors.</p>
            </div>
            <Button as={Link} to="/inventor/startups/new"><Plus className="h-4 w-4" /> Create Startup</Button>
          </div>
        )}

        {/* Startup cards */}
        {!loading && list.length > 0 && (
          <div className="space-y-4">
            {list.map((startup) => (
              <motion.div key={startup.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm hover:shadow-md transition">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                  {/* Logo */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-light to-primary/20 text-sm font-bold text-primary">
                    {startup.name?.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{startup.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusColors[startup.status] || "bg-slate-100 text-slate-600"}`}>
                        {startup.status}
                      </span>
                      <StartupVerificationBadge status={startup.verification_status} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-3 text-xs text-slate-500">
                      {startup.industry && <span className="rounded-full bg-slate-100 px-2 py-0.5">{startup.industry}</span>}
                      {startup.stage && <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" />{startup.stage}</span>}
                      {startup.country && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{startup.country}</span>}
                    </div>
                    {startup.description && (
                      <p className="mt-2 line-clamp-1 text-sm text-slate-500">{startup.description}</p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
                    {startup.status === "published" ? (
                      <Button size="sm" onClick={() => navigate(`/startups/${startup.slug || startup.id}`)}>
                        <Eye className="h-3.5 w-3.5" /> View Public
                      </Button>
                    ) : (
                      <Button size="sm" variant="secondary" onClick={() => navigate(`/startups/${startup.slug || startup.id}`)}>
                        <Eye className="h-3.5 w-3.5" /> Preview
                      </Button>
                    )}
                    <Button size="sm" variant="secondary" onClick={() => navigate(`/inventor/startups/${startup.id}/edit`)}>
                      <Edit className="h-3.5 w-3.5" /> Edit
                    </Button>
                    {(startup.status === "draft" || startup.verification_status === "rejected") && (
                      <Button size="sm" onClick={() => handleSubmitVerification(startup.id, startup.name)}
                        disabled={actionId === startup.id}>
                        <Send className="h-3.5 w-3.5" />
                        {actionId === startup.id ? "…" : "Submit"}
                      </Button>
                    )}
                    {startup.status !== "archived" && (
                      <Button size="sm" variant="ghost"
                        disabled={actionId === startup.id}
                        onClick={() => handleArchive(startup.id)}
                        className="text-red-500 hover:bg-red-50">
                        <Archive className="h-3.5 w-3.5" />
                        {actionId === startup.id ? "…" : "Archive"}
                      </Button>
                    )}
                  </div>
                </div>

                {/* Verified: live banner */}
                {startup.verification_status === "verified" && startup.status === "published" && (
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                    <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span><strong>Verified & Live</strong> — Investors can now discover and make offers on this startup.</span>
                  </div>
                )}

                {/* Rejected: clear action */}
                {startup.verification_status === "rejected" && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 space-y-1">
                    <p><span className="font-semibold">Verification rejected.</span> Fix the issues and resubmit.</p>
                    <button
                      onClick={() => navigate(`/inventor/startups/${startup.id}/verify`)}
                      className="font-medium underline hover:no-underline"
                    >
                      View rejection reason & resubmit →
                    </button>
                  </div>
                )}

                {/* Pending / submitted: status notice */}
                {(startup.status === "submitted" || startup.verification_status === "pending") && startup.verification_status !== "verified" && startup.verification_status !== "rejected" && (
                  <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
                    ⏳ Verification is under review. You'll be notified once approved.
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
