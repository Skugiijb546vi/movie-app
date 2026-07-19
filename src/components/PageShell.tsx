import type { ReactNode } from "react";
import { Row } from "./Row";
import type { Media } from "@/lib/data";

export function CategoryPage({
  title,
  subtitle,
  items,
  hero,
}: {
  title: string;
  subtitle?: string;
  items: Media[];
  hero?: Media;
}) {
  return (
    <div className="min-h-screen">
      {hero && (
        <div
          className="relative h-[45vh] min-h-[320px] w-full overflow-hidden"
        >
          <img src={hero.backdrop} alt="" className="absolute inset-0 h-full w-full object-cover opacity-40" />
          <div className="absolute inset-0 hero-fade" />
          <div className="relative z-10 flex h-full items-end">
            <div className="mx-auto w-full max-w-[1600px] px-4 md:px-10 pb-8">
              <h1 className="display text-4xl md:text-6xl font-bold">{title}</h1>
              {subtitle && (
                <p className="mt-2 text-muted-foreground max-w-xl">{subtitle}</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1600px] py-6">
        <GridSection items={items} />
      </div>
    </div>
  );
}

function GridSection({ items }: { items: Media[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-5 px-4 md:px-10">
      {items.map((m) => (
        <PosterCard key={m.id} item={m} />
      ))}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { Play, Star } from "lucide-react";
import { localized, useLang } from "@/lib/i18n";

function PosterCard({ item }: { item: Media }) {
  const { lang } = useLang();
  const loc = localized(item, lang);
  return (
    <Link
      to="/watch/$id"
      params={{ id: item.id }}
      className="group relative block overflow-hidden rounded-md bg-card transition hover:scale-[1.03]"
    >
      <div className="aspect-[2/3] overflow-hidden">
        <img src={item.poster} alt={loc.title} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
        <div className="flex items-center gap-2 text-xs mb-1">
          <span className="flex items-center gap-1 text-primary"><Star className="h-3 w-3 fill-current"/>{item.rating.toFixed(1)}</span>
          <span className="text-white/60">· {item.year}</span>
        </div>
        <h3 className="text-sm font-semibold line-clamp-2 text-white">{loc.title}</h3>
        <div className="mt-1.5 inline-flex items-center gap-1 text-xs text-white"><Play className="h-3 w-3 fill-current"/>{item.duration}</div>
      </div>
    </Link>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[1600px]">{children}</div>;
}

export { Row };
