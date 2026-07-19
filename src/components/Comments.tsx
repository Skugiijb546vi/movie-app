import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { MessageCircle, Send, LogIn, Pencil, Trash2, Check, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Comment = {
  id: string;
  user_id: string;
  media_id: string;
  content: string;
  created_at: string;
  updated_at: string;
};

type Profile = { id: string; display_name: string; avatar_url?: string | null };

const ACCENTS = ["#e11d2e", "#f5b301", "#2b7fff", "#10b981", "#8b5cf6", "#f43f5e", "#14b8a6", "#f97316"];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

export function Comments({ mediaId }: { mediaId: string }) {
  const { t } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [items, setItems] = useState<Comment[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const profilesRef = useRef(profiles);
  profilesRef.current = profiles;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfiles = async (ids: string[]) => {
    const missing = ids.filter((id) => !profilesRef.current[id]);
    if (!missing.length) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_url")
      .in("id", missing);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of data as Profile[]) next[p.id] = p;
        return next;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("movie_comments")
        .select("id,user_id,media_id,content,created_at,updated_at")
        .eq("media_id", mediaId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (cancelled) return;
      if (error) { toast.error(error.message); return; }
      setItems((data ?? []) as Comment[]);
      const ids = Array.from(new Set((data ?? []).map((c) => c.user_id)));
      if (ids.length) loadProfiles(ids);
    })();
    return () => { cancelled = true; };
  }, [mediaId]);

  useEffect(() => {
    const ch = supabase
      .channel(`movie_comments:${mediaId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "movie_comments", filter: `media_id=eq.${mediaId}` },
        (payload) => {
          const c = payload.new as Comment;
          setItems((prev) => (prev.some((x) => x.id === c.id) ? prev : [c, ...prev]));
          loadProfiles([c.user_id]);
        })
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "movie_comments", filter: `media_id=eq.${mediaId}` },
        (payload) => {
          const c = payload.new as Comment;
          setItems((prev) => prev.map((x) => (x.id === c.id ? c : x)));
        })
      .on("postgres_changes",
        { event: "DELETE", schema: "public", table: "movie_comments", filter: `media_id=eq.${mediaId}` },
        (payload) => {
          const old = payload.old as { id: string };
          setItems((prev) => prev.filter((x) => x.id !== old.id));
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [mediaId]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !session) return;
    setSending(true);
    const { error } = await supabase
      .from("movie_comments")
      .insert({ user_id: session.user.id, media_id: mediaId, content: text });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setInput("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) return;
    const { error } = await supabase.from("movie_comments").update({ content: text }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    setEditingId(null);
    setEditText("");
  };

  const deleteOne = async (id: string) => {
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    const { error } = await supabase.from("movie_comments").delete().eq("id", id);
    if (error) {
      setItems(prev);
      toast.error(error.message);
    }
  };

  const myId = session?.user.id ?? "";

  return (
    <section className="mt-10">
      <header className="flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("comments")}</p>
          <h2 className="display text-2xl font-bold">{t("comments")}</h2>
        </div>
        <span className="text-xs text-muted-foreground">{items.length} {t("commentsCount")}</span>
      </header>

      {ready && !session ? (
        <div className="rounded-2xl border border-border bg-card/60 p-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <h3 className="font-semibold">{t("needSignInComment")}</h3>
            <p className="text-sm text-muted-foreground mt-1">{t("needSignInCommentDesc")}</p>
          </div>
          <Link
            to="/auth"
            className="inline-flex items-center gap-2 rounded-full bg-foreground text-background px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            <LogIn className="h-4 w-4" />
            {t("signIn")}
          </Link>
        </div>
      ) : (
        <form onSubmit={send} className="flex items-center gap-2 mb-5">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("writeComment")}
            maxLength={2000}
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-11 px-4 flex items-center gap-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition"
          >
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">{t("postComment")}</span>
          </button>
        </form>
      )}

      <div className="rounded-2xl border border-border bg-card/40 divide-y divide-border">
        {items.length === 0 ? (
          <div className="p-10 flex flex-col items-center justify-center text-center text-muted-foreground">
            <MessageCircle className="h-8 w-8 mb-2 opacity-60" />
            <p className="text-sm">{t("noComments")}</p>
          </div>
        ) : (
          items.map((c) => {
            const prof = profiles[c.user_id];
            const name = prof?.display_name ?? "…";
            const mine = c.user_id === myId;
            const isEditing = editingId === c.id;
            return (
              <article key={c.id} className="p-4 flex gap-3">
                <div className="shrink-0">
                  {prof?.avatar_url ? (
                    <img src={prof.avatar_url} alt={name} referrerPolicy="no-referrer"
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-border" />
                  ) : (
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
                      style={{ background: `linear-gradient(135deg, ${colorFor(c.user_id)}, ${colorFor(c.user_id)}aa)` }}
                    >
                      {name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold truncate">{name}</span>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString()} · {new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  {isEditing ? (
                    <div className="mt-2 flex items-center gap-2">
                      <input
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 rounded-lg bg-background border border-primary/50 focus:border-primary outline-none px-3 py-1.5 text-sm"
                      />
                      <button onClick={saveEdit} className="p-1.5 rounded-full bg-primary text-primary-foreground">
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditingId(null)} className="p-1.5 rounded-full bg-muted text-muted-foreground">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm leading-relaxed whitespace-pre-wrap break-words">{c.content}</p>
                  )}
                </div>
                {mine && !isEditing && (
                  <div className="flex items-start gap-1 shrink-0">
                    <button
                      onClick={() => { setEditingId(c.id); setEditText(c.content); }}
                      className={cn("p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition")}
                      aria-label="edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteOne(c.id)}
                      className="p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition"
                      aria-label="delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
