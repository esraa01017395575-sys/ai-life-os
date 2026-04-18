import { Link } from "@tanstack/react-router";
import { Bell, Calendar as CalIcon, Heart, Search, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { usePrefs } from "@/contexts/PrefsContext";
import { supabase } from "@/integrations/supabase/client";

export function Topbar() {
  const { user } = useAuth();
  const { t } = usePrefs();
  const [name, setName] = useState<string>("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [level, setLevel] = useState<number>(1);
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("name, avatar_url, level, total_xp").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setName(data.name ?? user.email?.split("@")[0] ?? "");
        setAvatar(data.avatar_url);
        setLevel(data.level ?? 1);
        setXp(data.total_xp ?? 0);
      });
    const ch = supabase.channel("topbar-profile")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles", filter: `user_id=eq.${user.id}` },
        (p) => {
          const r: any = p.new;
          setLevel(r.level ?? 1);
          setXp(r.total_xp ?? 0);
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <header className="h-16 px-6 flex items-center gap-4 border-b border-app bg-app-secondary/70 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex-1 max-w-md">
        <div className="relative group">
          <Search className="absolute ltr:left-3 rtl:right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-app-faint group-focus-within:text-accent transition-colors" />
          <input
            placeholder={t("search") || "Search..."}
            className="w-full h-10 ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 rounded-xl bg-app-card border border-app focus:border-accent focus:shadow-glow outline-none text-sm transition-all"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl gradient-cool animate-gradient text-white shadow-glow">
          <Sparkles className="h-4 w-4" />
          <span className="font-mono text-sm font-bold">L{level}</span>
          <span className="opacity-70">·</span>
          <span className="font-mono text-sm">{xp}</span>
          <span className="opacity-70 text-xs">{t("xp")}</span>
        </div>
        <Link to="/favorites" className="h-10 w-10 rounded-xl bg-app-card hover:bg-app-elevated flex items-center justify-center text-accent-3 hover-pop transition-all shadow-soft" aria-label={t("favorites")}>
          <Heart className="h-4 w-4" />
        </Link>
        <Link to="/tasks" search={{ view: "calendar" }} className="h-10 w-10 rounded-xl bg-app-card hover:bg-app-elevated flex items-center justify-center text-accent-5 hover-pop transition-all shadow-soft" aria-label="Calendar">
          <CalIcon className="h-4 w-4" />
        </Link>
        <button className="relative h-10 w-10 rounded-xl bg-app-card hover:bg-app-elevated flex items-center justify-center text-accent-2 hover-pop transition-all shadow-soft" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-accent-3 animate-pulse" />
        </button>
        <Link to="/settings" className="flex items-center gap-2 ltr:ml-1 rtl:mr-1">
          <div className="h-10 w-10 rounded-full gradient-hero animate-gradient p-[2px] shadow-glow">
            <div className="h-full w-full rounded-full bg-app-card flex items-center justify-center text-accent font-display font-bold overflow-hidden">
              {avatar ? <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" /> : name.slice(0,1).toUpperCase()}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}
