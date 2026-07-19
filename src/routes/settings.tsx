import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Palette, User, Check, LogOut, LogIn, Camera, Loader2, Trash2, History } from "lucide-react";
import { WatchHistory } from "@/components/WatchHistory";
import { useLang, type Lang } from "@/lib/i18n";
import { useTheme, THEMES } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useIsVip } from "@/lib/vip";
import { VipBadge, VipAvatarRing } from "@/components/VipBadge";
import type { Session } from "@supabase/supabase-js";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — Sebar Tv" },
      { name: "description", content: "Manage your Sebar Tv account, appearance, and language." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang } = useLang();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [displayName, setDisplayName] = useState<string>("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isVip = useIsVip(session?.user.id);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) {
        const { data: p } = await supabase
          .from("profiles").select("display_name, avatar_url")
          .eq("id", data.session.user.id).maybeSingle();
        setDisplayName(p?.display_name ?? data.session.user.email?.split("@")[0] ?? "");
        setAvatarUrl(
          p?.avatar_url
          ?? (data.session.user.user_metadata?.avatar_url as string | undefined)
          ?? (data.session.user.user_metadata?.picture as string | undefined)
          ?? null,
        );
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !session) return;
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Max 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${session.user.id}/avatar-${Date.now()}.${ext}`;
      const up = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signed.error || !signed.data) throw signed.error ?? new Error("signed url failed");
      const url = signed.data.signedUrl;
      const upd = await supabase.from("profiles").update({ avatar_url: url }).eq("id", session.user.id);
      if (upd.error) throw upd.error;
      setAvatarUrl(url);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onRemoveAvatar = async () => {
    if (!session) return;
    setUploading(true);
    try {
      await supabase.from("profiles").update({ avatar_url: null }).eq("id", session.user.id);
      setAvatarUrl(null);
    } finally {
      setUploading(false);
    }
  };


  const languages: Array<{ key: Lang; label: string }> = [
    { key: "en", label: t("english") },
    { key: "ku", label: t("kurdish") },
  ];

  return (
    <div className="min-h-screen pt-24 pb-16">
      <div className="mx-auto max-w-3xl px-4 md:px-6">
        <header className="mb-8">
          <h1 className="display text-4xl md:text-5xl font-bold">{t("settings")}</h1>
        </header>

        <SettingsSection
          icon={<User className="h-5 w-5" />}
          title={t("profile")}
          description={t("profileDesc")}
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <VipAvatarRing active={isVip} crown>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/50 text-primary-foreground text-xl font-semibold overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                  ) : session ? (
                    (displayName || session.user.email || "?").slice(0, 1).toUpperCase()
                  ) : (
                    <User className="h-6 w-6" />
                  )}
                </div>
              </VipAvatarRing>
              {session && (
                <button
                  type="button"
                  onClick={onPickFile}
                  disabled={uploading}
                  aria-label={t("changePhoto")}
                  className="absolute -bottom-1 -right-1 grid place-items-center h-7 w-7 rounded-full bg-primary text-primary-foreground shadow-md ring-2 ring-background hover:opacity-90 transition disabled:opacity-60"
                >
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={onFileChange}
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={cn("font-semibold truncate", isVip && "vip-name")}>
                  {session ? (displayName || t("user")) : t("guest")}
                </p>
                {isVip && <VipBadge size="sm" />}
              </div>
              <p className="text-sm text-muted-foreground truncate">{session?.user.email ?? "guest@kine.app"}</p>
              {session && avatarUrl && (
                <button
                  onClick={onRemoveAvatar}
                  disabled={uploading}
                  className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <Trash2 className="h-3 w-3" /> {t("removePhoto")}
                </button>
              )}
            </div>

            {session ? (
              <button
                onClick={signOut}
                className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent transition"
              >
                <LogOut className="h-4 w-4" /> {t("signOut")}
              </button>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium hover:opacity-90 transition"
              >
                <LogIn className="h-4 w-4" /> {t("signIn")}
              </Link>
            )}
          </div>
        </SettingsSection>

        {session && (
          <SettingsSection
            icon={<History className="h-5 w-5" />}
            title={t("watchHistory")}
            description={t("watchHistoryDesc")}
          >
            <WatchHistory userId={session.user.id} />
          </SettingsSection>
        )}


        <SettingsSection
          icon={<Palette className="h-5 w-5" />}
          title={t("theme")}
          description={t("themeDesc")}
        >
          <div className="flex flex-wrap gap-4">
            {THEMES.map((opt) => {
              const active = theme === opt.key;
              const name = lang === "ku" ? opt.labelKu : opt.label;
              return (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setTheme(opt.key)}
                  aria-pressed={active}
                  aria-label={name}
                  title={name}
                  className={cn(
                    "group relative h-14 w-14 rounded-full transition-transform active:scale-95",
                    "ring-offset-2 ring-offset-background",
                    active ? "ring-2 ring-primary scale-105" : "ring-1 ring-border hover:scale-105",
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${opt.swatch[0]}, ${opt.swatch[1]})`,
                  }}
                >
                  {active && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <Check className="h-5 w-5 text-white drop-shadow" />
                    </span>
                  )}
                  {/* Name tooltip on press / hover / focus */}
                  <span
                    className={cn(
                      "pointer-events-none absolute left-1/2 -translate-x-1/2 -bottom-9 whitespace-nowrap rounded-md bg-foreground text-background text-xs font-medium px-2 py-1 shadow-lg",
                      "opacity-0 scale-95 transition",
                      "group-hover:opacity-100 group-hover:scale-100",
                      "group-focus-visible:opacity-100 group-focus-visible:scale-100",
                      "group-active:opacity-100 group-active:scale-100",
                    )}
                  >
                    {name}
                  </span>
                </button>
              );
            })}
          </div>

        </SettingsSection>

        <SettingsSection
          icon={<span className="display text-base font-bold">A</span>}
          title={t("language")}
          description={t("langDesc")}
        >
          <div className="grid grid-cols-2 gap-3">
            {languages.map(({ key, label }) => {
              const active = lang === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setLang(key)}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4 transition",
                    active
                      ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                      : "border-border bg-card hover:bg-accent",
                  )}
                  aria-pressed={active}
                >
                  <span className="font-medium">{label}</span>
                  {active && <span className="text-xs text-primary font-semibold">✓</span>}
                </button>
              );
            })}
          </div>
        </SettingsSection>
      </div>
    </div>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-6 rounded-xl border border-border bg-card/60 p-5 md:p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
