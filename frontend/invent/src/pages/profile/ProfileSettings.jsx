import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Save, AlertCircle, CheckCircle, User, Globe, Link2, MapPin } from "lucide-react";
import { motion } from "framer-motion";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import Button from "../../components/common/Button";
import { useAuth } from "../../hooks/useAuth";
import {
  getMyProfile,
  updateMyProfile,
  uploadProfilePhoto,
  uploadCoverPhoto,
} from "../../services/profileApi";

const INPUT = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20";
const LABEL = "mb-1 block text-sm font-medium text-slate-700";

export default function ProfileSettings() {
  const navigate      = useNavigate();
  const { user, updateUser } = useAuth();
  const photoRef      = useRef(null);
  const coverRef      = useRef(null);

  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [success,   setSuccess]   = useState("");
  const [error,     setError]     = useState("");
  const [uploading, setUploading] = useState("");

  // Form fields
  const [form, setForm] = useState({
    first_name: "", last_name: "", headline: "",
    bio: "", country: "", province: "", district: "",
    website: "", linkedin: "",
  });

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setProfile(p);
        setForm({
          first_name: p.first_name || "",
          last_name:  p.last_name  || "",
          headline:   p.headline   || "",
          bio:        p.bio        || "",
          country:    p.country    || "",
          province:   p.province   || "",
          district:   p.district   || "",
          website:    p.website    || "",
          linkedin:   p.linkedin   || "",
        });
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setLoading(false));
  }, []);

  function set(key, val) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const updated = await updateMyProfile(form);
      setProfile(updated);
      setSuccess("Profile saved successfully.");
      // Update auth context name if changed
      if (user) {
        updateUser({
          firstName: form.first_name || user.firstName,
          lastName:  form.last_name  || user.lastName,
        });
      }
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.message || "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e, type) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    setError("");
    try {
      if (type === "photo") {
        const res = await uploadProfilePhoto(file);
        const url = res?.data?.cloud_url || res?.cloud_url;
        setProfile((prev) => ({ ...prev, profile_photo: url }));
        if (user) updateUser({ profilePhoto: url });
      } else {
        const res = await uploadCoverPhoto(file);
        const url = res?.data?.cloud_url || res?.cloud_url;
        setProfile((prev) => ({ ...prev, cover_photo: url }));
      }
      setSuccess("Photo updated.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err?.message || "Upload failed.");
    } finally {
      setUploading("");
      e.target.value = "";
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const fullName = `${form.first_name} ${form.last_name}`.trim() || "Your Name";
  const initials = `${(form.first_name[0] || "").toUpperCase()}${(form.last_name[0] || "").toUpperCase()}` || "U";

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900">
            <User className="h-6 w-6 text-primary" />
            Edit Profile
          </h1>
          <p className="mt-1 text-sm text-slate-500">Keep your professional profile up to date.</p>
        </motion.div>

        {/* Cover + Photo */}
        <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
          {/* Cover */}
          <div
            className="relative h-28 bg-gradient-to-r from-primary to-emerald-400"
            style={
              profile?.cover_photo
                ? { backgroundImage: `url(${profile.cover_photo})`, backgroundSize: "cover", backgroundPosition: "center" }
                : {}
            }
          >
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={uploading === "cover"}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-black/40 px-3 py-1.5 text-xs font-medium text-white hover:bg-black/60 transition disabled:opacity-50"
            >
              {uploading === "cover"
                ? <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                : <Camera className="h-3.5 w-3.5" />}
              {uploading === "cover" ? "Uploading…" : "Change Cover"}
            </button>
            <input ref={coverRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "cover")} />
          </div>

          {/* Avatar */}
          <div className="px-6 pb-5">
            <div className="relative -mt-8 inline-block">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-primary-light to-primary/20 text-lg font-bold text-primary overflow-hidden shadow">
                {profile?.profile_photo
                  ? <img src={profile.profile_photo} alt={fullName} className="h-full w-full rounded-full object-cover" />
                  : initials}
              </div>
              <button
                type="button"
                onClick={() => photoRef.current?.click()}
                disabled={uploading === "photo"}
                className="absolute -right-1 -bottom-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-white shadow hover:bg-primary-dark transition disabled:opacity-50"
                aria-label="Change profile photo"
              >
                {uploading === "photo"
                  ? <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                  : <Camera className="h-3 w-3" />}
              </button>
              <input ref={photoRef} type="file" accept="image/*" className="hidden" onChange={(e) => handlePhotoUpload(e, "photo")} />
            </div>
            <p className="mt-2 text-sm font-medium text-slate-700">{fullName}</p>
          </div>
        </div>

        {/* Feedback */}
        {success && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <CheckCircle className="h-4 w-4 shrink-0" /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-5">
          {/* Name */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800">Basic Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={LABEL} htmlFor="first_name">First Name</label>
                <input
                  id="first_name"
                  type="text"
                  value={form.first_name}
                  onChange={(e) => set("first_name", e.target.value)}
                  className={INPUT}
                  placeholder="First name"
                  maxLength={100}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="last_name">Last Name</label>
                <input
                  id="last_name"
                  type="text"
                  value={form.last_name}
                  onChange={(e) => set("last_name", e.target.value)}
                  className={INPUT}
                  placeholder="Last name"
                  maxLength={100}
                />
              </div>
            </div>

            <div>
              <label className={LABEL} htmlFor="headline">Headline</label>
              <input
                id="headline"
                type="text"
                value={form.headline}
                onChange={(e) => set("headline", e.target.value)}
                className={INPUT}
                placeholder="e.g. Angel Investor · HealthTech Focus"
                maxLength={200}
              />
            </div>

            <div>
              <label className={LABEL} htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                value={form.bio}
                onChange={(e) => set("bio", e.target.value)}
                rows={4}
                className={`${INPUT} resize-none`}
                placeholder="Tell the community about yourself, your expertise, and what you're looking for…"
                maxLength={2000}
              />
              <p className="mt-1 text-xs text-slate-400 text-right">{form.bio.length}/2000</p>
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="flex items-center gap-2 font-semibold text-slate-800">
              <MapPin className="h-4 w-4 text-slate-400" /> Location
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className={LABEL} htmlFor="country">Country</label>
                <input
                  id="country"
                  type="text"
                  value={form.country}
                  onChange={(e) => set("country", e.target.value)}
                  className={INPUT}
                  placeholder="e.g. Rwanda"
                  maxLength={100}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="province">Province / State</label>
                <input
                  id="province"
                  type="text"
                  value={form.province}
                  onChange={(e) => set("province", e.target.value)}
                  className={INPUT}
                  placeholder="e.g. Kigali"
                  maxLength={100}
                />
              </div>
              <div>
                <label className={LABEL} htmlFor="district">District / City</label>
                <input
                  id="district"
                  type="text"
                  value={form.district}
                  onChange={(e) => set("district", e.target.value)}
                  className={INPUT}
                  placeholder="e.g. Gasabo"
                  maxLength={100}
                />
              </div>
            </div>
          </div>

          {/* Links */}
          <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm space-y-4">
            <h2 className="font-semibold text-slate-800">Links</h2>
            <div>
              <label className={LABEL} htmlFor="website">
                <Globe className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                Website
              </label>
              <input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => set("website", e.target.value)}
                className={INPUT}
                placeholder="https://yourwebsite.com"
                maxLength={255}
              />
            </div>
            <div>
              <label className={LABEL} htmlFor="linkedin">
                <Link2 className="mr-1 inline h-3.5 w-3.5 text-slate-400" />
                LinkedIn URL
              </label>
              <input
                id="linkedin"
                type="url"
                value={form.linkedin}
                onChange={(e) => set("linkedin", e.target.value)}
                className={INPUT}
                placeholder="https://linkedin.com/in/yourprofile"
                maxLength={255}
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3 pb-4">
            <Button type="button" variant="secondary" onClick={() => navigate(-1)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <span className="flex items-center gap-1.5">
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white border-t-transparent" />
                  Saving…
                </span>
              ) : (
                <><Save className="h-4 w-4" /> Save Profile</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
