import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search as SearchIcon, X } from "lucide-react";
import { useAllMedia } from "@/lib/media-store";
import { localized, useLang } from "@/lib/i18n";

export function SearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, lang } = useLang();
  const media = useAllMedia();
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 40);
      const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("keydown", onKey);
        document.body.style.overflow = "";
      };
    }
  }, [open, onClose]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return media
      .filter((m) => {
        const hay = [m.title, m.titleKu, ...m.genres, ...m.genresKu, String(m.year)].join(" ").toLowerCase();
        return hay.includes(s);
      })
      .slice(0, 20);
  }, [q]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-16 md:pt-24 px-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-2xl rounded-2xl border border-white/10 bg-card shadow-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-4 border-b border-white/10">
          <SearchIcon className="h-5 w-5 text-muted-foreground" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="flex-1 bg-transparent py-4 text-base outline-none placeholder:text-muted-foreground"
          />
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim() === "" ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("searchStart")}</p>
          ) : results.length === 0 ? (
            <p className="p-8 text-center text-sm text-muted-foreground">{t("searchNoResults")}</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {results.map((m) => {
                const loc = localized(m, lang);
                return (
                  <li key={m.id}>
                    <Link
                      to="/watch/$id"
                      params={{ id: m.id }}
                      onClick={onClose}
                      className="flex gap-3 p-3 hover:bg-white/5 transition"
                    >
                      <img src={m.poster} alt="" className="h-16 w-11 rounded-md object-cover flex-shrink-0" loading="lazy" />
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold truncate">{loc.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {m.year} · {loc.genres.slice(0, 3).join(" · ")}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
