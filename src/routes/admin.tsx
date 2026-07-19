import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Shield, LogIn, Crown, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { VipBadge } from "@/components/VipBadge";
import { cn } from "@/lib/utils";
import type { MediaKind } from "@/lib/data";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Sebar Tv" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminPage,
});

type Row = {
  id: string;
  kind: string;
  title: string;
  title_ku: string;
  overview: string;
  overview_ku: string;
  year: number;
  rating: number;
  duration: string;
  genres: string[];
  genres_ku: string[];
  poster: string;
  backdrop: string;
  video_url: string;
  featured: boolean;
  seasons: number | null;
};

const emptyForm: Row = {
  id: "",
  kind: "movie",
  title: "",
  title_ku: "",
  overview: "",
  overview_ku: "",
  year: new Date().getFullYear(),
  rating: 0,
  duration: "",
  genres: [],
  genres_ku: [],
  poster: "",
  backdrop: "",
  video_url: "",
  featured: false,
  seasons: null,
};

function AdminPage() {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [filter, setFilter] = useState<MediaKind | "all">("all");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await checkAdmin(data.session.user.id);
      else setChecking(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      if (s) await checkAdmin(s.user.id);
      else {
        setIsAdmin(false);
        setChecking(false);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const checkAdmin = async (uid: string) => {
    setChecking(true);
    // Try to bootstrap first admin
    await supabase.rpc("claim_admin_if_none");
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
    setChecking(false);
  };

  const loadRows = async () => {
    const { data } = await supabase.from("media").select("*").order("created_at", { ascending: false });
    if (data) setRows(data as any);
  };

  useEffect(() => {
    if (isAdmin) loadRows();
  }, [isAdmin]);

  const signIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/admin` },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const save = async () => {
    if (!editing) return;
    if (!editing.id || !editing.title) {
      toast.error("ID و ناو پێویستە");
      return;
    }
    const payload = { ...editing, rating: Number(editing.rating), year: Number(editing.year) };
    const { error } = await supabase.from("media").upsert(payload);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("پاشەکەوت کرا");
    setEditing(null);
    loadRows();
  };

  const remove = async (id: string) => {
    if (!confirm("دڵنیایت؟")) return;
    const { error } = await supabase.from("media").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("سڕایەوە");
      loadRows();
    }
  };

  if (checking) {
    return <div className="min-h-screen pt-24 text-center text-muted-foreground">…</div>;
  }

  if (!session) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="max-w-sm w-full text-center space-y-4 rounded-2xl border border-white/10 bg-black/40 p-8">
          <Shield className="h-10 w-10 mx-auto text-primary" />
          <h1 className="display text-2xl font-bold">Admin Panel</h1>
          <p className="text-sm text-muted-foreground">پێویستە بچیتە ژوورەوە بۆ دەستپێگەیشتن</p>
          <button onClick={signIn} className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-primary text-primary-foreground py-2.5 font-medium">
            <LogIn className="h-4 w-4" /> Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen pt-24 px-4 flex items-center justify-center">
        <div className="max-w-sm w-full text-center space-y-4 rounded-2xl border border-white/10 bg-black/40 p-8">
          <Shield className="h-10 w-10 mx-auto text-destructive" />
          <h1 className="display text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">هەژمارەکەت ڕۆڵی ئەدمین نییە</p>
          <button onClick={signOut} className="text-sm text-primary underline">Sign out</button>
        </div>
      </div>
    );
  }

  const filtered = filter === "all" ? rows : rows.filter((r) => r.kind === filter);

  return (
    <div className="min-h-screen pt-20 pb-24 px-4 md:px-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <div>
          <h1 className="display text-2xl md:text-3xl font-bold">Admin Panel</h1>
          <p className="text-xs text-muted-foreground mt-1">بەڕێوەبردنی فیلم، زنجیرە و دۆبلاژ</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing({ ...emptyForm, id: `m-${Date.now()}` })}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-2 text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> نوێ
          </button>
          <button onClick={signOut} className="text-xs text-muted-foreground hover:text-foreground">Sign out</button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {(["all", "movie", "series", "dubbed"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setFilter(k)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border ${
              filter === k ? "bg-primary text-primary-foreground border-primary" : "bg-white/5 border-white/10 hover:bg-white/10"
            }`}
          >
            {k === "all" ? "هەموو" : k === "movie" ? "فیلم" : k === "series" ? "زنجیرە" : "دۆبلاژ"}
          </button>
        ))}
      </div>

      <div className="grid gap-2">
        {filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-10 border border-dashed border-white/10 rounded-xl">
            هیچ بەرهەمێک نییە
          </div>
        )}
        {filtered.map((r) => (
          <div key={r.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
            <img src={r.poster || "https://via.placeholder.com/60x90"} alt="" className="h-16 w-11 rounded object-cover bg-white/5" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs rounded-full bg-white/10 px-2 py-0.5">{r.kind}</span>
                {r.featured && <span className="text-xs rounded-full bg-primary/20 text-primary px-2 py-0.5">Featured</span>}
              </div>
              <div className="mt-1 font-semibold truncate">{r.title}</div>
              <div className="text-xs text-muted-foreground truncate">{r.title_ku} · {r.year} · ★{r.rating}</div>
            </div>
            <button onClick={() => setEditing(r)} className="p-2 rounded-lg hover:bg-white/10"><Pencil className="h-4 w-4" /></button>
            <button onClick={() => remove(r.id)} className="p-2 rounded-lg hover:bg-destructive/20 text-destructive"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>

      {editing && <EditModal form={editing} onChange={setEditing} onClose={() => setEditing(null)} onSave={save} />}

      <VipManager />
    </div>
  );
}

function VipManager() {
  type Prof = { id: string; display_name: string | null; avatar_url: string | null };
  const [profiles, setProfiles] = useState<Prof[]>([]);
  const [vipIds, setVipIds] = useState<Set<string>>(new Set());
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: profs }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("id, display_name, avatar_url").order("display_name", { ascending: true }),
      supabase.from("user_roles").select("user_id").eq("role", "vip" as any),
    ]);
    setProfiles((profs ?? []) as any);
    setVipIds(new Set((roles ?? []).map((r: any) => r.user_id)));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const toggle = async (userId: string) => {
    setBusy(userId);
    const isVip = vipIds.has(userId);
    try {
      if (isVip) {
        const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "vip" as any);
        if (error) throw error;
        setVipIds((s) => { const n = new Set(s); n.delete(userId); return n; });
        toast.success("VIP لابرا");
      } else {
        const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "vip" as any });
        if (error) throw error;
        setVipIds((s) => new Set(s).add(userId));
        toast.success("بوو بە VIP ✨");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "هەڵە");
    } finally {
      setBusy(null);
    }
  };

  const filtered = profiles.filter((p) => {
    if (!q.trim()) return true;
    const s = (p.display_name ?? "") + " " + p.id;
    return s.toLowerCase().includes(q.toLowerCase());
  });

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-3">
        <Crown className="h-5 w-5" style={{ color: "#f5b301" }} />
        <h2 className="display text-xl font-bold">بەڕێوەبردنی VIP</h2>
        <span className="text-xs text-muted-foreground">({vipIds.size} VIP)</span>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="گەڕان بۆ بەکارهێنەر…"
          className="w-full rounded-lg bg-white/5 border border-white/10 pl-9 pr-3 py-2 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid gap-2">
        {loading && <div className="text-sm text-muted-foreground py-6 text-center">…</div>}
        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-muted-foreground py-6 border border-dashed border-white/10 rounded-xl">
            هیچ بەکارهێنەرێک نەدۆزرایەوە
          </div>
        )}
        {filtered.map((p) => {
          const isVip = vipIds.has(p.id);
          return (
            <div
              key={p.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 transition",
                isVip
                  ? "border-[color:rgba(245,179,1,0.55)] bg-[color:rgba(245,179,1,0.06)]"
                  : "border-white/10 bg-black/30",
              )}
            >
              <div className="h-10 w-10 rounded-full bg-white/10 overflow-hidden flex items-center justify-center text-sm font-semibold shrink-0">
                {p.avatar_url ? (
                  <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  (p.display_name ?? "?").slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={cn("font-medium truncate", isVip && "vip-name")}>
                    {p.display_name ?? "بێ ناو"}
                  </span>
                  {isVip && <VipBadge size="xs" />}
                </div>
                <div className="text-[10px] text-muted-foreground truncate font-mono">{p.id}</div>
              </div>
              <button
                onClick={() => toggle(p.id)}
                disabled={busy === p.id}
                className={cn(
                  "text-xs font-semibold rounded-full px-3 py-1.5 border transition disabled:opacity-50",
                  isVip
                    ? "border-white/20 hover:bg-white/10"
                    : "vip-badge border-transparent",
                )}
              >
                {isVip ? "لابردن" : "کردنی VIP"}
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function EditModal({
  form,
  onChange,
  onClose,
  onSave,
}: {
  form: Row;
  onChange: (r: Row) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const set = (k: keyof Row, v: any) => onChange({ ...form, [k]: v });
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-background border border-white/10 rounded-2xl w-full max-w-2xl my-8">
        <div className="flex items-center justify-between p-4 border-b border-white/10 sticky top-0 bg-background rounded-t-2xl">
          <h2 className="display text-lg font-bold">{form.id.startsWith("m-") ? "زیادکردن" : "دەستکاری"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 grid gap-3 md:grid-cols-2">
          <Field label="ID (unique)">
            <input value={form.id} onChange={(e) => set("id", e.target.value)} className={input} placeholder="dune-3" />
          </Field>
          <Field label="جۆر">
            <select value={form.kind} onChange={(e) => set("kind", e.target.value)} className={input}>
              <option value="movie">فیلم</option>
              <option value="series">زنجیرە</option>
              <option value="dubbed">دۆبلاژ</option>
            </select>
          </Field>
          <Field label="Title (EN)">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={input} />
          </Field>
          <Field label="ناو (کوردی)">
            <input value={form.title_ku} onChange={(e) => set("title_ku", e.target.value)} className={input} dir="rtl" />
          </Field>
          <Field label="Overview (EN)" full>
            <textarea value={form.overview} onChange={(e) => set("overview", e.target.value)} className={input} rows={2} />
          </Field>
          <Field label="پوختە (کوردی)" full>
            <textarea value={form.overview_ku} onChange={(e) => set("overview_ku", e.target.value)} className={input} rows={2} dir="rtl" />
          </Field>
          <Field label="ساڵ">
            <input type="number" value={form.year} onChange={(e) => set("year", +e.target.value)} className={input} />
          </Field>
          <Field label="پلە (0-10)">
            <input type="number" step="0.1" value={form.rating} onChange={(e) => set("rating", +e.target.value)} className={input} />
          </Field>
          <Field label="ماوە">
            <input value={form.duration} onChange={(e) => set("duration", e.target.value)} className={input} placeholder="2h 15m" />
          </Field>
          <Field label="وەرزەکان (بۆ زنجیرە)">
            <input type="number" value={form.seasons ?? ""} onChange={(e) => set("seasons", e.target.value ? +e.target.value : null)} className={input} />
          </Field>
          <Field label="Genres (comma-separated)" full>
            <input
              value={form.genres.join(", ")}
              onChange={(e) => set("genres", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
              className={input}
              placeholder="Action, Drama"
            />
          </Field>
          <Field label="جۆرەکان (کوردی، جیاکراوە بە ,)" full>
            <input
              value={form.genres_ku.join(", ")}
              onChange={(e) => set("genres_ku", e.target.value.split(",").map((x) => x.trim()).filter(Boolean))}
              className={input}
              dir="rtl"
              placeholder="ئاکشن, دراما"
            />
          </Field>
          <Field label="Poster URL (portrait)" full>
            <input value={form.poster} onChange={(e) => set("poster", e.target.value)} className={input} />
          </Field>
          <Field label="Backdrop URL (wide)" full>
            <input value={form.backdrop} onChange={(e) => set("backdrop", e.target.value)} className={input} />
          </Field>
          <Field label="Video URL (mp4)" full>
            <input value={form.video_url} onChange={(e) => set("video_url", e.target.value)} className={input} />
          </Field>
          <Field label="Featured" full>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.featured} onChange={(e) => set("featured", e.target.checked)} />
              نیشاندان لە پەڕەی سەرەکی
            </label>
          </Field>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t border-white/10 sticky bottom-0 bg-background rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border border-white/10 px-4 py-2 text-sm">پاشگەزبوونەوە</button>
          <button onClick={onSave} className="inline-flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">
            <Save className="h-4 w-4" /> پاشەکەوت
          </button>
        </div>
      </div>
    </div>
  );
}

const input = "w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-primary/60";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={`block ${full ? "md:col-span-2" : ""}`}>
      <span className="block text-xs text-muted-foreground mb-1">{label}</span>
      {children}
    </label>
  );
}
