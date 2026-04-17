import { Link } from "@tanstack/react-router";
import { Bell, Calendar as CalIcon, Heart } from "lucide-react";
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
    <header className="h-16 px-6 flex items-center justify-between border-b border-app bg-app-secondary/50 backdrop-blur sticky top-0 z-30">
      <div className="flex-1" />
      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 px-3 h-9 rounded-lg bg-app-card border border-app text-sm">
          <span className="font-mono text-accent">L{level}</span>
          <span className="text-app-muted">·</span>
          <span className="font-mono text-app-muted">{xp} {t("xp")}</span>
        </div>
        <Link to="/favorites" className="h-9 w-9 rounded-lg bg-app-card hover:bg-app-elevated flex items-center justify-center text-app-muted hover:text-accent transition-colors" aria-label={t("favorites")}>
          <Heart className="h-4 w-4" />
        </Link>
        <Link to="/tasks" search={{ view: "calendar" }} className="h-9 w-9 rounded-lg bg-app-card hover:bg-app-elevated flex items-center justify-center text-app-muted hover:text-accent transition-colors" aria-label="Calendar">
          <CalIcon className="h-4 w-4" />
        </Link>
        <button className="h-9 w-9 rounded-lg bg-app-card hover:bg-app-elevated flex items-center justify-center text-app-muted hover:text-accent transition-colors" aria-label="Notifications">
          <Bell className="h-4 w-4" />
        </button>
        <Link to="/settings" className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-display font-bold">
            {avatar ? <img src={avatar} alt={name} className="h-full w-full rounded-full object-cover" /> : name.slice(0,1).toUpperCase()}
          </div>
        </Link>
      </div>
    </header>
  );
}
