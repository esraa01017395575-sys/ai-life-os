import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, Target, ListTodo, Repeat2, StickyNote, Heart, Settings, Sparkles } from "lucide-react";
import { usePrefs } from "@/contexts/PrefsContext";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, key: "dashboard" as const },
  { to: "/chat", icon: MessageSquare, key: "chat" as const },
  { to: "/plans", icon: Target, key: "plans" as const },
  { to: "/tasks", icon: ListTodo, key: "tasks" as const },
  { to: "/habits", icon: Repeat2, key: "habits" as const },
  { to: "/notes", icon: StickyNote, key: "notes" as const },
];

export function Sidebar() {
  const { t } = usePrefs();
  const loc = useLocation();

  return (
    <aside
      className="group/sidebar fixed inset-y-0 z-40 flex flex-col bg-app-secondary border-app
        ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l
        w-[48px] hover:w-[220px] transition-[width] duration-200 overflow-hidden"
    >
      <div className="h-16 flex items-center gap-3 px-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-accent flex items-center justify-center accent-glow shrink-0">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <span className="font-display font-bold text-lg text-app whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
          AI Life OS
        </span>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-1">
        {items.map(({ to, icon: Icon, key }) => {
          const active = loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-2 h-10 rounded-lg text-sm transition-colors whitespace-nowrap",
                active
                  ? "bg-app-card text-app accent-glow"
                  : "text-app-muted hover:text-app hover:bg-app-card",
              )}
            >
              <Icon className={cn("h-5 w-5 shrink-0", active && "text-accent")} />
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity">{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-3 border-t border-app pt-2 space-y-1">
        <Link
          to="/favorites"
          className="flex items-center gap-3 px-2 h-10 rounded-lg text-sm text-app-muted hover:text-app hover:bg-app-card whitespace-nowrap"
        >
          <Heart className="h-5 w-5 shrink-0" />
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity">{t("favorites")}</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 px-2 h-10 rounded-lg text-sm text-app-muted hover:text-app hover:bg-app-card whitespace-nowrap"
        >
          <Settings className="h-5 w-5 shrink-0" />
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity">{t("settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
