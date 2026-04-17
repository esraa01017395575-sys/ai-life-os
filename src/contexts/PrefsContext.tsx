import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import type { Theme } from "@/lib/constants";
import type { Lang } from "@/lib/i18n";
import { t as translate, type TranslationKey } from "@/lib/i18n";

interface PrefsCtx {
  theme: Theme;
  mode: "dark" | "light";
  lang: Lang;
  setTheme: (t: Theme) => void;
  setMode: (m: "dark" | "light") => void;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
}

const PrefsContext = createContext<PrefsCtx | undefined>(undefined);

const LS_KEY = "ai-life-os-prefs";

function applyToDocument(theme: Theme, mode: "dark" | "light", lang: Lang) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (mode === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
  } else {
    root.classList.add("light");
    root.classList.remove("dark");
  }
  root.setAttribute("dir", lang === "ar" ? "rtl" : "ltr");
  root.setAttribute("lang", lang);
}

export function PrefsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>("midnight");
  const [mode, setModeState] = useState<"dark" | "light">("dark");
  const [lang, setLangState] = useState<Lang>("en");

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p.theme) setThemeState(p.theme);
        if (p.mode) setModeState(p.mode);
        if (p.lang) setLangState(p.lang);
        applyToDocument(p.theme ?? "midnight", p.mode ?? "dark", p.lang ?? "en");
      } else {
        applyToDocument("midnight", "dark", "en");
      }
    } catch {
      applyToDocument("midnight", "dark", "en");
    }
  }, []);

  // Sync from profile when user logs in
  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("theme, mode, language").eq("user_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      const newTheme = (data.theme as Theme) ?? "midnight";
      const newMode = (data.mode as "dark" | "light") ?? "dark";
      const newLang = (data.language as Lang) ?? "en";
      setThemeState(newTheme);
      setModeState(newMode);
      setLangState(newLang);
      applyToDocument(newTheme, newMode, newLang);
    });
  }, [user]);

  // Apply + persist on changes
  useEffect(() => {
    applyToDocument(theme, mode, lang);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ theme, mode, lang }));
    } catch {}
  }, [theme, mode, lang]);

  const persist = (patch: Record<string, string>) => {
    if (!user) return;
    supabase.from("profiles").update(patch).eq("user_id", user.id).then(() => {});
  };

  const setTheme = (t: Theme) => { setThemeState(t); persist({ theme: t }); };
  const setMode = (m: "dark" | "light") => { setModeState(m); persist({ mode: m }); };
  const setLang = (l: Lang) => { setLangState(l); persist({ language: l }); };

  return (
    <PrefsContext.Provider value={{ theme, mode, lang, setTheme, setMode, setLang, t: (k) => translate(lang, k) }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("usePrefs must be used within PrefsProvider");
  return ctx;
}
