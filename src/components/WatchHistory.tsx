import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAllMedia } from "@/lib/media-store";
import { localized, useLang } from "@/lib/i18n";

type Row = {
  media_id: string;
  media_kind: string;
  position_seconds: number;
  duration_seconds: number | null;
  updated_at: string;
};

export function WatchHistory({ userId }: { userId: string }) {
  const { t, lang } = useLang();
  const all = useAllMedia();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    supabase
      .from("watch_history")
      .select("media_id, media_kind, position_seconds, duration_seconds, updated_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        setRows((data as Row[]) ?? []);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!userId) return;
    load();
  }, [userId]);

  const remove = async (id: string) => {
    setRows((r) => r.filter((x) => x.media_id !== id));
    await supabase.from("watch_history").delete().eq("user_id", userId).eq("media_id", id);
  };

  if (loading) return <div className="h-16 rounded-lg bg-muted/20 animate-pulse" />;
  if (rows.length === 0)
    return <p className="text-sm text-muted-foreground">{t("noHistory")}</p>;

  return (
    <ul className="space-y-3">
      {rows.map((r) => {
        const item = all.find((m) => m.id === r.media_id);
        if (!item) return null;
        const loc = localized(item, lang);
        const pct = r.duration_seconds
          ? Math.min(100, Math.max(2, (r.position_seconds / r.duration_seconds) * 100))
          : 0;
        return (
          <li key={r.media_id} className="flex items-center gap-3 rounded-xl border border-border bg-background/40 p-2 pr-3">
            <Link
              to="/watch/$id"
              params={{ id: r.media_id }}
              className="relative shrink-0 overflow-hidden rounded-lg"
            >
              <img src={item.poster} alt="" className="h-16 w-12 object-cover" />
              <span className="absolute inset-x-0 bottom-0 h-1 bg-white/20">
                <span className="block h-full bg-primary" style={{ width: `${pct}%` }} />
              </span>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{loc.title}</div>
              <div className="text-xs text-muted-foreground">
                {fmtTime(r.position_seconds)}
                {r.duration_seconds ? ` / ${fmtTime(r.duration_seconds)}` : ""}
              </div>
            </div>
            <Link
              to="/watch/$id"
              params={{ id: r.media_id }}
              className="inline-flex items-center gap-1 rounded-full bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold"
            >
              <Play className="h-3.5 w-3.5 fill-current" /> {t("resume")}
            </Link>
            <button
              onClick={() => remove(r.media_id)}
              aria-label={t("clearHistory")}
              className="p-1.5 text-muted-foreground hover:text-destructive transition"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
}
