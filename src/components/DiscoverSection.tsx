import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sparkles, Dices, X, Flame, CloudRain, Smile, Ghost, Brain, Play } from "lucide-react";
import { useLang, localized } from "@/lib/i18n";
import { useAllMedia } from "@/lib/media-store";
import { pickForMood, pickRandom, type MoodKey } from "@/lib/moods";
import type { Media } from "@/lib/data";

const MOODS: { key: MoodKey; label: any; desc: any; icon: any; color: string }[] = [
  { key: "energetic", label: "moodEnergetic", desc: "moodEnergeticDesc", icon: Flame, color: "from-orange-500/30 to-red-500/10" },
  { key: "sad", label: "moodSad", desc: "moodSadDesc", icon: CloudRain, color: "from-blue-500/30 to-indigo-500/10" },
  { key: "happy", label: "moodHappy", desc: "moodHappyDesc", icon: Smile, color: "from-yellow-500/30 to-amber-500/10" },
  { key: "scared", label: "moodScared", desc: "moodScaredDesc", icon: Ghost, color: "from-purple-500/30 to-fuchsia-500/10" },
  { key: "think", label: "moodThink", desc: "moodThinkDesc", icon: Brain, color: "from-emerald-500/30 to-teal-500/10" },
];

export function DiscoverSection() {
  const { t, lang } = useLang();
  const media = useAllMedia();
  const navigate = useNavigate();
  const [moodOpen, setMoodOpen] = useState(false);
  const [result, setResult] = useState<Media | null>(null);
  const [rolling, setRolling] = useState(false);

  const handleSurprise = () => {
    setRolling(true);
    setTimeout(() => {
      const pick = pickRandom(media);
      setRolling(false);
      navigate({ to: "/watch/$id", params: { id: pick.id } });
    }, 700);
  };

  const chooseMood = (m: MoodKey) => {
    const pick = pickForMood(m, media);
    setResult(pick);
  };

  const closeMood = () => {
    setMoodOpen(false);
    setResult(null);
  };

  return (
    <section className="px-4 md:px-8 mt-6">
      <div className="mx-auto max-w-7xl grid gap-4 sm:grid-cols-2">
        {/* Smart Discovery */}
        <button
          onClick={() => setMoodOpen(true)}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 md:p-6 text-start transition hover:border-primary/40 hover:from-primary/10"
        >
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition" />
          <div className="flex items-center gap-4 rtl:flex-row-reverse">
            <div className="shrink-0 grid place-items-center h-12 w-12 rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:bg-primary/20 group-hover:ring-primary/40 transition">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="display text-xl md:text-2xl font-bold">{t("smartDiscover")}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t("smartDiscoverDesc")}</p>
            </div>
          </div>
        </button>

        {/* Surprise Me */}
        <button
          onClick={handleSurprise}
          disabled={rolling}
          className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-5 md:p-6 text-start transition hover:border-primary/40 hover:from-primary/10 disabled:opacity-70"
        >
          <div className="absolute -top-10 -left-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl opacity-0 group-hover:opacity-100 transition" />
          <div className="flex items-center gap-4 rtl:flex-row-reverse">
            <div className="shrink-0 grid place-items-center h-12 w-12 rounded-xl bg-white/5 ring-1 ring-white/10 group-hover:bg-primary/20 group-hover:ring-primary/40 transition">
              <Dices className={`h-6 w-6 text-primary ${rolling ? "animate-spin" : ""}`} />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="display text-xl md:text-2xl font-bold">{t("surpriseMe")}</h3>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t("surpriseMeDesc")}</p>
            </div>
          </div>
        </button>
      </div>

      {/* Mood modal */}
      {moodOpen && (
        <div
          className="fixed inset-0 z-[70] grid place-items-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in"
          onClick={closeMood}
        >
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-white/10 bg-neutral-950 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="display text-lg font-bold">{t("smartDiscover")}</h2>
              </div>
              <button
                onClick={closeMood}
                aria-label="Close"
                className="grid place-items-center h-9 w-9 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {!result ? (
              <div className="p-5 md:p-7">
                <h3 className="display text-center text-2xl md:text-3xl font-bold mb-5">
                  {t("howFeel")}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MOODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.key}
                        onClick={() => chooseMood(m.key)}
                        className={`group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br ${m.color} p-4 text-start transition hover:border-white/25 hover:scale-[1.02]`}
                      >
                        <div className="flex items-center gap-3 rtl:flex-row-reverse">
                          <div className="shrink-0 grid place-items-center h-11 w-11 rounded-lg bg-black/40 ring-1 ring-white/10">
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold">{t(m.label)}</div>
                            <div className="text-xs text-white/70 mt-0.5 line-clamp-2">{t(m.desc)}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="relative">
                <div
                  className="h-56 md:h-72 bg-cover bg-center"
                  style={{ backgroundImage: `url(${result.backdrop})` }}
                >
                  <div className="h-full w-full bg-gradient-to-t from-neutral-950 via-neutral-950/50 to-transparent" />
                </div>
                <div className="p-5 md:p-6 -mt-16 relative">
                  <div className="flex gap-4">
                    <img
                      src={result.poster}
                      alt=""
                      className="hidden sm:block w-24 md:w-32 aspect-[2/3] rounded-lg object-cover ring-1 ring-white/10 shadow-xl"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="display text-2xl md:text-3xl font-bold">
                        {localized(result, lang).title}
                      </h3>
                      <div className="mt-1 text-sm text-white/70">
                        ⭐ {result.rating.toFixed(1)} · {result.year} · {result.duration}
                      </div>
                      <p className="mt-2 text-sm text-white/80 line-clamp-3">
                        {localized(result, lang).overview}
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={() => {
                            closeMood();
                            navigate({ to: "/watch/$id", params: { id: result.id } });
                          }}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
                        >
                          <Play className="h-4 w-4 fill-current" /> {t("play")}
                        </button>
                        <button
                          onClick={() => setResult(null)}
                          className="inline-flex items-center gap-2 rounded-full bg-white/10 px-5 py-2 text-sm font-semibold hover:bg-white/15"
                        >
                          {t("pickAgain")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

export default DiscoverSection;
