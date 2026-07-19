import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, Plus, LogIn, Crown, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsVip } from "@/lib/vip";
import { useAllMedia } from "@/lib/media-store";
import { useLang, localized } from "@/lib/i18n";

export const Route = createFileRoute("/rooms")({
  head: () => ({
    meta: [
      { title: "Watch Together — Sebar Tv" },
      { name: "description", content: "Create or join VIP watch-together rooms on Sebar Tv." },
    ],
  }),
  component: RoomsPage,
});

type Room = {
  id: string;
  host_id: string;
  media_id: string;
  media_kind: string;
  is_active: boolean;
  created_at: string;
};

function RoomsPage() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const media = useAllMedia();
  const [uid, setUid] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [code, setCode] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const isVip = useIsVip(uid);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);

  const load = async () => {
    const { data } = await supabase
      .from("watch_rooms")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setRooms((data as any) ?? []);
  };

  useEffect(() => {
    if (!uid) return;
    load();
    const ch = supabase
      .channel("watch-rooms-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "watch_rooms" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid]);

  const join = async (id: string) => {
    const norm = id.trim().toUpperCase();
    if (!norm) return;
    navigate({ to: "/room/$id", params: { id: norm } });
  };

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="mx-auto max-w-4xl px-4">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" /> {t("back")}
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="grid place-items-center h-11 w-11 rounded-full bg-primary/15 text-primary">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="display text-2xl md:text-3xl font-bold">{t("watchTogether")}</h1>
            <p className="text-sm text-muted-foreground">{t("hostControls")}</p>
          </div>
        </div>

        {!uid && (
          <div className="rounded-xl border border-white/10 bg-card/60 p-4 text-sm">{t("needSignInRoom")}</div>
        )}

        {/* Join by code */}
        <section className="mt-4 rounded-2xl border border-white/10 bg-card/60 backdrop-blur-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary/90 uppercase tracking-wider mb-2">
            <LogIn className="h-3.5 w-3.5" /> {t("joinRoom")}
          </div>
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder={t("enterCode")}
              className="flex-1 rounded-lg bg-background/60 border border-white/10 px-3 py-2 text-sm font-mono tracking-widest uppercase focus:outline-none focus:border-primary/60"
              maxLength={8}
            />
            <button
              onClick={() => join(code)}
              disabled={!uid || !code.trim()}
              className="rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold disabled:opacity-40"
            >
              {t("join")}
            </button>
          </div>
        </section>

        {/* Create room (VIP) */}
        <section className="mt-4 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/60 to-card/60 backdrop-blur-xl p-5">
          <div className="flex items-center gap-2 text-xs font-semibold text-primary uppercase tracking-wider mb-2">
            <Crown className="h-3.5 w-3.5" /> {t("createRoom")} · {t("vipOnly")}
          </div>
          {!isVip ? (
            <div className="text-sm text-muted-foreground">{t("needVipToCreate")}</div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-start">
              <p className="text-sm text-muted-foreground">
                Pick a title from your library and start a room. Your friends can join with the code.
              </p>
            </div>
          )}
          {isVip && (
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-72 overflow-y-auto">
              {media.slice(0, 24).map((m) => {
                const l = localized(m, lang);
                return (
                  <button
                    key={m.id}
                    onClick={async () => {
                      setErr(null);
                      const id = genCode();
                      const { error } = await supabase.from("watch_rooms").insert({
                        id,
                        host_id: uid!,
                        media_id: m.id,
                        media_kind: m.kind,
                      });
                      if (error) { setErr(error.message); return; }
                      await supabase.from("watch_room_members").insert({ room_id: id, user_id: uid! });
                      navigate({ to: "/room/$id", params: { id } });
                    }}
                    className="group relative overflow-hidden rounded-lg ring-1 ring-white/10 hover:ring-primary/60 transition"
                  >
                    <img src={m.poster} alt={l.title} className="aspect-[2/3] w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-2 text-start">
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-primary">
                        <Plus className="h-3 w-3" /> {t("createRoom")}
                      </div>
                      <div className="text-xs font-semibold text-white line-clamp-2">{l.title}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {err && <div className="mt-3 text-xs text-red-400">{err}</div>}
        </section>

        {/* Active rooms */}
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            {t("activeRooms")}
          </h2>
          {rooms.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-card/40 p-6 text-sm text-muted-foreground text-center">
              {t("noRooms")}
            </div>
          ) : (
            <div className="grid gap-2">
              {rooms.map((r) => {
                const m = media.find((x) => x.id === r.media_id);
                const l = m ? localized(m, lang) : null;
                return (
                  <button
                    key={r.id}
                    onClick={() => join(r.id)}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-card/60 hover:bg-card/80 p-3 text-start transition"
                  >
                    {m && <img src={m.poster} alt="" className="h-14 w-10 object-cover rounded-md" />}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{l?.title ?? r.media_id}</div>
                      <div className="text-[11px] text-muted-foreground font-mono tracking-widest">{r.id}</div>
                    </div>
                    <span className="text-xs rounded-full bg-primary/15 text-primary px-2.5 py-1 font-semibold">
                      {t("join")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function genCode(): string {
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  const b = new Uint32Array(6);
  crypto.getRandomValues(b);
  for (let i = 0; i < 6; i++) s += A[b[i] % A.length];
  return s;
}
