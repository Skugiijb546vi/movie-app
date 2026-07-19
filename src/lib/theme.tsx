import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "crimson" | "gold" | "ocean" | "emerald" | "violet" | "rose";

export const THEMES: Array<{
  key: Theme;
  label: string;
  labelKu: string;
  swatch: [string, string];
}> = [
  { key: "crimson", label: "Crimson", labelKu: "سووری تۆخ", swatch: ["#e11d2e", "#7a0f18"] },
  { key: "gold",    label: "Cinema Gold", labelKu: "زێڕی سینەما", swatch: ["#f5b301", "#8a5a00"] },
  { key: "ocean",   label: "Ocean Blue", labelKu: "شینی دەریا", swatch: ["#2b7fff", "#0b3d91"] },
  { key: "emerald", label: "Emerald", labelKu: "زمروودی", swatch: ["#10b981", "#065f46"] },
  { key: "violet",  label: "Royal Violet", labelKu: "مۆری شاهانە", swatch: ["#8b5cf6", "#4c1d95"] },
  { key: "rose",    label: "Rose Noir", labelKu: "گوڵی تاریک", swatch: ["#f43f5e", "#881337"] },
];

type Ctx = {
  theme: Theme;
  setTheme: (t: Theme) => void;
};

const ThemeCtx = createContext<Ctx | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("crimson");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("theme")) as Theme | null;
    if (stored && THEMES.some((t) => t.key === stored)) setThemeState(stored);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    // Always dark base for the cinematic look
    root.classList.add("dark");
    root.setAttribute("data-theme", theme);
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("theme", t); } catch {}
  };

  return <ThemeCtx.Provider value={{ theme, setTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeCtx);
  if (!ctx) throw new Error("useTheme must be inside ThemeProvider");
  return ctx;
}
