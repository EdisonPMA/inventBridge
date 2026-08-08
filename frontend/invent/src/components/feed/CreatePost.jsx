import { useState, useRef, useEffect, useCallback } from "react";
import { Image, Video, X, Send, ChevronDown, Lightbulb, TrendingUp, AtSign, Tag, Check } from "lucide-react";
import { createPost, uploadPostMedia } from "../../services/postApi";
import { getMyConnections } from "../../services/discoveryApi";
import { useAuth } from "../../hooks/useAuth";

/**
 * CreatePost — composer for new social feed posts.
 *
 * Posting rules:
 *   - Inventor:  startup_id is REQUIRED — every post must be tied to one of their startups.
 *                This ensures all founder posts are contextualised to a business.
 *   - Investor:  startup_id is OPTIONAL — they can tag a startup they invest in as context,
 *                but can also post general investment insights/updates.
 *   - Other:     startup_id is optional (no startup list shown).
 *
 * Props:
 *   onCreated  — (post) => void
 *   startups   — [{ id, name }]  inventor's own startups  (role === "inventor")
 *   investments — [{ startup_id, startup_name }]  investor's active investments (role === "investor")
 */
export default function CreatePost({ onCreated, startups = [], investments = [] }) {
  const { user } = useAuth();
  const isInventor = user?.role === "inventor";
  const isInvestor = user?.role === "investor";

  const [content,        setContent]        = useState("");
  const [mediaCaption,   setMediaCaption]   = useState("");
  const [visibility,     setVisibility]     = useState("public");
  const [startupId,      setStartupId]      = useState("");
  const [mediaFile,      setMediaFile]      = useState(null);
  const [mediaPreview,   setMediaPreview]   = useState(null);
  const [mediaType,      setMediaType]      = useState(null);
  const [uploading,      setUploading]      = useState(false);
  const [progress,       setProgress]       = useState(0);
  const [error,          setError]          = useState("");
  // @mention state
  const [mentionQuery,   setMentionQuery]   = useState("");   // text after @
  const [mentionOpen,    setMentionOpen]    = useState(false);
  const [connections,    setConnections]    = useState([]);
  const [mentionLoaded,  setMentionLoaded]  = useState(false);
  // Tag people state
  const [taggedUsers,    setTaggedUsers]    = useState([]); // [{ id, name, photo }]
  const [showTagPicker,  setShowTagPicker]  = useState(false);
  const [tagSearch,      setTagSearch]      = useState("");
  const textareaRef = useRef(null);
  const fileRef     = useRef(null);

  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "You";
  const initials = `${(user?.firstName?.[0] || "").toUpperCase()}${(user?.lastName?.[0] || "").toUpperCase()}` || "U";

  // Load connections once for @mention autocomplete
  const loadConnections = useCallback(async () => {
    if (mentionLoaded) return;
    try {
      const list = await getMyConnections("accepted");
      setConnections(list);
      setMentionLoaded(true);
    } catch { /* silent */ }
  }, [mentionLoaded]);

  // Detect @mention trigger in textarea
  function handleContentChange(e) {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart;
    const textBefore = val.slice(0, cursor);
    const match = textBefore.match(/@(\w*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setMentionOpen(true);
      loadConnections();
    } else {
      setMentionOpen(false);
      setMentionQuery("");
    }
  }

  // Filter connections by mention query
  function getPeerName(conn) {
    return conn.otherName || `${conn.first_name || ""} ${conn.last_name || ""}`.trim() || "User";
  }

  const mentionSuggestions = mentionOpen
    ? connections
        .map(c => getPeerName(c))
        .filter(name => name.toLowerCase().includes(mentionQuery.toLowerCase()))
        .slice(0, 6)
    : [];

  function insertMention(name) {
    const cursor = textareaRef.current?.selectionStart ?? content.length;
    const before = content.slice(0, cursor);
    const after  = content.slice(cursor);
    const replaced = before.replace(/@(\w*)$/, `@${name} `);
    setContent(replaced + after);
    setMentionOpen(false);
    setMentionQuery("");
    setTimeout(() => {
      textareaRef.current?.focus();
      const pos = replaced.length;
      textareaRef.current?.setSelectionRange(pos, pos);
    }, 0);
  }

  // Tag people helpers
  function getPeers() {
    return connections.map(c => ({
      id:    c.otherId    || c.user_id,
      name:  c.otherName  || `${c.first_name || ""} ${c.last_name || ""}`.trim() || "User",
      photo: c.otherPhoto || c.profile_photo || null,
    })).filter(p => p.id);
  }

  const filteredPeers = getPeers().filter(p =>
    p.name.toLowerCase().includes(tagSearch.toLowerCase())
  );

  function toggleTag(peer) {
    setTaggedUsers(prev =>
      prev.some(t => t.id === peer.id)
        ? prev.filter(t => t.id !== peer.id)
        : [...prev, peer]
    );
  }

  // For inventors: their own startups. For investors: startups they've invested in.
  const startupOptions = isInventor ? startups
    : isInvestor ? investments.map(i => ({ id: i.startup_id || i.id, name: i.startup_name || i.startup }))
    : [];

  // Inventor placeholder varies by whether a startup is selected
  const selectedStartup = startupOptions.find(s => String(s.id) === String(startupId));
  const placeholder = isInventor
    ? selectedStartup
      ? `Share an update about ${selectedStartup.name}…`
      : "Select a startup below, then share an update…"
    : isInvestor
    ? "Share an investment insight, portfolio update, or market observation…"
    : "Share an update, insight, or announcement…";

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) { setError("Only image or video files are supported."); return; }
    if (isImage && file.size > 8 * 1024 * 1024)   { setError("Image must be under 8 MB."); return; }
    if (isVideo && file.size > 200 * 1024 * 1024)  { setError("Video must be under 200 MB."); return; }
    setError("");
    setMediaFile(file);
    setMediaType(isImage ? "image" : "video");
    setMediaPreview(URL.createObjectURL(file));
  }

  function removeMedia() {
    setMediaFile(null); setMediaPreview(null); setMediaType(null);
    setMediaCaption("");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!content.trim() && !mediaFile) return;

    // Inventor must tag a startup
    if (isInventor && !startupId) {
      setError("Please select which startup this post is about.");
      return;
    }

    setUploading(true); setError("");
    try {
      // Combine main content + media caption if both provided
      const captionSuffix = mediaFile && mediaCaption.trim()
        ? `\n\n${mediaCaption.trim()}`
        : "";
      const finalContent = (content.trim() + captionSuffix) || mediaCaption.trim();

      const res     = await createPost({
        content: finalContent, startup_id: startupId || undefined,
        visibility, tagged_users: taggedUsers.map(t => t.id),
      });
      const newPost = res.post;

      if (mediaFile && newPost?.id) {
        try {
          const uploadRes = await uploadPostMedia(newPost.id, mediaFile, setProgress);
          if (mediaType === "image") newPost.image_url = uploadRes?.data?.cloud_url || uploadRes?.cloud_url;
          if (mediaType === "video") newPost.video_url = uploadRes?.data?.cloud_url || uploadRes?.cloud_url;
        } catch { /* media upload failed — post still created */ }
      }

      setContent(""); setMediaCaption(""); setStartupId(""); setVisibility("public");
      setTaggedUsers([]); setTagSearch("");
      removeMedia(); setProgress(0);
      onCreated?.(newPost);
    } catch (err) {
      setError(err?.message || "Failed to create post.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
      <form onSubmit={handleSubmit}>

        {/* ── Startup selector — prominent for inventors ── */}
        {isInventor && (
          <div className="mb-3">
            {startupOptions.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                <Lightbulb className="h-4 w-4 shrink-0" />
                You need a startup to post. <a href="/inventor/startups/new" className="underline font-medium ml-1">Create one →</a>
              </div>
            ) : (
              <div className="relative">
                <Lightbulb className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <select
                  value={startupId}
                  onChange={e => { setStartupId(e.target.value); setError(""); }}
                  className={`w-full rounded-xl border py-2 pl-8 pr-8 text-sm appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20 ${
                    startupId
                      ? "border-primary bg-primary-light/20 text-primary font-medium"
                      : "border-slate-200 bg-slate-50 text-slate-500"
                  }`}
                >
                  <option value="">Select startup this post is about… *</option>
                  {startupOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              </div>
            )}
          </div>
        )}

        {/* Composer row */}
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-blue-200 text-sm font-bold text-blue-700 overflow-hidden">
            {user?.profilePhoto
              ? <img src={user.profilePhoto} alt={fullName} className="h-full w-full rounded-full object-cover" />
              : initials}
          </div>
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={handleContentChange}
              onBlur={() => setTimeout(() => setMentionOpen(false), 150)}
              placeholder={placeholder}
              rows={3}
              maxLength={2000}
              disabled={isInventor && startupOptions.length === 0}
              className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />
            {/* @mention dropdown */}
            {mentionOpen && mentionSuggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                {mentionSuggestions.map(name => (
                  <button
                    key={name}
                    type="button"
                    onMouseDown={e => { e.preventDefault(); insertMention(name); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-blue-50 transition"
                  >
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-light text-[10px] font-bold text-primary">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{name}</span>
                    <span className="ml-auto text-xs text-slate-400">@mention</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Tagged people strip */}
        {taggedUsers.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 flex items-center gap-1"><Tag className="h-3 w-3" /> With:</span>
            {taggedUsers.map(t => (
              <span key={t.id}
                className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2 py-0.5 text-xs font-medium text-violet-700">
                {t.name}
                <button type="button" onClick={() => setTaggedUsers(prev => prev.filter(x => x.id !== t.id))}
                  className="ml-0.5 rounded-full hover:text-red-500 transition">
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Media preview + caption */}
        {mediaPreview && (
          <div className="mt-3 space-y-2">
            <div className="relative inline-block max-w-full">
              {mediaType === "image" && <img src={mediaPreview} alt="Preview" className="max-h-64 w-auto rounded-xl object-contain bg-slate-50" />}
              {mediaType === "video" && <video src={mediaPreview} className="max-h-48 rounded-xl" preload="metadata" />}
              <button type="button" onClick={removeMedia} aria-label="Remove media"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white hover:bg-red-600 transition">
                <X className="h-3 w-3" />
              </button>
            </div>
            {/* Caption / description for the media */}
            <div className="relative">
              <textarea
                value={mediaCaption}
                onChange={e => setMediaCaption(e.target.value)}
                placeholder={`Add a description for this ${mediaType === "video" ? "video" : "photo"}… (optional)`}
                rows={2}
                maxLength={500}
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700 placeholder-slate-400 focus:border-blue-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
              {mediaCaption.length > 0 && (
                <span className="absolute bottom-2 right-3 text-[10px] text-slate-400">
                  {mediaCaption.length}/500
                </span>
              )}
            </div>
            {uploading && progress > 0 && (
              <div className="h-1 w-full rounded-full bg-slate-200">
                <div className="h-1 rounded-full bg-blue-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {/* Options row */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition">
            <Image className="h-4 w-4" /> Photo
          </button>
          <button type="button" onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition">
            <Video className="h-4 w-4" /> Video
          </button>
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileChange} />

          {/* Tag people */}
          <div className="relative">
            <button type="button"
              onClick={() => { setShowTagPicker(v => !v); loadConnections(); setTagSearch(""); }}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                taggedUsers.length > 0
                  ? "bg-violet-50 text-violet-600 border border-violet-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}>
              <Tag className="h-4 w-4" />
              Tag{taggedUsers.length > 0 ? ` (${taggedUsers.length})` : ""}
            </button>

            {showTagPicker && (
              <div className="absolute left-0 bottom-full z-30 mb-1 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="border-b border-slate-100 px-3 py-2">
                  <input
                    value={tagSearch}
                    onChange={e => setTagSearch(e.target.value)}
                    placeholder="Search connections…"
                    autoFocus
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs focus:border-violet-400 focus:outline-none"
                  />
                </div>
                <div className="max-h-44 overflow-y-auto">
                  {filteredPeers.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      {connections.length === 0 ? "No connections yet" : "No results"}
                    </p>
                  ) : (
                    filteredPeers.map(peer => {
                      const isTagged = taggedUsers.some(t => t.id === peer.id);
                      return (
                        <button key={peer.id} type="button"
                          onClick={() => toggleTag(peer)}
                          className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition hover:bg-violet-50 ${isTagged ? "bg-violet-50" : ""}`}>
                          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-100 text-[10px] font-bold text-violet-700 overflow-hidden">
                            {peer.photo
                              ? <img src={peer.photo} alt={peer.name} className="h-full w-full rounded-full object-cover" />
                              : peer.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="flex-1 text-xs font-medium text-slate-800 truncate">{peer.name}</span>
                          {isTagged && <Check className="h-3.5 w-3.5 shrink-0 text-violet-600" />}
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="border-t border-slate-100 px-3 py-2">
                  <button type="button" onClick={() => setShowTagPicker(false)}
                    className="w-full rounded-lg bg-violet-600 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 transition">
                    Done{taggedUsers.length > 0 ? ` · ${taggedUsers.length} tagged` : ""}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Investor startup tag — optional, soft context */}
          {isInvestor && startupOptions.length > 0 && (
            <div className="relative">
              <TrendingUp className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
              <select value={startupId} onChange={e => setStartupId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-xs text-slate-600 focus:border-blue-400 focus:outline-none appearance-none cursor-pointer">
                <option value="">Tag an investment (optional)</option>
                {startupOptions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
            </div>
          )}

          {/* Visibility */}
          <div className="relative">
            <select value={visibility} onChange={e => setVisibility(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white py-1.5 pl-3 pr-7 text-xs text-slate-600 focus:border-blue-400 focus:outline-none appearance-none cursor-pointer">
              <option value="public">🌐 Public</option>
              <option value="connections">👥 Connections</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Submit */}
          <button type="submit"
            disabled={
              (!content.trim() && !mediaFile) ||
              uploading ||
              (isInventor && !startupId) ||
              (isInventor && startupOptions.length === 0)
            }
            className="ml-auto flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50">
            {uploading ? (
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                Posting…
              </span>
            ) : (
              <><Send className="h-3.5 w-3.5" /> Post</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
