/**
 * MessagesPage — Chat v2
 * Features: real-time messaging, typing, online presence, reactions,
 * edit/delete, pin, search, file upload, reply, read receipts,
 * contact request workflow, conversation archive/mute.
 */
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  MessageSquare, Send, RefreshCw, AlertCircle, ChevronLeft,
  Search, Users, Circle, CornerUpLeft, X, Paperclip,
  FileText, Mic, ExternalLink, Trash2, Pencil, Pin,
  Smile, Archive, BellOff, Bell, ChevronDown, Check, CheckCheck,
} from "lucide-react";
import DashboardLayout from "../../components/dashboard/DashboardLayout";
import {
  getMyConversations, getMessages, sendMessage, uploadChatFile,
  editMessage, deleteMessage, reactToMessage, pinMessage,
  archiveConversation, muteConversation, searchMessages, getPinnedMessages,
} from "../../services/conversationApi";
import { useAuth } from "../../hooks/useAuth";
import { getSocket } from "../../services/socket";

/* ── Helpers ─────────────────────────────────────── */
function timeAgo(d) {
  const s = Math.floor((Date.now() - new Date(d)) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtTime(d) {
  return new Date(d).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
function initials(n = "") {
  return n.split(" ").filter(Boolean).map(w => w[0]).join("").slice(0, 2).toUpperCase() || "?";
}
const COLORS = ["from-violet-400 to-violet-600","from-blue-400 to-blue-600",
  "from-emerald-400 to-emerald-600","from-amber-400 to-amber-600",
  "from-rose-400 to-rose-600","from-teal-400 to-teal-600"];
function colorFor(id) { return COLORS[(Number(id) || 0) % COLORS.length]; }
function sortConvs(c) {
  return [...c].sort((a, b) => {
    const ta = a.last_message_at ? new Date(a.last_message_at) : new Date(a.created_at || 0);
    const tb = b.last_message_at ? new Date(b.last_message_at) : new Date(b.created_at || 0);
    return tb - ta;
  });
}
const EMOJI_LIST = ["👍","❤️","😂","😮","😢","🔥","🎉","💯"];

/* ── Sub-components ──────────────────────────────── */
function Avatar({ name="", photo, online=false, size="md", userId }) {
  const sz = size==="sm"?"h-8 w-8 text-xs":size==="lg"?"h-12 w-12 text-base":"h-10 w-10 text-sm";
  return (
    <div className="relative shrink-0">
      <div className={`flex items-center justify-center rounded-full bg-gradient-to-br ${colorFor(userId)} font-semibold text-white overflow-hidden ${sz}`}>
        {photo ? <img src={photo} alt={name} className="h-full w-full rounded-full object-cover"/> : initials(name)}
      </div>
      {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400"/>}
    </div>
  );
}

function GroupAvatar({ participants=[], size="md" }) {
  const first = participants.slice(0,2);
  const sz = size==="sm"?"h-8 w-8":"h-10 w-10";
  return (
    <div className={`relative shrink-0 ${sz}`}>
      {first.map((p,i) => (
        <div key={p.user_id}
          className={`absolute flex items-center justify-center rounded-full bg-gradient-to-br ${colorFor(p.user_id)} text-white font-semibold overflow-hidden border-2 border-white
            ${size==="sm"?"h-6 w-6 text-[9px]":"h-7 w-7 text-xs"}
            ${i===0?"top-0 left-0":"bottom-0 right-0"}`}>
          {p.profile_photo ? <img src={p.profile_photo} alt="" className="h-full w-full object-cover"/> : initials(`${p.first_name||""} ${p.last_name||""}`)}
        </div>
      ))}
      {participants.length > 2 && (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] font-bold text-slate-600 border border-white">
          +{participants.length-2}
        </span>
      )}
    </div>
  );
}

function SharedPostBubble({ raw, isMine }) {
  let p; try { p = typeof raw==="string" ? JSON.parse(raw) : raw; } catch { return null; }
  const author = `${p.first_name||""} ${p.last_name||""}`.trim() || "User";
  const postId = p.post_id || p.id;
  const postUrl = postId ? `/feed#post-${postId}` : "/feed";
  return (
    <Link to={postUrl} className={`mt-1.5 block rounded-xl border overflow-hidden transition hover:opacity-90 ${isMine?"border-blue-400/40 bg-blue-500/20":"border-slate-200 bg-white"}`}>
      <div className={`px-3 py-2 border-b flex items-center justify-between gap-2 ${isMine?"border-blue-400/30":"border-slate-100"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${isMine?"bg-blue-400/40 text-white":"bg-slate-100 text-slate-600"}`}>
            {author.charAt(0).toUpperCase()}
          </div>
          <p className={`text-[11px] font-semibold truncate ${isMine?"text-white":"text-slate-800"}`}>{author}</p>
          {p.startup_name && <p className={`text-[10px] ${isMine?"text-blue-200":"text-blue-600"}`}>· {p.startup_name}</p>}
        </div>
        <ExternalLink className={`h-3.5 w-3.5 shrink-0 ${isMine?"text-blue-200":"text-slate-400"}`}/>
      </div>
      <div className="px-3 py-2">
        {p.image_url && <img src={p.image_url} alt="Shared" className="mb-2 w-full rounded-lg object-contain max-h-36 bg-slate-50"/>}
        {p.content && <p className={`text-xs line-clamp-3 ${isMine?"text-blue-100":"text-slate-600"}`}>{p.content}</p>}
        <p className={`mt-1.5 text-[10px] font-medium ${isMine?"text-blue-300":"text-blue-500"}`}>View post in feed →</p>
      </div>
    </Link>
  );
}

function FileBubble({ url, type, name, isMine }) {
  if (type==="image") return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-1.5 block">
      <img src={url} alt={name||"Image"} className="max-h-56 max-w-xs rounded-xl object-contain bg-slate-100 border border-slate-200 hover:opacity-90 transition"/>
    </a>
  );
  if (type==="video") return <video src={url} controls className="mt-1.5 max-h-48 max-w-xs rounded-xl border border-slate-200"/>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={`mt-1.5 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition hover:opacity-80 ${isMine?"bg-blue-500/30 text-blue-100":"bg-slate-100 text-slate-700 border border-slate-200"}`}>
      {type==="audio"?<Mic className="h-4 w-4"/>:<FileText className="h-4 w-4"/>}
      <span className="truncate max-w-[160px]">{name || (type==="audio"?"Voice message":"Attachment")}</span>
      <ExternalLink className="h-3 w-3 ml-auto shrink-0"/>
    </a>
  );
}

function ReactionBar({ reactions=[], onReact, isMine }) {
  if (!reactions.length) return null;
  return (
    <div className={`flex flex-wrap gap-1 mt-1 ${isMine?"justify-end":""}`}>
      {reactions.map(r => (
        <button key={r.emoji} onClick={() => onReact(r.emoji)}
          title={`${r.count} reaction${r.count!==1?"s":""}`}
          className="flex items-center gap-0.5 rounded-full border border-slate-200 bg-white px-1.5 py-0.5 text-xs hover:bg-slate-50 transition shadow-sm">
          <span>{r.emoji}</span>
          {r.count > 1 && <span className="text-slate-500">{r.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Main component
   ══════════════════════════════════════════════════ */
export default function MessagesPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  /* refs */
  const bottomRef     = useRef(null);
  const inputRef      = useRef(null);
  const fileRef       = useRef(null);
  const activeRef     = useRef(null);
  const typingTimer   = useRef(null);
  const markReadTimer = useRef(null);
  const msgsEndRef    = useRef(null);

  /* conversations */
  const [conversations,  setConversations]  = useState([]);
  const [convsLoading,   setConvsLoading]   = useState(true);
  const [convSearch,     setConvSearch]     = useState("");

  /* active chat */
  const [activeConv,    setActiveConv]    = useState(null);
  const [messages,      setMessages]      = useState([]);
  const [msgsLoading,   setMsgsLoading]   = useState(false);
  const [total,         setTotal]         = useState(0);
  const [loadingMore,   setLoadingMore]   = useState(false);

  /* input */
  const [text,       setText]       = useState("");
  const [replyTo,    setReplyTo]    = useState(null);
  const [editingMsg, setEditingMsg] = useState(null); // { id, message }
  const [pendingFile,setPendingFile]= useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [sending,    setSending]    = useState(false);

  /* search */
  const [showSearch,   setShowSearch]   = useState(false);
  const [searchQ,      setSearchQ]      = useState("");
  const [searchResults,setSearchResults]= useState(null);
  const [searching,    setSearching]    = useState(false);

  /* reactions picker */
  const [reactionPicker, setReactionPicker] = useState(null); // msgId

  /* presence */
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Set());

  /* misc */
  const [error, setError] = useState("");

  useEffect(() => { activeRef.current = activeConv; }, [activeConv]);

  /* ── Load conversations ─────────────────────────── */
  useEffect(() => {
    setConvsLoading(true);
    getMyConversations()
      .then(d => setConversations(sortConvs(d)))
      .catch(() => {})
      .finally(() => setConvsLoading(false));
  }, []);

  /* ── Auto-open from URL ─────────────────────────── */
  useEffect(() => {
    if (!conversationId || !conversations.length) return;
    const found = conversations.find(c => String(c.id) === String(conversationId));
    if (found && activeRef.current?.id !== found.id) openConversation(found);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, conversations]);

  /* ── Auto-scroll ────────────────────────────────── */
  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, typingUsers.size, loadingMore]);

  /* ── Socket setup ───────────────────────────────── */
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onOnline  = ({ userId }) => setOnlineUsers(p => new Set([...p, userId]));
    const onOffline = ({ userId }) => setOnlineUsers(p => { const n=new Set(p); n.delete(userId); return n; });

    const onMessage = (msg) => {
      const cur = activeRef.current;
      if (cur && String(msg.conversation_id) === String(cur.id)) {
        setMessages(prev => {
          const clean = prev.filter(m => !m.optimistic);
          if (clean.some(m => m.id === msg.id)) return prev;
          return [...clean, msg];
        });
        setTypingUsers(p => { const n=new Set(p); n.delete(msg.sender_id); return n; });
        if (!markReadTimer.current) {
          markReadTimer.current = setTimeout(() => {
            socket.emit("message_read", { conversationId: cur.id });
            markReadTimer.current = null;
          }, 500);
        }
      }
      const preview = msg.attachment_type === "shared_post" ? "📎 Shared a post"
        : msg.message || (msg.attachment_url ? "📎 Attachment" : "");
      setConversations(prev => sortConvs(prev.map(c =>
        String(c.id) === String(msg.conversation_id)
          ? { ...c, last_message: preview, last_message_at: msg.created_at }
          : c
      )));
    };

    const onEdited = ({ message: msg }) => {
      const cur = activeRef.current;
      if (cur && String(msg.conversation_id) === String(cur.id)) {
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }
    };

    const onDeleted = ({ messageId, message: msg }) => {
      const cur = activeRef.current;
      if (cur) {
        setMessages(prev => prev.map(m => m.id === (messageId || msg?.id) ? { ...m, is_deleted: true, message: null, attachment_url: null } : m));
      }
    };

    const onReaction = ({ messageId, userId: uid, emoji, action }) => {
      const cur = activeRef.current;
      if (cur) {
        setMessages(prev => prev.map(m => {
          if (m.id !== messageId) return m;
          const reactions = [...(m.reactions || [])];
          const idx = reactions.findIndex(r => r.emoji === emoji);
          if (action === "added") {
            if (idx >= 0) {
              reactions[idx] = { ...reactions[idx], count: reactions[idx].count + 1, user_ids: [...reactions[idx].user_ids, uid] };
            } else {
              reactions.push({ emoji, count: 1, user_ids: [uid] });
            }
          } else {
            if (idx >= 0) {
              const count = reactions[idx].count - 1;
              if (count <= 0) reactions.splice(idx, 1);
              else reactions[idx] = { ...reactions[idx], count, user_ids: reactions[idx].user_ids.filter(id => id !== uid) };
            }
          }
          return { ...m, reactions };
        }));
      }
    };

    const onPinned = ({ message: msg }) => {
      const cur = activeRef.current;
      if (cur && String(msg.conversation_id) === String(cur.id)) {
        setMessages(prev => prev.map(m => m.id === msg.id ? msg : m));
      }
    };

    const onReadUpdate = ({ conversationId: cid, readBy }) => {
      const cur = activeRef.current;
      if (cur && String(cid) === String(cur.id) && readBy !== user?.id) {
        setMessages(prev => prev.map(m =>
          m.sender_id === user?.id && !m.optimistic ? { ...m, seen_by: readBy } : m
        ));
      }
    };

    const onTypingStart = ({ userId: tid, conversationId: cid }) => {
      if (activeRef.current && String(cid) === String(activeRef.current.id) && tid !== user?.id)
        setTypingUsers(p => new Set([...p, tid]));
    };
    const onTypingStop = ({ userId: tid, conversationId: cid }) => {
      if (activeRef.current && String(cid) === String(activeRef.current.id) && tid !== user?.id)
        setTypingUsers(p => { const n=new Set(p); n.delete(tid); return n; });
    };
    const onConvCreated = (conv) => {
      setConversations(prev => prev.some(c => c.id === conv.id) ? prev : sortConvs([conv, ...prev]));
    };

    socket.on("user_online",          onOnline);
    socket.on("user_offline",         onOffline);
    socket.on("new_message",          onMessage);
    socket.on("message_edited",       onEdited);
    socket.on("message_deleted",      onDeleted);
    socket.on("message_reaction",     onReaction);
    socket.on("message_pinned",       onPinned);
    socket.on("message_read_update",  onReadUpdate);
    socket.on("typing_start",         onTypingStart);
    socket.on("typing_stop",          onTypingStop);
    socket.on("conversation_created", onConvCreated);

    return () => {
      socket.off("user_online",onOnline);socket.off("user_offline",onOffline);
      socket.off("new_message",onMessage);socket.off("message_edited",onEdited);
      socket.off("message_deleted",onDeleted);socket.off("message_reaction",onReaction);
      socket.off("message_pinned",onPinned);socket.off("message_read_update",onReadUpdate);
      socket.off("typing_start",onTypingStart);socket.off("typing_stop",onTypingStop);
      socket.off("conversation_created",onConvCreated);
    };
  }, [user?.id]);

  /* ── Open conversation ──────────────────────────── */
  const openConversation = useCallback(async (conv) => {
    const prev = activeRef.current;
    const socket = getSocket();
    if (socket && prev && prev.id !== conv.id) socket.emit("leave_conversation", { conversationId: prev.id });
    setActiveConv(conv); setMsgsLoading(true); setError("");
    setTypingUsers(new Set()); setText(""); setReplyTo(null);
    setPendingFile(null); setEditingMsg(null); setSearchResults(null);
    setShowSearch(false); setSearchQ(""); setTotal(0);
    if (socket) {
      socket.emit("join_conversation", { conversationId: conv.id });
      socket.emit("message_read", { conversationId: conv.id });
    }
    try {
      const res = await getMessages(conv.id, { limit: 50, offset: 0 });
      const rows = Array.isArray(res) ? res : (res.rows ?? []);
      setMessages(rows); setTotal(res?.total ?? rows.length);
      setConversations(p => p.map(c => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    } catch { setError("Failed to load messages."); }
    finally { setMsgsLoading(false); }
  }, []);

  /* ── Load more (infinite scroll) ───────────────── */
  async function loadMoreMessages() {
    if (!activeConv || loadingMore || messages.length >= total) return;
    setLoadingMore(true);
    try {
      const res = await getMessages(activeConv.id, { limit: 50, offset: messages.length });
      const rows = Array.isArray(res) ? res : (res.rows ?? []);
      setMessages(prev => [...rows, ...prev]);
      setTotal(res?.total ?? total);
    } catch { /* silent */ }
    finally { setLoadingMore(false); }
  }

  /* ── File pick ──────────────────────────────────── */
  async function handleFilePick(e) {
    const file = e.target.files?.[0];
    if (!file || !activeConv) return;
    e.target.value = "";
    if (file.size > 15 * 1024 * 1024) { setError("Max file size is 15 MB."); return; }
    setUploading(true);
    try {
      const res = await uploadChatFile(file);
      setPendingFile({ url: res.url, type: res.type, name: file.name, mime_type: res.mime_type, file_size: file.size, public_id: res.public_id });
    } catch { setError("Upload failed."); }
    finally { setUploading(false); }
  }

  /* ── Send / edit submit ─────────────────────────── */
  async function handleSend(e) {
    e.preventDefault();
    if (editingMsg) { await handleEditSubmit(); return; }
    const hasText = text.trim().length > 0;
    const hasFile = !!pendingFile;
    if ((!hasText && !hasFile) || sending || !activeConv) return;

    const msgText = text.trim();
    const snap    = { replyTo, pendingFile };
    setText(""); setReplyTo(null); setPendingFile(null);
    const socket = getSocket();
    if (socket) socket.emit("typing_stop", { conversationId: activeConv.id });
    setSending(true);

    const optimistic = {
      id: `opt-${Date.now()}`, sender_id: user.id, message: msgText || null,
      attachment_url: snap.pendingFile?.url || null, attachment_type: snap.pendingFile?.type || null,
      file_name: snap.pendingFile?.name || null,
      created_at: new Date().toISOString(), conversation_id: activeConv.id,
      optimistic: true, reactions: [],
      reply: snap.replyTo ? { id: snap.replyTo.id, message: snap.replyTo.message, sender_id: snap.replyTo.sender_id, first_name: snap.replyTo.first_name, last_name: snap.replyTo.last_name } : null,
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      if (socket?.connected) {
        socket.emit("send_message", {
          conversationId: activeConv.id, message: msgText || null,
          attachment_url: snap.pendingFile?.url || null, attachment_type: snap.pendingFile?.type || null,
          mime_type: snap.pendingFile?.mime_type || null, file_size: snap.pendingFile?.file_size || null,
          file_name: snap.pendingFile?.name || null, public_id: snap.pendingFile?.public_id || null,
          reply_to_id: snap.replyTo?.id || null,
        }, ack => {
          setMessages(prev => prev.filter(m => m.id !== optimistic.id));
          if (ack?.error) { setError(ack.error); setText(msgText); setReplyTo(snap.replyTo); setPendingFile(snap.pendingFile); }
        });
      } else {
        const saved = await sendMessage(activeConv.id, {
          message: msgText || null, attachment_url: snap.pendingFile?.url,
          attachment_type: snap.pendingFile?.type, reply_to_id: snap.replyTo?.id,
        });
        setMessages(prev => [...prev.filter(m => m.id !== optimistic.id), saved]);
      }
      const preview = msgText || (snap.pendingFile?.type === "shared_post" ? "📎 Shared a post" : snap.pendingFile ? "📎 Attachment" : "");
      setConversations(prev => sortConvs(prev.map(c => c.id === activeConv.id ? { ...c, last_message: preview, last_message_at: new Date().toISOString() } : c)));
    } catch { setMessages(prev => prev.filter(m => m.id !== optimistic.id)); setError("Failed to send."); setText(msgText); }
    finally { setSending(false); inputRef.current?.focus(); }
  }

  /* ── Edit submit ────────────────────────────────── */
  async function handleEditSubmit() {
    if (!text.trim() || !editingMsg) return;
    try {
      const updated = await editMessage(activeConv.id, editingMsg.id, text.trim());
      setMessages(prev => prev.map(m => m.id === editingMsg.id ? updated : m));
      getSocket()?.emit("edit_message", { conversationId: activeConv.id, messageId: editingMsg.id, content: text.trim() });
    } catch { setError("Failed to edit."); }
    finally { setEditingMsg(null); setText(""); inputRef.current?.focus(); }
  }

  /* ── Typing ─────────────────────────────────────── */
  function handleTextChange(e) {
    setText(e.target.value);
    const socket = getSocket();
    if (!socket || !activeConv) return;
    socket.emit("typing_start", { conversationId: activeConv.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit("typing_stop", { conversationId: activeConv.id }), 2000);
  }

  /* ── Delete message ─────────────────────────────── */
  async function handleDeleteMsg(msgId) {
    try {
      await deleteMessage(activeConv.id, msgId);
      getSocket()?.emit("delete_message", { conversationId: activeConv.id, messageId: msgId });
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_deleted: true, message: null, attachment_url: null } : m));
    } catch { setError("Failed to delete."); }
  }

  /* ── React ──────────────────────────────────────── */
  async function handleReact(msgId, emoji) {
    setReactionPicker(null);
    try {
      getSocket()?.emit("react_message", { conversationId: activeConv.id, messageId: msgId, emoji });
      await reactToMessage(activeConv.id, msgId, emoji);
    } catch { /* silent */ }
  }

  /* ── Pin ────────────────────────────────────────── */
  async function handlePin(msgId) {
    try {
      getSocket()?.emit("pin_message", { conversationId: activeConv.id, messageId: msgId });
      await pinMessage(activeConv.id, msgId);
    } catch { /* silent */ }
  }

  /* ── Search messages ────────────────────────────── */
  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQ.trim() || !activeConv) return;
    setSearching(true);
    try {
      const results = await searchMessages(activeConv.id, searchQ.trim());
      setSearchResults(results);
    } catch { /* silent */ }
    finally { setSearching(false); }
  }

  /* ── Derived ────────────────────────────────────── */
  const isGroup   = conv => conv?.type === "group" || ["team","org","investment_negotiation"].includes(conv?.conv_type);
  const convOther = conv => (conv?.participants||[]).find(p => p.user_id !== user?.id);
  const isOnline  = conv => { if (!conv||isGroup(conv)) return false; const o=convOther(conv); return o ? onlineUsers.has(o.user_id) : false; };

  function convName(conv) {
    if (!conv) return "";
    if (conv.title) return conv.title;
    if (conv.startup_name) return conv.startup_name;
    if (!isGroup(conv)) {
      const o = convOther(conv);
      if (o) return `${o.first_name||""} ${o.last_name||""}`.trim() || "Direct Message";
    }
    return "Group Chat";
  }
  function senderName(msg) { return `${msg.first_name||""} ${msg.last_name||""}`.trim() || "User"; }
  function typingLabel() {
    if (!activeConv) return "";
    const names = [...typingUsers].map(uid => {
      const p = (activeConv.participants||[]).find(x => x.user_id===uid);
      return p?.first_name || "Someone";
    });
    if (!names.length) return "";
    if (names.length===1) return `${names[0]} is typing…`;
    if (names.length===2) return `${names[0]} and ${names[1]} are typing…`;
    return "Several people are typing…";
  }

  const filtered   = useMemo(() => conversations.filter(c => convName(c).toLowerCase().includes(convSearch.toLowerCase())), [conversations, convSearch]);
  const typingText = typingLabel();
  const displayMessages = searchResults ?? messages;

  /* ══════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════ */
  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* ── Sidebar ───────────────────────────────── */}
        <aside className={`flex flex-col border-r border-slate-100 bg-slate-50 w-full md:w-72 lg:w-80 shrink-0 ${activeConv?"hidden md:flex":"flex"}`}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 bg-white">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2 text-sm">
              <MessageSquare className="h-4 w-4 text-blue-500"/> Messages
            </h2>
            {conversations.some(c=>(c.unread_count||0)>0) && (
              <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-bold text-white">
                {conversations.reduce((s,c)=>s+(c.unread_count||0),0)}
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="px-3 pt-3 pb-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"/>
              <input type="search" value={convSearch} onChange={e=>setConvSearch(e.target.value)}
                placeholder="Search conversations…"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-8 pr-3 text-sm placeholder-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition"/>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
            {convsLoading && Array(3).fill(0).map((_,i)=>(
              <div key={i} className="flex gap-3 p-3 rounded-xl">
                <div className="h-10 w-10 rounded-full animate-pulse bg-slate-200 shrink-0"/>
                <div className="flex-1 space-y-2 pt-1">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200"/>
                  <div className="h-2.5 w-3/4 animate-pulse rounded bg-slate-200"/>
                </div>
              </div>
            ))}
            {!convsLoading && filtered.length===0 && (
              <div className="flex flex-col items-center gap-2 py-16 text-slate-400">
                <MessageSquare className="h-8 w-8 opacity-25"/>
                <p className="text-sm">No conversations yet.</p>
              </div>
            )}
            {filtered.map(conv=>{
              const name   = convName(conv);
              const other  = convOther(conv);
              const online = isOnline(conv);
              const active = activeConv?.id===conv.id;
              const unread = conv.unread_count||0;
              const group  = isGroup(conv);
              const convTypeBadge = conv.conv_type==="investment_negotiation" ? "💼" : conv.conv_type==="team" ? "👥" : null;
              return (
                <button key={conv.id}
                  onClick={()=>{ navigate(`/messages/${conv.id}`); openConversation(conv); }}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${active?"bg-blue-600 text-white shadow-sm":"text-slate-700 hover:bg-white hover:shadow-sm"}`}>
                  {group
                    ? <GroupAvatar participants={conv.participants||[]}/>
                    : <Avatar name={name} photo={other?.profile_photo} online={online} userId={other?.user_id}/>}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`truncate text-sm font-medium flex items-center gap-1 ${active?"text-white":"text-slate-800"}`}>
                        {convTypeBadge && <span>{convTypeBadge}</span>}{name}
                      </p>
                      {conv.last_message_at && (
                        <span className={`text-[10px] shrink-0 ${active?"text-blue-200":"text-slate-400"}`}>{timeAgo(conv.last_message_at)}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {group && <Users className={`h-3 w-3 shrink-0 ${active?"text-blue-200":"text-slate-400"}`}/>}
                      <p className={`truncate text-xs ${active?"text-blue-200":"text-slate-400"}`}>
                        {conv.last_message || (group?`${(conv.participants||[]).length} members`:"No messages yet")}
                      </p>
                      {unread>0 && !active && (
                        <span className="ml-auto shrink-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white">
                          {unread>9?"9+":unread}
                        </span>
                      )}
                      {conv.user_muted===1 && <BellOff className={`h-3 w-3 shrink-0 ml-auto ${active?"text-blue-200":"text-slate-300"}`}/>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* ── Chat panel ───────────────────────────── */}
        <div className={`flex flex-1 flex-col min-w-0 ${activeConv?"flex":"hidden md:flex"}`}>
          {!activeConv ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400 bg-slate-50">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
                <MessageSquare className="h-8 w-8 text-slate-300"/>
              </div>
              <p className="font-medium text-slate-500">Select a conversation</p>
              <p className="text-xs text-slate-400">Choose from the list to start messaging.</p>
            </div>
          ) : (
            <>
              {/* ── Chat header ─────────────────────── */}
              <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 shadow-sm">
                <button onClick={()=>{ setActiveConv(null); navigate("/messages"); }}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition md:hidden">
                  <ChevronLeft className="h-5 w-5"/>
                </button>
                {isGroup(activeConv)
                  ? <GroupAvatar participants={activeConv.participants||[]} size="sm"/>
                  : <Avatar name={convName(activeConv)} photo={convOther(activeConv)?.profile_photo}
                      online={isOnline(activeConv)} userId={convOther(activeConv)?.user_id} size="sm"/>}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800 truncate">{convName(activeConv)}</p>
                  <p className="text-xs">
                    {isGroup(activeConv)
                      ? <span className="flex items-center gap-1 text-slate-400"><Users className="h-3 w-3"/>{(activeConv.participants||[]).length} members</span>
                      : isOnline(activeConv)
                      ? <span className="flex items-center gap-1 text-emerald-500 font-medium"><Circle className="h-2 w-2 fill-emerald-500"/>Online</span>
                      : <span className="text-slate-400">Offline</span>}
                  </p>
                </div>
                {/* Header actions */}
                <div className="flex items-center gap-1">
                  <button onClick={()=>setShowSearch(v=>!v)} title="Search messages"
                    className={`rounded-lg p-1.5 transition ${showSearch?"bg-blue-50 text-blue-600":"text-slate-400 hover:bg-slate-100"}`}>
                    <Search className="h-4 w-4"/>
                  </button>
                  <button onClick={()=>archiveConversation(activeConv.id).then(()=>{ setConversations(p=>p.filter(c=>c.id!==activeConv.id)); setActiveConv(null); navigate("/messages"); })}
                    title="Archive conversation"
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
                    <Archive className="h-4 w-4"/>
                  </button>
                  <button onClick={()=>muteConversation(activeConv.id, !activeConv.user_muted).then(()=>setConversations(p=>p.map(c=>c.id===activeConv.id?{...c,user_muted:!c.user_muted}:c)))}
                    title={activeConv.user_muted?"Unmute":"Mute"}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 transition">
                    {activeConv.user_muted?<Bell className="h-4 w-4"/>:<BellOff className="h-4 w-4"/>}
                  </button>
                </div>
              </div>

              {/* ── Search bar (collapsible) ─────────── */}
              <AnimatePresence>
                {showSearch && (
                  <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}}
                    className="overflow-hidden border-b border-slate-100 bg-slate-50">
                    <form onSubmit={handleSearch} className="flex items-center gap-2 px-4 py-2.5">
                      <Search className="h-3.5 w-3.5 text-slate-400 shrink-0"/>
                      <input value={searchQ} onChange={e=>setSearchQ(e.target.value)}
                        placeholder="Search messages…"
                        className="flex-1 bg-transparent text-sm placeholder-slate-400 focus:outline-none"/>
                      {searchQ && (
                        <button type="button" onClick={()=>{setSearchQ("");setSearchResults(null);}}
                          className="text-slate-400 hover:text-slate-600">
                          <X className="h-3.5 w-3.5"/>
                        </button>
                      )}
                      {searching && <RefreshCw className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0"/>}
                    </form>
                    {searchResults !== null && (
                      <p className="px-4 pb-2 text-xs text-slate-400">
                        {searchResults.length} result{searchResults.length!==1?"s":""} for "{searchQ}"
                        {searchResults.length > 0 && (
                          <button onClick={()=>setSearchResults(null)} className="ml-2 text-blue-500 hover:underline">Clear</button>
                        )}
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ══════════════════════════════════════
                  Messages area — redesigned
                  ══════════════════════════════════════ */}
              <div
                className="flex-1 overflow-y-auto bg-white px-0 py-2"
                onClick={() => setReactionPicker(null)}
                style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #f1f5f9 1px, transparent 0)", backgroundSize: "24px 24px" }}
              >
                <div className="mx-auto max-w-2xl px-4 py-2 space-y-0">

                  {/* Load older */}
                  {messages.length < total && !msgsLoading && (
                    <div className="flex justify-center py-3">
                      <button onClick={loadMoreMessages} disabled={loadingMore}
                        className="flex items-center gap-1.5 rounded-full bg-white border border-slate-200 px-4 py-1.5 text-xs text-slate-500 hover:bg-slate-50 shadow-sm disabled:opacity-50 transition">
                        {loadingMore ? <RefreshCw className="h-3 w-3 animate-spin" /> : <ChevronDown className="h-3 w-3" />}
                        Load earlier messages
                      </button>
                    </div>
                  )}

                  {msgsLoading && (
                    <div className="flex justify-center py-16">
                      <div className="flex flex-col items-center gap-3">
                        <RefreshCw className="h-6 w-6 animate-spin text-slate-300" />
                        <p className="text-xs text-slate-400">Loading messages…</p>
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 mb-3">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{error}
                      <button onClick={() => setError("")} className="ml-auto"><X className="h-3 w-3" /></button>
                    </div>
                  )}

                  {!msgsLoading && displayMessages.length === 0 && (
                    <div className="flex flex-col items-center gap-4 py-20">
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                        <MessageSquare className="h-8 w-8 text-slate-300" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-500">
                          {searchResults !== null ? `No results for "${searchQ}"` : "No messages yet"}
                        </p>
                        {searchResults === null && <p className="mt-1 text-xs text-slate-400">Say hello and start the conversation!</p>}
                      </div>
                    </div>
                  )}

                  {/* Message list */}
                  <AnimatePresence initial={false}>
                    {displayMessages.map((msg, idx) => {
                      const isMine      = msg.sender_id === user?.id;
                      const prevMsg     = displayMessages[idx - 1];
                      const nextMsg     = displayMessages[idx + 1];
                      const samePrev    = prevMsg?.sender_id === msg.sender_id && !prevMsg?.is_deleted;
                      const sameNext    = nextMsg?.sender_id === msg.sender_id && !nextMsg?.is_deleted;
                      const showAvatar  = !isMine && !samePrev;
                      const showName    = isGroup(activeConv) && !isMine && !samePrev;
                      const isDeleted   = !!msg.is_deleted || !!msg.deleted_at;
                      const isEdited    = !!msg.edited_at;

                      // Date separator
                      const msgDate  = new Date(msg.created_at).toDateString();
                      const prevDate = prevMsg ? new Date(prevMsg.created_at).toDateString() : null;
                      const showDate = msgDate !== prevDate;

                      // Bubble shape: round all corners; flatten adjacent sides for grouped messages
                      const mineShape = isMine
                        ? `rounded-2xl ${samePrev ? "rounded-tr-md" : ""} ${sameNext ? "rounded-br-md" : ""}`
                        : `rounded-2xl ${samePrev ? "rounded-tl-md" : ""} ${sameNext ? "rounded-bl-md" : ""}`;

                      const gap = samePrev ? "mt-0.5" : "mt-4";

                      return (
                        <div key={msg.id}>
                          {/* Date separator */}
                          {showDate && (
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 h-px bg-slate-200" />
                              <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-medium text-slate-400">
                                {new Date(msg.created_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                              </span>
                              <div className="flex-1 h-px bg-slate-200" />
                            </div>
                          )}

                          <motion.div
                            initial={{ opacity: 0, y: 8, scale: 0.97 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.14, ease: "easeOut" }}
                            className={`group relative flex items-end gap-2.5 ${isMine ? "flex-row-reverse" : "flex-row"} ${gap}`}
                          >
                            {/* Avatar column — always reserved for alignment */}
                            <div className="w-8 shrink-0 flex items-end">
                              {showAvatar && !isMine ? (
                                <Avatar name={senderName(msg)} photo={msg.profile_photo} userId={msg.sender_id} size="sm" />
                              ) : null}
                            </div>

                            {/* Bubble + meta */}
                            <div className={`flex flex-col max-w-[68%] min-w-0 ${isMine ? "items-end" : "items-start"}`}>

                              {/* Sender name (groups only) */}
                              {showName && (
                                <p className="mb-1 px-1 text-[11px] font-semibold text-slate-500">
                                  {senderName(msg)}
                                  {msg.sender_role && (
                                    <span className="ml-1 font-normal text-slate-400 capitalize">· {msg.sender_role}</span>
                                  )}
                                </p>
                              )}

                              {/* Reply quote */}
                              {msg.reply && (
                                <div className={`mb-1.5 flex w-full items-stretch gap-0 overflow-hidden rounded-xl border text-xs ${
                                  isMine
                                    ? "border-blue-300/50 bg-blue-500/10"
                                    : "border-slate-200 bg-slate-50"
                                }`}>
                                  <div className={`w-1 shrink-0 rounded-l-xl ${isMine ? "bg-blue-300" : "bg-slate-300"}`} />
                                  <div className="min-w-0 flex-1 px-2.5 py-2">
                                    <p className={`mb-0.5 font-semibold ${isMine ? "text-blue-200" : "text-slate-600"}`}>
                                      {msg.reply.sender_id === user?.id ? "You" : `${msg.reply.first_name || ""} ${msg.reply.last_name || ""}`.trim() || "User"}
                                    </p>
                                    <p className={`line-clamp-1 ${isMine ? "text-blue-200/80" : "text-slate-500"}`}>
                                      {msg.reply.is_deleted ? "Message deleted" : msg.reply.message || "📎 Attachment"}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Main bubble */}
                              <div
                                className={`relative w-full ${mineShape} px-3.5 py-2.5 text-sm leading-relaxed shadow-sm ${
                                  isDeleted
                                    ? "border border-dashed border-slate-200 bg-white"
                                    : isMine
                                    ? "bg-blue-600 text-white"
                                    : "bg-white text-slate-800 border border-slate-100"
                                } ${msg.optimistic ? "opacity-60" : ""}`}
                              >
                                {isDeleted ? (
                                  <p className="flex items-center gap-1.5 text-xs italic text-slate-400">
                                    <Trash2 className="h-3 w-3" /> Message deleted
                                  </p>
                                ) : (
                                  <>
                                    {msg.message && (
                                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                                    )}
                                    {msg.attachment_type === "shared_post" && msg.attachment_url && (
                                      <SharedPostBubble raw={msg.attachment_url} isMine={isMine} />
                                    )}
                                    {msg.attachment_url && msg.attachment_type !== "shared_post" && (
                                      <FileBubble url={msg.attachment_url} type={msg.attachment_type} name={msg.file_name} isMine={isMine} />
                                    )}

                                    {/* Timestamp row inside bubble */}
                                    <div className={`mt-1 flex items-center justify-end gap-1.5 ${isMine ? "text-blue-200/70" : "text-slate-400"}`}>
                                      {msg.is_pinned && <Pin className="h-2.5 w-2.5" />}
                                      {isEdited && <span className="text-[9px] italic">edited</span>}
                                      <span className="text-[10px] tabular-nums">{fmtTime(msg.created_at)}</span>
                                      {isMine && !msg.optimistic && (
                                        msg.seen_by
                                          ? <CheckCheck className="h-3 w-3 text-emerald-300" />
                                          : msg.is_read
                                          ? <CheckCheck className="h-3 w-3" />
                                          : <Check className="h-3 w-3 opacity-60" />
                                      )}
                                      {msg.optimistic && (
                                        <span className="h-2.5 w-2.5 animate-spin rounded-full border border-white/40 border-t-transparent" />
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>

                              {/* Reactions row */}
                              {!isDeleted && (msg.reactions || []).length > 0 && (
                                <div className={`mt-1 flex flex-wrap gap-1 ${isMine ? "justify-end" : "justify-start"}`}>
                                  {(msg.reactions || []).map(r => (
                                    <button key={r.emoji} onClick={() => handleReact(msg.id, r.emoji)}
                                      title={`${r.count} reaction${r.count !== 1 ? "s" : ""}`}
                                      className={`flex items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-xs transition shadow-sm hover:scale-105 active:scale-95 ${
                                        (r.user_ids || []).includes(user?.id)
                                          ? "border-blue-200 bg-blue-50 text-blue-700"
                                          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                                      }`}>
                                      <span className="leading-none">{r.emoji}</span>
                                      {r.count > 1 && <span className="font-medium tabular-nums">{r.count}</span>}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Floating action toolbar — appears on hover */}
                            {!isDeleted && !msg.optimistic && (
                              <div className={`absolute top-0 flex items-center gap-0.5 rounded-xl border border-slate-200 bg-white shadow-md px-1 py-1
                                opacity-0 group-hover:opacity-100 transition-all duration-150 z-10
                                ${isMine ? "left-0 -translate-x-1/4" : "right-0 translate-x-1/4"}`}
                                onClick={e => e.stopPropagation()}>

                                {/* Emoji picker trigger */}
                                <div className="relative">
                                  <button
                                    onClick={e => { e.stopPropagation(); setReactionPicker(p => p === msg.id ? null : msg.id); }}
                                    title="React"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-amber-500 transition">
                                    <Smile className="h-3.5 w-3.5" />
                                  </button>
                                  {reactionPicker === msg.id && (
                                    <div
                                      className={`absolute bottom-full mb-2 z-20 flex gap-1 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl
                                        ${isMine ? "right-0" : "left-0"}`}
                                      onClick={e => e.stopPropagation()}>
                                      {EMOJI_LIST.map(emoji => (
                                        <button key={emoji} onClick={() => handleReact(msg.id, emoji)}
                                          className="rounded-xl p-1.5 text-xl leading-none hover:bg-slate-100 hover:scale-110 active:scale-95 transition">
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  onClick={() => { setReplyTo({ id: msg.id, message: msg.message, sender_id: msg.sender_id, first_name: msg.first_name, last_name: msg.last_name }); inputRef.current?.focus(); }}
                                  title="Reply"
                                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition">
                                  <CornerUpLeft className="h-3.5 w-3.5" />
                                </button>

                                <button onClick={() => handlePin(msg.id)} title={msg.is_pinned ? "Unpin" : "Pin"}
                                  className={`rounded-lg p-1.5 transition ${msg.is_pinned ? "text-amber-500 hover:bg-amber-50" : "text-slate-400 hover:bg-slate-100 hover:text-amber-500"}`}>
                                  <Pin className="h-3.5 w-3.5" />
                                </button>

                                {isMine && <>
                                  <div className="w-px h-4 bg-slate-200 mx-0.5" />
                                  <button
                                    onClick={() => { setEditingMsg({ id: msg.id, message: msg.message }); setText(msg.message || ""); inputRef.current?.focus(); }}
                                    title="Edit"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-blue-600 transition">
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button onClick={() => handleDeleteMsg(msg.id)} title="Delete"
                                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 transition">
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </>}
                              </div>
                            )}
                          </motion.div>
                        </div>
                      );
                    })}
                  </AnimatePresence>

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {typingText && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                        className="flex items-end gap-2.5 mt-3 pl-10">
                        <div className="flex items-center gap-2 rounded-2xl rounded-bl-md bg-white border border-slate-100 px-4 py-2.5 shadow-sm">
                          <div className="flex gap-0.5 items-center">
                            {[0, 1, 2].map(i => (
                              <span key={i} className="h-2 w-2 rounded-full bg-slate-300 animate-bounce"
                                style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }} />
                            ))}
                          </div>
                          <span className="text-xs text-slate-400">{typingText}</span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={bottomRef} className="h-2" />
                </div>
              </div>

              {/* ══════════════════════════════════════
                  Input area — redesigned
                  ══════════════════════════════════════ */}
              <div className="border-t border-slate-100 bg-white">

                {/* Edit banner */}
                <AnimatePresence>
                  {editingMsg && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-b border-amber-100 bg-amber-50/80 px-4 py-2.5 flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-200">
                        <Pencil className="h-3 w-3 text-amber-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-amber-800">Editing message</p>
                        <p className="text-xs text-amber-600 truncate">{editingMsg.message}</p>
                      </div>
                      <button onClick={() => { setEditingMsg(null); setText(""); }} className="rounded-lg p-1 text-amber-400 hover:bg-amber-100 transition">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Reply banner */}
                <AnimatePresence>
                  {replyTo && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-b border-blue-100 bg-blue-50/80 px-4 py-2.5 flex items-center gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-blue-200">
                        <CornerUpLeft className="h-3 w-3 text-blue-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-blue-800">
                          Replying to {replyTo.sender_id === user?.id ? "yourself" : `${replyTo.first_name || ""} ${replyTo.last_name || ""}`.trim() || "User"}
                        </p>
                        <p className="text-xs text-blue-600 truncate">{replyTo.message || "📎 Attachment"}</p>
                      </div>
                      <button onClick={() => setReplyTo(null)} className="rounded-lg p-1 text-blue-400 hover:bg-blue-100 transition">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* File preview */}
                <AnimatePresence>
                  {pendingFile && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-b border-slate-100 bg-slate-50 px-4 py-2.5 flex items-center gap-3">
                      <div className="relative shrink-0">
                        {pendingFile.type === "image"
                          ? <img src={pendingFile.url} alt="" className="h-10 w-10 rounded-xl object-cover border border-slate-200 shadow-sm" />
                          : <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm">
                              <FileText className="h-5 w-5 text-slate-400" />
                            </div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-700 truncate">{pendingFile.name || "Attachment"}</p>
                        <p className="text-[10px] text-slate-400 capitalize">{pendingFile.type} · {pendingFile.file_size ? `${(pendingFile.file_size / 1024).toFixed(0)} KB` : ""}</p>
                      </div>
                      <button onClick={() => setPendingFile(null)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 transition">
                        <X className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Input bar */}
                <form onSubmit={handleSend} className="flex items-end gap-2 px-3 py-3">
                  {/* File attach */}
                  <input ref={fileRef} type="file" className="hidden"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                    onChange={handleFilePick} />

                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} title="Attach file"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                      pendingFile
                        ? "border-blue-400 bg-blue-50 text-blue-600"
                        : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
                    } disabled:opacity-40`}>
                    {uploading
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
                      : <Paperclip className="h-4.5 w-4.5" />}
                  </button>

                  {/* Text input */}
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) handleSend(e); }}
                      placeholder={
                        editingMsg ? "Edit your message…"
                        : replyTo ? "Write your reply…"
                        : isGroup(activeConv) ? `Message ${convName(activeConv)}…`
                        : "Type a message…"
                      }
                      maxLength={2000}
                      className={`w-full rounded-2xl border py-2.5 pl-4 pr-4 text-sm placeholder-slate-400 transition-all focus:outline-none focus:ring-2 ${
                        editingMsg
                          ? "border-amber-300 bg-amber-50 focus:border-amber-400 focus:ring-amber-100"
                          : "border-slate-200 bg-slate-50 focus:border-blue-400 focus:bg-white focus:ring-blue-100"
                      }`}
                    />
                  </div>

                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={(!text.trim() && !pendingFile) || sending || uploading}
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-medium transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${
                      editingMsg
                        ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-200"
                        : "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                    }`}>
                    {sending
                      ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      : editingMsg
                      ? <Check className="h-4 w-4" />
                      : <Send className="h-4 w-4 -translate-x-px" />}
                  </button>
                </form>
              </div>

            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
