import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, TrendingUp, User, FileText,
  Loader2, ArrowRight, X,
} from "lucide-react";
import api from "../../services/api";

export default function GlobalSearch({ className = "", inputClassName = "" }) {
  const [query,   setQuery]   = useState("");
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState({ startups: [], users: [], posts: [] });

  const navigate     = useNavigate();
  const containerRef = useRef(null);
  const inputRef     = useRef(null);
  const dropdownRef  = useRef(null);

  /* ── Close on outside click ─────────────────────── */
  useEffect(() => {
    const onDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  /* ── Keyboard: Escape to close ──────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  /* ── Debounced search ───────────────────────────── */
  useEffect(() => {
    const q = query.trim();
    if (q.length < 1) {
      setResults({ startups: [], users: [], posts: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const delay = q.length <= 2 ? 150 : 280;
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.get("/search", { params: { q, limit: 5 } });
        setResults({
          startups: data.startups ?? [],
          users:    data.users    ?? [],
          posts:    data.posts    ?? [],
        });
      } catch {
        setResults({ startups: [], users: [], posts: [] });
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query]);

  /* ── Navigate helpers ───────────────────────────── */
  const clear = useCallback(() => {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }, []);

  const handleSelect = (type, item) => {
    clear();
    if (type === "startup") navigate(`/startups/${item.slug || item.id}`);
    else if (type === "user")  navigate(`/profile/${item.id}`);
    else if (type === "post")  navigate(`/posts/${item.id}`);
  };

  const handleViewAll = () => {
    const q = query.trim();
    clear();
    if (q) navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleViewAll();
  };

  const total = results.startups.length + results.users.length + results.posts.length;
  const showDropdown = open && query.trim().length >= 1;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* ── Input ──────────────────────────────────── */}
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            ref={inputRef}
            type="search"
            autoComplete="off"
            placeholder="Search startups, people, posts…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            aria-label="Global search"
            className={`w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm outline-none transition
              focus:border-primary focus:bg-white focus:ring-2 focus:ring-primary/20 ${inputClassName}`}
          />
          {/* Clear / loading indicator */}
          {query ? (
            loading
              ? <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-slate-400" />
              : (
                <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:text-slate-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )
          ) : null}
        </div>
      </form>

      {/* ── Dropdown ───────────────────────────────── */}
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute left-0 right-0 top-full z-[60] mt-2 max-h-[440px] overflow-y-auto
            rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-200/80">

          {/* Loading skeleton */}
          {loading && total === 0 && (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> Searching…
            </div>
          )}

          {/* No results */}
          {!loading && total === 0 && (
            <div className="py-10 text-center text-sm text-slate-400">
              No results for <span className="font-medium text-slate-600">"{query}"</span>
            </div>
          )}

          {total > 0 && (
            <div>
              {/* Startups section */}
              {results.startups.length > 0 && (
                <section className="p-2">
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Startups
                  </p>
                  {results.startups.map((s) => (
                    <button key={s.id} onClick={() => handleSelect("startup", s)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left
                        hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg
                        bg-primary-light overflow-hidden text-primary">
                        {s.logo_url
                          ? <img src={s.logo_url} alt="" className="h-full w-full object-cover" />
                          : <TrendingUp className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">{s.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {s.industry || s.category_name || s.stage || "Startup"}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* People section */}
              {results.users.length > 0 && (
                <section className={`p-2 ${results.startups.length > 0 ? "border-t border-slate-100" : ""}`}>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    People
                  </p>
                  {results.users.map((u) => (
                    <button key={u.id} onClick={() => handleSelect("user", u)}
                      className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left
                        hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full
                        bg-primary-light overflow-hidden text-primary">
                        {u.profile_photo
                          ? <img src={u.profile_photo} alt="" className="h-full w-full rounded-full object-cover" />
                          : <User className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {u.first_name} {u.last_name}
                        </p>
                        <p className="truncate text-xs text-slate-500 capitalize">
                          {u.headline || u.role || "User"}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* Posts section */}
              {results.posts.length > 0 && (
                <section className={`p-2 ${(results.startups.length > 0 || results.users.length > 0) ? "border-t border-slate-100" : ""}`}>
                  <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                    Posts
                  </p>
                  {results.posts.map((p) => (
                    <button key={p.id} onClick={() => handleSelect("post", p)}
                      className="flex w-full items-start gap-3 rounded-xl px-2 py-2 text-left
                        hover:bg-slate-50 focus:bg-slate-50 focus:outline-none transition">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center
                        rounded-lg bg-slate-100 text-slate-400">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm text-slate-700">{p.content}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {p.first_name} {p.last_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </section>
              )}

              {/* View all */}
              <div className="border-t border-slate-100">
                <button onClick={handleViewAll}
                  className="flex w-full items-center justify-center gap-1.5 py-3 text-sm
                    font-medium text-primary hover:bg-primary-light/40 transition rounded-b-2xl">
                  View all results for "{query}"
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
