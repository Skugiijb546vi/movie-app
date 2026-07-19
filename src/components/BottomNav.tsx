import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Film, Tv, Languages, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIsVip } from "@/lib/vip";

export function BottomNav() {
  const { t } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUid(data.user?.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setUid(s?.user?.id ?? null));
    return () => sub.subscription.unsubscribe();
  }, []);
  const isVip = useIsVip(uid);

  const items: Array<{ to: string; key: "home" | "movies" | "series" | "dubbed" | "rooms"; icon: typeof Home }> = [
    { to: "/", key: "home", icon: Home },
    { to: "/movies", key: "movies", icon: Film },
    { to: "/series", key: "series", icon: Tv },
    { to: "/dubbed", key: "dubbed", icon: Languages },
    ...(isVip ? [{ to: "/rooms", key: "rooms" as const, icon: Users }] : []),
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed bottom-0 inset-x-0 z-50 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 px-3 pointer-events-none"
    >
      {/* Fade underlay so content behind is subtly veiled */}
      <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background via-background/70 to-transparent -z-10" />

      <div className="pointer-events-auto mx-auto flex max-w-md items-center justify-between gap-1 rounded-full border border-white/10 bg-card/60 backdrop-blur-2xl p-1.5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.7)]">
        {items.map(({ to, key, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group relative flex items-center justify-center gap-2 rounded-full h-10 overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
                active
                  ? "flex-[2.2] bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-[0_6px_20px_-6px_color-mix(in_oklab,var(--primary)_70%,transparent)] px-4"
                  : "flex-1 text-muted-foreground hover:text-foreground px-2",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform duration-500",
                  active ? "scale-110" : "group-hover:scale-110",
                )}
              />
              <span
                className={cn(
                  "text-[12px] font-semibold whitespace-nowrap transition-all duration-500",
                  active
                    ? "max-w-[120px] opacity-100 translate-x-0"
                    : "max-w-0 opacity-0 -translate-x-1",
                )}
              >
                {t(key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
