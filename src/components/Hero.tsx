import { Link } from "@tanstack/react-router";
import { Flame, Play } from "lucide-react";
import { useEffect, useState } from "react";
import type { Media } from "@/lib/data";
import { localized, useLang } from "@/lib/i18n";

export function Hero({ items }: { items: Media[] }) {
  const { t, lang } = useLang();
  const [index, setIndex] = useState(0);
  const list = items.slice(0, 11);

  useEffect(() => {
    if (list.length <= 1) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % list.length), 6000);
    return () => clearInterval(id);
  }, [list.length]);

  if (!list.length) return null;
  const item = list[index];
  const loc = localized(item, lang);

  return (
    <section className="relative h-[80vh] min-h-[520px] w-full overflow-hidden">
      {list.map((it, i) => (
        <img
          key={it.id}
          src={it.backdrop}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
        />
      ))}
      <div className="absolute inset-0 hero-fade" />
      <div className="absolute inset-0 bg-gradient-to-r rtl:bg-gradient-to-l from-background/90 via-background/40 to-transparent" />

      <div className="relative z-10 flex h-full items-end md:items-center">
        <div className="mx-auto w-full max-w-[1600px] px-4 md:px-10 pb-20 md:pb-0">
          <div key={item.id} className="max-w-xl space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 text-primary border border-primary/30 px-3 py-1 text-xs font-semibold uppercase tracking-wider">
              <Flame className="h-3.5 w-3.5" />
              #{index + 1} {t("trending")}
            </span>
            <h1 className="display text-4xl md:text-6xl font-bold leading-tight text-white drop-shadow-lg">
              {loc.title}
            </h1>
            <p className="text-base md:text-lg text-white/85 line-clamp-3 max-w-lg">
              {loc.overview}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link
                to="/watch/$id"
                params={{ id: item.id }}
                className="inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-white/90 transition"
              >
                <Play className="h-5 w-5 fill-current" />
                {t("play")}
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {list.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            aria-label={`Slide ${i + 1}`}
            className={`h-2 rounded-full transition-all ${
              i === index ? "w-6 bg-white" : "w-2 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
