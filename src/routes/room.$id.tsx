import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ArrowLeft, Copy, Check, Mic, MicOff, Play, Pause, RotateCcw, RotateCw, Crown, Users, Send, MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMediaById } from "@/lib/media-store";
import { useLang, localized } from "@/lib/i18n";
import { useVipUsers } from "@/lib/vip";
import { VipAvatarRing } from "@/components/VipBadge";
import type { RealtimeChannel } from "@supabase/supabase-js";

export const Route = createFileRoute("/room/$id")({
  component: RoomPage,
});

type Room = {
  id: string;
  host_id: string;
  media_id: string;
  media_kind: string;
  is_active: boolean;
};

type SyncMsg =
  | { type: "state"; playing: boolean; t: number; rate: number; sentAt: number }
  | { type: "seek"; t: number }
  | { type: "request-state" };

type SignalMsg = { from: string; to: string; sdp?: RTCSessionDescriptionInit; ice?: RTCIceCandidateInit };


type PresenceMeta = { uid: string; name: string; avatar: string | null; online_at: number };
type ChatMsg = { id: string; uid: string; name: string; avatar: string | null; text: string; at: number };

function RoomPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { t, lang } = useLang();
  const [uid, setUid] = useState<string | null>(null);
  const [me, setMe] = useState<{ name: string; avatar: string | null }>({ name: "User", avatar: null });
  const [room, setRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState<PresenceMeta[]>([]);
  const [copied, setCopied] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [unread, setUnread] = useState(0);
  const presenceUserIds = useMemo(
    () => Array.from(new Set(presence.map((p) => p.uid).concat(room?.host_id ? [room.host_id] : []))),
    [presence, room?.host_id],
  );
  const vipSet = useVipUsers(presenceUserIds);
  const media = useMediaById(room?.media_id ?? "");


  const videoRef = useRef<HTMLVideoElement>(null);
  const syncChanRef = useRef<RealtimeChannel | null>(null);
  const sigChanRef = useRef<RealtimeChannel | null>(null);
  const applyingRemote = useRef(false);
  const chatOpenRef = useRef(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isHost = !!uid && !!room && uid === room.host_id;

  // Auth + my profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!uid) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("id", uid).maybeSingle().then(({ data }) => {
      if (data) setMe({ name: (data as any).display_name || "User", avatar: (data as any).avatar_url ?? null });
    });
  }, [uid]);

  // Load room + join membership
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { data } = await supabase.from("watch_rooms").select("*").eq("id", id).maybeSingle();
      setRoom((data as any) ?? null);
      setLoading(false);
      if (data) {
        await supabase.from("watch_room_members").upsert({ room_id: id, user_id: uid });
      }
    })();
  }, [uid, id]);

  // Sync channel (playback broadcast + presence + chat)
  useEffect(() => {
    if (!room || !uid) return;
    const ch = supabase.channel(`room:${room.id}`, {
      config: { presence: { key: uid }, broadcast: { self: false } },
    });
    syncChanRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PresenceMeta>();
      const list: PresenceMeta[] = [];
      for (const key of Object.keys(state)) {
        const metas = state[key] as unknown as PresenceMeta[];
        const m = metas?.[0];
        if (m) list.push({ ...m, uid: m.uid || key });
      }
      list.sort((a, b) => a.online_at - b.online_at);
      setPresence(list);
    });

    ch.on("broadcast", { event: "sync" }, ({ payload }) => {
      const msg = payload as SyncMsg;
      const v = videoRef.current;
      if (!v) return;
      if (msg.type === "state") {
        applyingRemote.current = true;
        const drift = (Date.now() - msg.sentAt) / 1000;
        const target = msg.playing ? msg.t + drift : msg.t;
        if (Math.abs(v.currentTime - target) > 0.6) v.currentTime = target;
        v.playbackRate = msg.rate;
        if (msg.playing && v.paused) v.play().catch(() => {});
        if (!msg.playing && !v.paused) v.pause();
        setTimeout(() => { applyingRemote.current = false; }, 100);
      } else if (msg.type === "seek") {
        applyingRemote.current = true;
        v.currentTime = msg.t;
        setTimeout(() => { applyingRemote.current = false; }, 100);
      } else if (msg.type === "request-state" && isHost) {
        broadcastState();
      }
    });

    ch.on("broadcast", { event: "chat" }, ({ payload }) => {
      const m = payload as ChatMsg;
      setMessages((prev) => [...prev, m].slice(-200));
      setUnread((u) => (chatOpenRef.current ? 0 : u + 1));
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ uid, name: me.name, avatar: me.avatar, online_at: Date.now() } satisfies PresenceMeta);
        if (!isHost) ch.send({ type: "broadcast", event: "sync", payload: { type: "request-state" } });
      }
    });

    return () => { supabase.removeChannel(ch); syncChanRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room?.id, uid, isHost, me.name, me.avatar]);


  const broadcastState = useCallback(() => {
    const v = videoRef.current;
    const ch = syncChanRef.current;
    if (!v || !ch || !isHost) return;
    ch.send({
      type: "broadcast",
      event: "sync",
      payload: {
        type: "state",
        playing: !v.paused,
        t: v.currentTime,
        rate: v.playbackRate,
        sentAt: Date.now(),
      } satisfies SyncMsg,
    });
  }, [isHost]);

  // WebRTC voice (mesh)
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteAudiosRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!room || !uid) return;
    const sig = supabase.channel(`voice:${room.id}`, { config: { broadcast: { self: false } } });
    sigChanRef.current = sig;

    const makePC = (peer: string, initiator: boolean) => {
      if (pcsRef.current.has(peer)) return pcsRef.current.get(peer)!;
      const pc = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
      pcsRef.current.set(peer, pc);
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((tr) => pc.addTrack(tr, localStreamRef.current!));
      }
      pc.onicecandidate = (e) => {
        if (e.candidate) sig.send({ type: "broadcast", event: "signal", payload: { from: uid, to: peer, ice: e.candidate.toJSON() } satisfies SignalMsg });
      };
      pc.ontrack = (e) => {
        const audio = document.createElement("audio");
        audio.autoplay = true;
        audio.srcObject = e.streams[0];
        audio.dataset.peer = peer;
        remoteAudiosRef.current?.appendChild(audio);
      };
      if (initiator) {
        pc.createOffer().then((o) => pc.setLocalDescription(o)).then(() => {
          sig.send({ type: "broadcast", event: "signal", payload: { from: uid, to: peer, sdp: pc.localDescription! } satisfies SignalMsg });
        });
      }
      return pc;
    };

    sig.on("broadcast", { event: "signal" }, async ({ payload }) => {
      const msg = payload as SignalMsg;
      if (msg.to !== uid) return;
      const pc = makePC(msg.from, false);
      if (msg.sdp) {
        await pc.setRemoteDescription(msg.sdp);
        if (msg.sdp.type === "offer") {
          const ans = await pc.createAnswer();
          await pc.setLocalDescription(ans);
          sig.send({ type: "broadcast", event: "signal", payload: { from: uid, to: msg.from, sdp: pc.localDescription! } satisfies SignalMsg });
        }
      } else if (msg.ice) {
        try { await pc.addIceCandidate(msg.ice); } catch {}
      }
    });

    sig.on("broadcast", { event: "hello" }, ({ payload }) => {
      const { from } = payload as { from: string };
      if (from === uid) return;
      // Deterministic initiator: lexicographically larger id calls offer
      if (uid > from) makePC(from, true);
    });

    sig.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        sig.send({ type: "broadcast", event: "hello", payload: { from: uid } });
      }
    });

    return () => {
      supabase.removeChannel(sig);
      sigChanRef.current = null;
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      remoteAudiosRef.current?.replaceChildren();
    };
  }, [room?.id, uid]);

  const toggleMic = async () => {
    if (micOn) {
      localStreamRef.current?.getTracks().forEach((tr) => tr.stop());
      localStreamRef.current = null;
      pcsRef.current.forEach((pc) => pc.getSenders().forEach((s) => s.track && pc.removeTrack(s)));
      setMicOn(false);
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = s;
      pcsRef.current.forEach((pc) => s.getTracks().forEach((tr) => pc.addTrack(tr, s)));
      setMicOn(true);
    } catch (e) {
      alert("Mic error: " + (e as Error).message);
    }
  };

  // Host: periodic sync + on user actions
  useEffect(() => {
    if (!isHost) return;
    const iv = setInterval(broadcastState, 4000);
    return () => clearInterval(iv);
  }, [isHost, broadcastState]);

  // Leave
  const leave = async () => {
    if (uid) await supabase.from("watch_room_members").delete().eq("room_id", id).eq("user_id", uid);
    if (isHost) await supabase.from("watch_rooms").update({ is_active: false }).eq("id", id);
    navigate({ to: "/rooms" });
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const sendChat = () => {
    const text = draft.trim();
    if (!text || !uid) return;
    const ch = syncChanRef.current;
    if (!ch) return;
    const msg: ChatMsg = { id: crypto.randomUUID(), uid, name: me.name, avatar: me.avatar, text, at: Date.now() };
    ch.send({ type: "broadcast", event: "chat", payload: msg });
    setMessages((prev) => [...prev, msg].slice(-200));
    setDraft("");
  };

  useEffect(() => { chatOpenRef.current = chatOpen; if (chatOpen) setUnread(0); }, [chatOpen]);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length, chatOpen]);

  const initials = (n: string) => n.split(/\s+/).slice(0,2).map(s => s[0]?.toUpperCase() ?? "").join("");

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">…</div>;



  if (!room) {
    return (
      <div className="min-h-screen grid place-items-center px-4">
        <div className="text-center space-y-3">
          <div className="display text-2xl">{t("roomNotFound")}</div>
          <Link to="/rooms" className="text-primary underline">{t("rooms")}</Link>
        </div>
      </div>
    );
  }
  const l = media ? localized(media, lang) : null;

  const onHostAction = (fn: () => void) => {
    if (!isHost) return;
    fn();
    setTimeout(broadcastState, 30);
  };

  const v = () => videoRef.current;

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex items-center justify-between mb-4">
          <Link to="/rooms" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("rooms")}
          </Link>
          <div className="flex items-center gap-2">
            <button onClick={copyCode} className="inline-flex items-center gap-2 rounded-full bg-card/70 border border-white/10 px-3 py-1.5 text-xs font-mono tracking-widest">
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {room.id}
            </button>
            <button onClick={leave} className="rounded-full bg-red-500/15 text-red-400 border border-red-500/30 px-3 py-1.5 text-xs font-semibold">
              {t("leaveRoom")}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3 text-xs">
          {isHost ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/15 text-primary px-2.5 py-1 font-semibold">
              <Crown className="h-3.5 w-3.5" /> {t("host")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 text-white/80 px-2.5 py-1 font-semibold">
              <Users className="h-3.5 w-3.5" /> {t("guests")}
            </span>
          )}
          <span className="text-muted-foreground">· {presence.length} online</span>
          <span className="text-muted-foreground">· {t("hostControls")}</span>
        </div>

        {/* Members strip */}
        <div className="mb-3 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {presence.map((p) => {
            const isVip = vipSet.has(p.uid);
            const isRoomHost = p.uid === room.host_id;
            return (
              <div key={p.uid} className="shrink-0 flex flex-col items-center gap-1 w-14" title={p.name}>
                <div className="relative">
                  <VipAvatarRing active={isVip} size="sm" className="h-10 w-10 block">
                    <div className="h-10 w-10 rounded-full overflow-hidden bg-card/70 border border-white/10">
                      {p.avatar ? (
                        <img src={p.avatar} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center text-xs font-bold text-primary">
                          {initials(p.name)}
                        </div>
                      )}
                    </div>
                  </VipAvatarRing>
                  {isRoomHost && (
                    <Crown className="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 text-primary drop-shadow" />
                  )}
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-background" />
                </div>
                <div className="text-[10px] text-muted-foreground truncate w-full text-center">
                  {p.uid === uid ? "You" : p.name}

                </div>
              </div>
            );
          })}
        </div>

        {l && (
          <h1 className="display text-xl md:text-2xl font-bold mb-3">{l.title}</h1>
        )}


        <div className="relative rounded-xl overflow-hidden bg-black ring-1 ring-white/10 aspect-video">
          <video
            ref={videoRef}
            src={media?.videoUrl}
            poster={media?.backdrop}
            className="h-full w-full object-contain bg-black"
            playsInline
            controls={false}
            onPlay={() => { if (!applyingRemote.current) broadcastState(); }}
            onPause={() => { if (!applyingRemote.current) broadcastState(); }}
            onSeeked={() => { if (!applyingRemote.current && isHost) broadcastState(); }}
            onRateChange={() => { if (!applyingRemote.current) broadcastState(); }}
          />
          {!isHost && (
            <div className="absolute top-2 right-2 rounded-full bg-black/60 text-white/80 backdrop-blur px-2.5 py-1 text-[10px] font-semibold">
              {t("hostControls")}
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 flex items-center justify-center gap-4">
          <button
            onClick={() => onHostAction(() => { const el = v(); if (el) el.currentTime = Math.max(0, el.currentTime - 10); })}
            disabled={!isHost}
            className="rounded-full bg-card/70 border border-white/10 p-3 disabled:opacity-40"
            aria-label="Back 10s"
          >
            <RotateCcw className="h-5 w-5" />
          </button>
          <button
            onClick={() => onHostAction(() => { const el = v(); if (!el) return; if (el.paused) el.play(); else el.pause(); })}
            disabled={!isHost}
            className="rounded-full bg-primary text-primary-foreground p-4 shadow-xl disabled:opacity-40"
            aria-label="Play/Pause"
          >
            {v()?.paused === false ? <Pause className="h-6 w-6 fill-current" /> : <Play className="h-6 w-6 fill-current" />}
          </button>
          <button
            onClick={() => onHostAction(() => { const el = v(); if (el) el.currentTime = Math.min((el.duration || 0), el.currentTime + 10); })}
            disabled={!isHost}
            className="rounded-full bg-card/70 border border-white/10 p-3 disabled:opacity-40"
            aria-label="Forward 10s"
          >
            <RotateCw className="h-5 w-5" />
          </button>
          <div className="mx-3 h-8 w-px bg-white/10" />
          <button
            onClick={toggleMic}
            className={
              "rounded-full border p-3 transition " +
              (micOn ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300" : "bg-card/70 border-white/10 text-white/80")
            }
            aria-label="Toggle mic"
            title={micOn ? t("micOn") : t("micOff")}
          >
            {micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
          </button>
        </div>

        {/* Hidden audio sinks for remote peers */}
        <div ref={remoteAudiosRef} className="hidden" />
      </div>

      {/* Floating chat button */}
      <button
        onClick={() => setChatOpen((o) => !o)}
        className="fixed bottom-24 right-4 z-40 rounded-full bg-primary text-primary-foreground shadow-2xl h-14 w-14 grid place-items-center hover:scale-105 transition"
        aria-label="Toggle chat"
      >
        <MessageCircle className="h-6 w-6" />
        {unread > 0 && !chatOpen && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold grid place-items-center">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {/* Chat drawer */}
      {chatOpen && (
        <div className="fixed inset-x-0 bottom-0 z-50 md:inset-auto md:bottom-6 md:right-6 md:w-96 md:rounded-2xl md:max-h-[70vh] bg-background/95 backdrop-blur-xl border-t md:border border-white/10 rounded-t-2xl flex flex-col max-h-[75vh] shadow-2xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              <div className="font-semibold text-sm">Room Chat</div>
              <span className="text-xs text-muted-foreground">· {presence.length}</span>
            </div>
            <button onClick={() => setChatOpen(false)} className="rounded-full p-1.5 hover:bg-white/10" aria-label="Close">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-xs text-muted-foreground pt-8">No messages yet. Say hi 👋</div>
            )}
            {messages.map((m) => {
              const mine = m.uid === uid;
              return (
                <div key={m.id} className={"flex gap-2 " + (mine ? "flex-row-reverse" : "")}>
                  <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-card/70 border border-white/10">
                    {m.avatar ? (
                      <img src={m.avatar} alt={m.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full grid place-items-center text-[10px] font-bold text-primary">
                        {initials(m.name)}
                      </div>
                    )}
                  </div>
                  <div className={"max-w-[75%] " + (mine ? "items-end text-right" : "")}>
                    <div className="text-[10px] text-muted-foreground mb-0.5">{mine ? "You" : m.name}</div>
                    <div className={"inline-block px-3 py-2 rounded-2xl text-sm break-words " + (mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-white/10 rounded-bl-sm")}>
                      {m.text}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>
          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(); }}
            className="p-3 border-t border-white/10 flex items-center gap-2"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a message…"
              maxLength={500}
              className="flex-1 bg-white/5 border border-white/10 rounded-full px-4 py-2 text-sm outline-none focus:border-primary/60"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              className="rounded-full bg-primary text-primary-foreground p-2.5 disabled:opacity-40"
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );

}
