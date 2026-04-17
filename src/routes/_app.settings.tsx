import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";
import { THEMES, type Theme } from "@/lib/constants";
import type { Lang } from "@/lib/i18n";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({ component: SettingsPage });

function SettingsPage() {
  const { user, signOut } = useAuth();
  const { theme, mode, lang, setTheme, setMode, setLang, t } = usePrefs();
  const [name, setName] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setName(data?.name ?? user.email?.split("@")[0] ?? ""));
  }, [user]);

  async function saveName() {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ name }).eq("user_id", user.id);
    if (error) toast.error(error.message); else toast.success("Saved");
  }

  async function logout() {
    await signOut();
    window.location.href = "/auth";
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-3xl font-display font-bold">{t("settings")}</h1>

      <section className="glass-card p-5 space-y-3">
        <div className="flex items-center gap-2 text-sm font-display font-semibold">
          <UserIcon className="h-4 w-4 text-accent" /> {t("profile")}
        </div>
        <div>
          <label className="text-xs text-app-muted">{t("name")}</label>
          <div className="flex gap-2 mt-1">
            <input value={name} onChange={(e) => setName(e.target.value)}
              className="flex-1 h-10 px-3 rounded-lg bg-app-elevated border border-app text-app outline-none focus:border-accent" />
            <button onClick={saveName} className="h-10 px-3 rounded-lg bg-accent text-white text-sm">{t("save")}</button>
          </div>
        </div>
        <div>
          <label className="text-xs text-app-muted">{t("email")}</label>
          <div className="text-sm text-app mt-1">{user?.email}</div>
        </div>
      </section>

      <section className="glass-card p-5 space-y-4">
        <div className="text-sm font-display font-semibold">{t("theme")}</div>
        <div className="grid grid-cols-3 gap-2">
          {THEMES.map((th) => (
            <button key={th} onClick={() => setTheme(th as Theme)}
              className={`h-16 rounded-lg border-2 capitalize flex items-center justify-center font-medium ${theme === th ? "border-accent text-accent bg-accent/10" : "border-app text-app-muted hover:border-app-strong"}`}>
              {th}
            </button>
          ))}
        </div>
        <div className="text-sm font-display font-semibold">{t("mode")}</div>
        <div className="grid grid-cols-2 gap-2">
          {(["dark", "light"] as const).map((m) => (
            <button key={m} onClick={() => setMode(m)}
              className={`h-10 rounded-lg border-2 capitalize ${mode === m ? "border-accent text-accent bg-accent/10" : "border-app text-app-muted hover:border-app-strong"}`}>
              {t(m)}
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card p-5 space-y-3">
        <div className="text-sm font-display font-semibold">{t("language")}</div>
        <div className="grid grid-cols-2 gap-2">
          {(["en", "ar"] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              className={`h-10 rounded-lg border-2 ${lang === l ? "border-accent text-accent bg-accent/10" : "border-app text-app-muted hover:border-app-strong"}`}>
              {l === "en" ? t("english") : t("arabic")}
            </button>
          ))}
        </div>
      </section>

      <button onClick={logout} className="w-full h-11 rounded-lg bg-danger/10 text-danger border border-danger/30 flex items-center justify-center gap-2 hover:bg-danger/20">
        <LogOut className="h-4 w-4" /> {t("logout")}
      </button>
    </div>
  );
}
