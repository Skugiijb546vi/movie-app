import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Star, Users, ShieldAlert, Play, ChevronUp, Sparkles, Crown } from "lucide-react";
import { getById } from "@/lib/data";
import { useMediaById, useByKind } from "@/lib/media-store";
import { localized, useLang } from "@/lib/i18n";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Comments } from "@/components/Comments";
import { MediaCard } from "@/components/MediaCard";
import { supabase } from "@/integrations/supabase/client";
import { useIsVip } from "@/lib/vip";

export const Route = createFileRoute("/watch/$id")({
  loader: ({ params }) => {
    const item = getById(params.id);
    return { item: item ?? null, id: params.id };
  },
  head: ({ loaderData }) => {
    const item = loaderData?.item;
    if (!item) {
      return { meta: [{ title: "Sebar Tv" }] };
    }
    return {
      meta: [
        { title: `${item.title} — Sebar Tv` },
        { name: "description", content: item.overview },
        { property: "og:title", content: `${item.title} — Sebar Tv` },
        { property: "og:description", content: item.overview },
        { property: "og:image", content: item.backdrop },
        { property: "og:type", content: "video.movie" },
        { name: "twitter:image", content: item.backdrop },
      ],
    };
  },
  component: WatchPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="display text-3xl">Not found</h1>
        <Link to="/" className="text-primary underline mt-4 inline-block">Go home</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="display text-2xl">Something went wrong</h1>
          <p className="text-muted-foreground text-sm">{error.message}</p>
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium"
          >Try again</button>
        </div>
      </div>
    );
  },
});

function WatchPage() {
  const { id, item: loaderItem } = Route.useLoaderData();
  const dbItem = useMediaById(id);
  const item = dbItem ?? loaderItem;
  const { t, lang } = useLang();
  const sameKind = useByKind(item?.kind ?? "movie");
  const online = useOnlineCount(id);
  const [showPlayer, setShowPlayer] = useState(false);
  const navigate = useNavigate();
  const [uid, setUid] = useState<string | null>(null);
  const [resumeAt, setResumeAt] = useState<number>(0);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!uid || !item) return;
    supabase
      .from("watch_history")
      .select("position_seconds")
      .eq("user_id", uid)
      .eq("media_id", item.id)
      .maybeSingle()
      .then(({ data }) => setResumeAt(data?.position_seconds ?? 0));
  }, [uid, item?.id]);
  const isVip = useIsVip(uid);
  const saveProgress = (cur: number, dur: number) => {
    if (!uid || !item) return;
    supabase.from("watch_history").upsert({
      user_id: uid,
      media_id: item.id,
      media_kind: item.kind,
      position_seconds: Math.floor(cur),
      duration_seconds: Math.floor(dur),
      updated_at: new Date().toISOString(),
    });
  };

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="display text-3xl">Not found</h1>
          <Link to="/" className="text-primary underline mt-4 inline-block">Go home</Link>
        </div>
      </div>
    );
  }
  const loc = localized(item, lang);

  return (
    <div className="min-h-screen pt-20 pb-16">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t("back")}
        </Link>

        {/* Hero: backdrop with title + overview */}
        <div className="relative overflow-hidden rounded-2xl border border-white/10">
          <div
            className="absolute inset-0 bg-cover bg-center scale-105 blur-[2px] opacity-40"
            style={{ backgroundImage: `url(${item.backdrop})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/40" />
          <div className="relative grid gap-6 p-5 md:p-8 md:grid-cols-[200px_1fr]">
            <img
              src={item.poster}
              alt={loc.title}
              className="mx-auto md:mx-0 w-32 md:w-[200px] aspect-[2/3] object-cover rounded-lg shadow-2xl ring-1 ring-white/10"
            />
            <div>
              <h1 className="display text-3xl md:text-5xl font-bold">{loc.title}</h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-500/15 text-yellow-400 px-2.5 py-1 font-semibold">
                  <Star className="h-3.5 w-3.5 fill-current" /> {item.rating.toFixed(1)}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 font-semibold">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                  </span>
                  {online} {t("views")}
                </span>
                {isFamilyFriendly(item.genres) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-400 px-2.5 py-1 font-medium">
                    <Users className="h-3.5 w-3.5" /> {t("familyFriendly")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/15 text-red-400 px-2.5 py-1 font-medium">
                    <ShieldAlert className="h-3.5 w-3.5" /> {t("matureContent")}
                  </span>
                )}
                <span className="text-muted-foreground">· {item.year}</span>
                <span className="text-muted-foreground">· {item.duration}</span>
                {item.seasons ? <span className="text-muted-foreground">· {item.seasons} {t("seasons")}</span> : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {loc.genres.map((g) => (
                  <span key={g} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs">
                    {g}
                  </span>
                ))}
              </div>

              <h2 className="mt-6 text-lg font-semibold">{t("overview")}</h2>
              <p className="mt-2 text-muted-foreground leading-relaxed">{loc.overview}</p>
            </div>
          </div>
        </div>

        {/* Trailer CTA */}
        <div className="mt-6">
          <button
            onClick={() => setShowPlayer((v) => !v)}
            className="group relative w-full overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/60 to-card/60 backdrop-blur-xl p-5 md:p-6 text-start transition-all hover:border-primary/60 hover:shadow-[0_10px_40px_-10px_color-mix(in_oklab,var(--primary)_60%,transparent)]"
          >
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl transition-opacity group-hover:opacity-80" />
            <div className="relative flex items-center gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] transition-transform group-hover:scale-110">
                {showPlayer ? <ChevronUp className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current ml-0.5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold text-primary/90">
                  <Sparkles className="h-3.5 w-3.5" />
                  {loc.title}
                </div>
                <div className="mt-0.5 text-base md:text-lg font-bold">
                  {showPlayer ? t("hideTrailer") : t("watchTrailerQ")}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">{t("watchTrailerDesc")}</div>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold shadow-md">
                {showPlayer ? t("hideTrailer") : t("watchNow")}
              </span>
            </div>
          </button>

          <div
            className={
              "grid transition-all duration-500 ease-out " +
              (showPlayer ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0")
            }
          >
            <div className="overflow-hidden">
              {showPlayer && (
                <VideoPlayer
                  key={item.id}
                  src={item.videoUrl}
                  poster={item.backdrop}
                  title={loc.title}
                  initialTime={resumeAt}
                  onProgress={saveProgress}
                />
              )}
            </div>
          </div>
        </div>

        {/* Watch Together (VIP) */}
        {isVip && (
          <div className="mt-4">
            <button
              onClick={async () => {
                if (!uid) return;
                const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                const b = new Uint32Array(6);
                crypto.getRandomValues(b);
                let code = "";
                for (let i = 0; i < 6; i++) code += A[b[i] % A.length];
                const { error } = await supabase.from("watch_rooms").insert({
                  id: code, host_id: uid, media_id: item.id, media_kind: item.kind,
                });
                if (error) { alert(error.message); return; }
                await supabase.from("watch_room_members").insert({ room_id: code, user_id: uid });
                navigate({ to: "/room/$id", params: { id: code } });
              }}
              className="group flex w-full items-center gap-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/15 via-card/60 to-card/60 backdrop-blur-xl p-4 md:p-5 text-start transition-all hover:border-primary/60"
            >
              <div className="grid place-items-center h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg">
                <Users className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-primary uppercase tracking-wider">
                  <Crown className="h-3 w-3" /> {t("vipOnly")}
                </div>
                <div className="text-base font-bold">{t("watchTogether")}</div>
                <div className="text-xs text-muted-foreground">{t("createRoom")}</div>
              </div>
              <span className="hidden sm:inline-flex items-center rounded-full bg-primary text-primary-foreground px-4 py-2 text-xs font-semibold">
                {t("createRoom")}
              </span>
            </button>
          </div>
        )}



        {/* You might also like */}
        {(() => {
          const related = sameKind.filter((m) => m.id !== item.id);
          if (related.length === 0) return null;
          const ctaKey = item.kind === "movie" ? "browseMoviesCta" : item.kind === "series" ? "browseSeriesCta" : "browseDubbedCta";
          const to = item.kind === "movie" ? "/movies" : item.kind === "series" ? "/series" : "/dubbed";
          return (
            <section className="mt-10">
              <div className="flex items-end justify-between gap-4 mb-4">
                <div>
                  <div className="text-xs font-semibold text-primary/90 uppercase tracking-wider">{t(ctaKey as any)}</div>
                  <h2 className="display text-xl md:text-2xl font-bold mt-1">{t("youMightLike")}</h2>
                </div>
                <Link
                  to={to}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold hover:bg-white/10 hover:border-primary/50 transition-colors"
                >
                  {t("seeAll")}
                  <ArrowLeft className="h-3.5 w-3.5 rotate-180 rtl:rotate-0" />
                </Link>
              </div>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x snap-mandatory scroll-smooth [scroll-padding-inline:1rem] touch-pan-x [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain]">
                {related.map((m) => (
                  <div key={m.id} className="snap-start">
                    <MediaCard item={m} />
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        <Comments mediaId={item.id} />
      </div>
    </div>
  );
}

function useOnlineCount(mediaId: string): number {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const key = crypto.randomUUID();
    const channel = supabase.channel(`presence:watch:${mediaId}`, {
      config: { presence: { key } },
    });
    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setCount(Math.max(1, Object.keys(state).length));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });
    return () => { supabase.removeChannel(channel); };
  }, [mediaId]);
  return count;
}
const MATURE = new Set(["Horror", "Thriller", "Crime", "War"]);
function isFamilyFriendly(genres: string[]): boolean {
  return !genres.some((g) => MATURE.has(g));
}
