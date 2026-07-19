import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MessageSquare, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllMedia } from "@/lib/media-store";
import { useLang, localized } from "@/lib/i18n";

type Row = {
  id: string;
  media_id: string;
  content: string;
  created_at: string;
  user_id: string;
};

type Profile = { id: string; display_name: string; avatar_url: string | null };

export function LatestReviews() {
  const { t, lang } = useLang();
  const all = useAllMedia();
  const getById = (id: string) => all.find((m) => m.id === id);
  const [rows, setRows] = useState<Row[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const { data } = await supabase
        .from("movie_comments")
        .select("id, media_id, content, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(6);
      if (!alive || !data) return;
      // Only keep reviews whose media still exists in our catalog
      const valid = data.filter((r) => getById(r.media_id));
      setRows(valid);
      const ids = Array.from(new Set(valid.map((r) => r.user_id)));
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url")
          .in("id", ids);
        if (alive && profs) {
          setProfiles(Object.fromEntries(profs.map((p) => [p.id, p as Profile])));
        }
      }
    };
    load();
    const channel = supabase
      .channel("latest-reviews")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "movie_comments" },
        () => load(),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (rows.length === 0) return null;

  return (
    <section className="mt-10 px-4 md:px-6">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-2.5 py-1 text-xs text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" /> {t("reviewsBadge")}
          </span>
          <h2 className="display text-2xl md:text-3xl font-bold mt-2">{t("reviewsTitle")}</h2>
          <p className="text-sm text-muted-foreground mt-1">{t("reviewsSubtitle")}</p>
        </div>
        <Link
          to="/chat"
          className="hidden md:inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-medium whitespace-nowrap"
        >
          {t("viewGroup")} <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => {
          const item = getById(r.media_id)!;
          const loc = localized(item, lang);
          const prof = profiles[r.user_id];
          const name = prof?.display_name || "…";
          return (
            <Link
              key={r.id}
              to="/watch/$id"
              params={{ id: item.id }}
              className="group flex gap-3 rounded-xl border border-white/10 bg-black hover:bg-black/80 transition-colors p-3"
            >
              <img
                src={item.poster}
                alt={loc.title}
                className="h-20 w-14 flex-shrink-0 rounded-md object-cover"
                loading="lazy"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {prof?.avatar_url ? (
                    <img src={prof.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-primary/30" />
                  )}
                  <span className="text-xs text-muted-foreground truncate">{name}</span>
                </div>
                <h3 className="mt-1 text-sm font-semibold truncate group-hover:text-primary transition-colors">
                  {loc.title}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                  {r.content}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
