import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { media as staticMedia, type Media, type MediaKind } from "./data";

type Ctx = {
  all: Media[];
  loading: boolean;
  refresh: () => Promise<void>;
};

const MediaCtx = createContext<Ctx>({ all: staticMedia, loading: false, refresh: async () => {} });

function rowToMedia(r: any): Media {
  return {
    id: r.id,
    kind: r.kind as MediaKind,
    title: r.title,
    titleKu: r.title_ku,
    overview: r.overview,
    overviewKu: r.overview_ku,
    year: r.year,
    rating: Number(r.rating),
    duration: r.duration,
    genres: r.genres ?? [],
    genresKu: r.genres_ku ?? [],
    poster: r.poster,
    backdrop: r.backdrop,
    videoUrl: r.video_url,
    featured: r.featured,
    seasons: r.seasons ?? undefined,
  };
}

export function MediaProvider({ children }: { children: ReactNode }) {
  const [dbItems, setDbItems] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    const { data, error } = await supabase.from("media").select("*").order("created_at", { ascending: false });
    if (!error && data) setDbItems(data.map(rowToMedia));
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("media-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "media" }, () => refresh())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const all = useMemo(() => {
    // DB items override static ones with same id
    const map = new Map<string, Media>();
    for (const m of staticMedia) map.set(m.id, m);
    for (const m of dbItems) map.set(m.id, m);
    return Array.from(map.values());
  }, [dbItems]);

  return <MediaCtx.Provider value={{ all, loading, refresh }}>{children}</MediaCtx.Provider>;
}

export const useAllMedia = () => useContext(MediaCtx).all;
export const useByKind = (k: MediaKind) => useAllMedia().filter((m) => m.kind === k);
export const useMediaById = (id: string) => useAllMedia().find((m) => m.id === id);
export const useFeatured = () => {
  const all = useAllMedia();
  return all.find((m) => m.featured) ?? all[0];
};
export const useTrending = () => {
  const all = useAllMedia();
  return [...all].sort((a, b) => b.rating - a.rating).slice(0, 8);
};
export const useMediaRefresh = () => useContext(MediaCtx).refresh;
