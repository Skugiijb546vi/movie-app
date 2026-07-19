import { Link, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Settings as SettingsIcon, User, MessageCircle } from "lucide-react";
import { useLang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { SearchModal } from "@/components/SearchModal";
import { supabase } from "@/integrations/supabase/client";
import { useIsVip } from "@/lib/vip";
import { VipAvatarRing } from "@/components/VipBadge";
import type { Session } from "@supabase/supabase-js";

export function Navbar() {
  const { t } = useLang();
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVip = useIsVip(session?.user.id);


  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancel = false;
    const load = async (s: Session | null) => {
      if (!s) { setAvatarUrl(null); return; }
      const { data: p } = await supabase
        .from("profiles").select("avatar_url")
        .eq("id", s.user.id).maybeSingle();
      if (cancel) return;
      setAvatarUrl(
        p?.avatar_url
        ?? (s.user.user_metadata?.avatar_url as string | undefined)
        ?? (s.user.user_metadata?.picture as string | undefined)
        ?? null,
      );
    };
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); load(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); load(s); });
    return () => { cancel = true; sub.subscription.unsubscribe(); };
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-colors duration-300",
        scrolled ? "bg-background/85 backdrop-blur-md border-b border-white/5" : "bg-gradient-to-b from-background to-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-8 px-4 md:px-10">
        <Link to="/" className="flex items-center gap-2">
          <span className="display text-2xl md:text-3xl font-bold text-primary tracking-widest">
            {t("brand")}
          </span>
        </Link>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            aria-label={t("search")}
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-full hover:bg-foreground/10 text-foreground/80 hover:text-foreground transition"
          >
            <Search className="h-5 w-5" />
          </button>
          <Link
            to="/chat"
            aria-label={t("chat")}
            className={cn(
              "p-2 rounded-full hover:bg-foreground/10 transition",
              pathname === "/chat" ? "text-foreground" : "text-foreground/80",
            )}
          >
            <MessageCircle className="h-5 w-5" />
          </Link>
          <Link
            to="/settings"
            aria-label={t("settings")}
            className={cn(
              "p-2 rounded-full hover:bg-foreground/10 transition",
              pathname === "/settings" ? "text-foreground" : "text-foreground/80",
            )}
          >
            <SettingsIcon className="h-5 w-5" />
          </Link>
          <Link
            to="/settings"
            aria-label={t("profile")}
            className="relative inline-flex"
          >
            <VipAvatarRing active={isVip} crown={isVip} size="sm">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold text-sm overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-4 w-4" />
                )}
              </span>
            </VipAvatarRing>
          </Link>
        </div>
      </div>
      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
    </header>
  );
}

