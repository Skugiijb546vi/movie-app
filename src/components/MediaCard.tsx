import { Link } from "@tanstack/react-router";
import { Play, Star } from "lucide-react";
import type { Media } from "@/lib/data";
import { localized, useLang } from "@/lib/i18n";

export function MediaCard({ item }: { item: Media }) {
  const { lang } = useLang();
  const loc = localized(item, lang);
  return (
    <Link
      to="/watch/$id"
      params={{ id: item.id }}
      className="group relative block w-[160px] md:w-[200px] shrink-0 overflow-hidden rounded-md bg-card transition-transform duration-300 hover:scale-105 hover:z-10"
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img
          src={item.poster}
          alt={loc.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="flex items-center gap-1 text-primary">
            <Star className="h-3 w-3 fill-current" /> {item.rating.toFixed(1)}
          </span>
          <span>·</span>
          <span>{item.year}</span>
        </div>
        <h3 className="text-sm font-semibold line-clamp-2 text-white">{loc.title}</h3>
        <div className="mt-2 flex items-center gap-1 text-xs text-white/90">
          <Play className="h-3 w-3 fill-current" /> {item.duration}
        </div>
      </div>
    </Link>
  );
}
