import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Send, LogIn, MessageCircle, Pencil, Trash2, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useVipUsers } from "@/lib/vip";
import { VipBadge, VipAvatarRing } from "@/components/VipBadge";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Live Chat — Sebar Tv" },
      { name: "description", content: "Chat live with other Sebar Tv viewers." },
    ],
  }),
  component: ChatPage,
});

type Message = {
  id: string;
  user_id: string;
  channel: string;
  content: string;
  created_at: string;
};

type Profile = { id: string; display_name: string; avatar_color: string; avatar_url?: string | null };

const ACCENTS = ["#e11d2e", "#f5b301", "#2b7fff", "#10b981", "#8b5cf6", "#f43f5e", "#14b8a6", "#f97316"];
function colorFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return ACCENTS[h % ACCENTS.length];
}

const CHANNEL = "general";
const LONG_PRESS_MS = 450;

function ChatPage() {
  const { t } = useLang();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [actionFor, setActionFor] = useState<Message | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const messageUserIds = useMemo(
    () => Array.from(new Set(messages.map((m) => m.user_id))),
    [messages],
  );
  const vips = useVipUsers(messageUserIds);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id,user_id,channel,content,created_at")
        .eq("channel", CHANNEL)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancelled) return;
      if (error) { toast.error(error.message); return; }
      setMessages((data ?? []) as Message[]);
      const ids = Array.from(new Set((data ?? []).map((m) => m.user_id)));
      if (ids.length) loadProfiles(ids);
    })();
    return () => { cancelled = true; };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const ch = supabase
      .channel(`messages:${CHANNEL}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `channel=eq.${CHANNEL}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (!profiles[m.user_id]) loadProfiles([m.user_id]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `channel=eq.${CHANNEL}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages", filter: `channel=eq.${CHANNEL}` },
        (payload) => {
          const old = payload.old as { id: string };
          setMessages((prev) => prev.filter((x) => x.id !== old.id));
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const loadProfiles = async (ids: string[]) => {
    const missing = ids.filter((id) => !profiles[id]);
    if (missing.length === 0) return;
    const { data } = await supabase
      .from("profiles")
      .select("id,display_name,avatar_color,avatar_url")
      .in("id", missing);
    if (data) {
      setProfiles((prev) => {
        const next = { ...prev };
        for (const p of data as Profile[]) next[p.id] = p;
        return next;
      });
    }
  };

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !session) return;
    setSending(true);
    const { error } = await supabase
      .from("messages")
      .insert({ user_id: session.user.id, channel: CHANNEL, content: text });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setInput("");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const text = editText.trim();
    if (!text) return;
    const { error } = await supabase.from("messages").update({ content: text }).eq("id", editingId);
    if (error) { toast.error(error.message); return; }
    setEditingId(null);
    setEditText("");
  };

  const deleteMsg = async (id: string) => {
    setActionFor(null);
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) toast.error(error.message);
  };

  const myId = session?.user.id ?? "";
  const empty = useMemo(() => messages.length === 0, [messages]);

  if (!ready) {
    return <div className="min-h-screen pt-24 flex items-center justify-center text-muted-foreground">…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen pt-24 pb-24 flex items-center justify-center px-4">
        <div className="max-w-md text-center rounded-2xl border border-border bg-card/80 p-8">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <MessageCircle className="h-7 w-7" />
          </div>
          <h1 className="display text-2xl font-bold">{t("chat")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("needSignInToChat")}</p>
          <Link
            to="/auth"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition"
          >
            <LogIn className="h-4 w-4" />
            {t("goToSignIn")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-28">
      <div className="mx-auto max-w-4xl px-3 md:px-6">
        <header className="mb-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="display text-2xl md:text-3xl font-bold leading-none">{t("chat")}</h1>
            <p className="text-xs text-muted-foreground mt-1">#{t("general")}</p>
          </div>
        </header>

        <div
          ref={listRef}
          className="h-[62vh] overflow-y-auto rounded-2xl border border-border bg-card/50 backdrop-blur p-3 md:p-4 space-y-2"
        >
          {empty ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-60" />
              <p className="text-sm">#{t("general")}</p>
            </div>
          ) : (
            messages.map((m, i) => {
              const mine = m.user_id === myId;
              const prof = profiles[m.user_id];
              const name = prof?.display_name ?? "…";
              const color = colorFor(m.user_id);
              const prev = messages[i - 1];
              const grouped = !!prev && prev.user_id === m.user_id &&
                (new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000);
              const isEditing = editingId === m.id;
              const isVip = vips.has(m.user_id);

              return (
                <div key={m.id} className={cn("flex gap-2.5", mine ? "flex-row-reverse" : "flex-row")}>
                  <div className={cn("w-8 shrink-0 flex justify-center", grouped && "invisible")}>
                    <VipAvatarRing active={isVip && !grouped} crown={isVip && !grouped} size="sm">
                      <Avatar name={name} color={color} url={prof?.avatar_url} />
                    </VipAvatarRing>
                  </div>
                  <div className={cn("max-w-[75%] flex flex-col", mine ? "items-end" : "items-start")}>
                    {!grouped && (
                      <span className={cn(
                        "text-[11px] mb-0.5 px-1 flex items-center gap-1.5",
                        mine ? "flex-row-reverse" : "flex-row",
                      )}>
                        {!mine && (
                          <span className={cn(isVip && "vip-name")}>{name}</span>
                        )}
                        {isVip && <VipBadge size="xs" />}
                        <span className="text-muted-foreground">
                          {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                            if (e.key === "Escape") { setEditingId(null); }
                          }}
                          className="rounded-xl bg-background border border-primary/50 focus:border-primary outline-none px-3 py-1.5 text-sm"
                        />
                        <button onClick={saveEdit} className="p-1.5 rounded-full bg-primary text-primary-foreground">
                          <Check className="h-4 w-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 rounded-full bg-muted text-muted-foreground">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <MessageBubble
                        mine={mine}
                        vip={isVip}
                        content={m.content}
                        canModify={mine}
                        onLongPress={() => setActionFor(m)}
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={send} className="mt-3 flex items-center gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("typeMessage")}
            maxLength={2000}
            className="flex-1 rounded-full border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="h-11 w-11 flex items-center justify-center rounded-full bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition"
            aria-label={t("send")}
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>

      {actionFor && (
        <ActionSheet
          onClose={() => setActionFor(null)}
          onEdit={() => {
            setEditingId(actionFor.id);
            setEditText(actionFor.content);
            setActionFor(null);
          }}
          onDelete={() => deleteMsg(actionFor.id)}
        />
      )}
    </div>
  );
}

function Avatar({ name, color, url }: { name: string; color: string; url?: string | null }) {
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        referrerPolicy="no-referrer"
        className="h-8 w-8 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <div
      className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
      style={{ background: `linear-gradient(135deg, ${color}, ${color}aa)` }}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function MessageBubble({
  mine, vip = false, content, canModify, onLongPress,
}: {
  mine: boolean; vip?: boolean; content: string; canModify: boolean; onLongPress: () => void;
}) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fired = useRef(false);

  const start = () => {
    if (!canModify) return;
    fired.current = false;
    timer.current = setTimeout(() => {
      fired.current = true;
      if (navigator.vibrate) navigator.vibrate(15);
      onLongPress();
    }, LONG_PRESS_MS);
  };
  const cancel = () => { if (timer.current) { clearTimeout(timer.current); timer.current = null; } };

  return (
    <div
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => { if (canModify) { e.preventDefault(); onLongPress(); } }}
      className={cn(
        "select-none rounded-2xl px-3.5 py-2 text-sm break-words whitespace-pre-wrap cursor-pointer border",
        mine
          ? "bg-primary text-primary-foreground rounded-tr-sm border-transparent"
          : "bg-accent text-foreground rounded-tl-sm border-transparent",
        vip && !mine && "border-[color:rgba(245,179,1,0.55)] shadow-[0_0_16px_-6px_rgba(245,179,1,0.6)]",
        vip && mine && "border-[color:rgba(255,220,140,0.6)] shadow-[0_0_18px_-6px_rgba(245,179,1,0.7)]",
      )}
    >
      {content}
    </div>
  );
}


function ActionSheet({
  onClose, onEdit, onDelete,
}: { onClose: () => void; onEdit: () => void; onDelete: () => void }) {
  const { t } = useLang();
  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full md:max-w-sm bg-card border border-border rounded-t-3xl md:rounded-2xl p-2 shadow-2xl animate-in slide-in-from-bottom-4"
      >
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-accent transition text-left"
        >
          <Pencil className="h-5 w-5 text-primary" />
          <span className="font-medium">{t("edit")}</span>
        </button>
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 transition text-left"
        >
          <Trash2 className="h-5 w-5 text-destructive" />
          <span className="font-medium text-destructive">{t("delete")}</span>
        </button>
        <button
          onClick={onClose}
          className="w-full text-center py-3 mt-1 text-sm text-muted-foreground hover:text-foreground transition"
        >
          {t("cancel")}
        </button>
      </div>
    </div>
  );
}
