import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, MessageSquare, Target, ListTodo, Repeat2, StickyNote, Heart, Settings, Sparkles } from "lucide-react";
import { usePrefs } from "@/contexts/PrefsContext";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", icon: LayoutDashboard, key: "dashboard" as const, color: "var(--accent)" },
  { to: "/chat",      icon: MessageSquare,   key: "chat" as const,      color: "var(--accent)" },
  { to: "/plans",     icon: Target,          key: "plans" as const,     color: "var(--accent)" },
  { to: "/tasks",     icon: ListTodo,        key: "tasks" as const,     color: "var(--accent)" },
  { to: "/habits",    icon: Repeat2,         key: "habits" as const,    color: "var(--accent)" },
  { to: "/notes",     icon: StickyNote,      key: "notes" as const,     color: "var(--accent)" },
];

export function Sidebar() {
  const { t } = usePrefs();
  const loc = useLocation();

  return (
    <aside
      className="group/sidebar fixed inset-y-0 z-40 flex flex-col bg-app-secondary border-app
        ltr:left-0 ltr:border-r rtl:right-0 rtl:border-l
        w-[64px] hover:w-[240px] transition-[width] duration-300 overflow-hidden"
    >
      <div className="h-16 flex items-center gap-3 px-3 shrink-0">
        <div className="h-10 w-10 rounded-xl gradient-hero animate-gradient flex items-center justify-center shadow-glow shrink-0 hover-wiggle">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="font-display font-bold text-lg text-app whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-opacity">
          AI Life <span className="text-gradient">OS</span>
        </span>
      </div>

      <nav className="flex-1 px-2 py-2 space-y-1.5">
        {items.map(({ to, icon: Icon, key, color }) => {
          const active = loc.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex items-center gap-3 px-2.5 h-11 rounded-xl text-sm transition-all duration-200 whitespace-nowrap group/item",
                active
                  ? "bg-app-card text-app shadow-soft"
                  : "text-app-muted hover:text-app hover:bg-app-card/60",
              )}
            >
              {active && (
                <span
                  className="absolute ltr:left-0 rtl:right-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-full"
                  style={{ background: color }}
                />
              )}
              <span
                className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover/item:scale-110"
                style={{
                  background: active ? color : "transparent",
                  color: active ? "#fff" : color,
                  boxShadow: active ? `0 4px 14px ${color}55` : "none",
                }}
              >
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity flex-1 font-medium">{t(key)}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 pb-3 border-t border-app pt-2 space-y-1">
        <Link
          to="/favorites"
          className="flex items-center gap-3 px-2.5 h-10 rounded-xl text-sm text-app-muted hover:text-app hover:bg-app-card/60 whitespace-nowrap transition-colors"
        >
          <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-accent-3">
            <Heart className="h-4.5 w-4.5" />
          </span>
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity">{t("favorites")}</span>
        </Link>
        <Link
          to="/settings"
          className="flex items-center gap-3 px-2.5 h-10 rounded-xl text-sm text-app-muted hover:text-app hover:bg-app-card/60 whitespace-nowrap transition-colors"
        >
          <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 text-app-faint">
            <Settings className="h-4.5 w-4.5" />
          </span>
          <span className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity">{t("settings")}</span>
        </Link>
      </div>
    </aside>
  );
}
