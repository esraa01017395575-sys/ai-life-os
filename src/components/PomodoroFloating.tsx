import { Play, Pause, X, Maximize2, Volume2, VolumeX } from "lucide-react";
import { fmtTime, usePomodoro } from "@/contexts/PomodoroContext";

export function PomodoroFloating() {
  const p = usePomodoro();
  if (!p.task || !p.floating) return null;
  const total = (p.phase === "work" ? p.task.workMin : p.task.breakMin) * 60;
  const pct = ((total - p.secondsLeft) / total) * 100;
  const C = 2 * Math.PI * 22;

  return (
    <div className="fixed bottom-6 ltr:right-6 rtl:left-6 z-[60] animate-fade-in-up">
      <div className="bg-app-card border border-app rounded-2xl shadow-elevated p-3 flex items-center gap-3 min-w-[260px]">
        <div className="relative h-12 w-12 shrink-0">
          <svg className="h-12 w-12 -rotate-90" viewBox="0 0 50 50">
            <circle cx="25" cy="25" r="22" fill="none" stroke="var(--border)" strokeWidth="3" />
            <circle
              cx="25" cy="25" r="22" fill="none"
              stroke={p.phase === "work" ? "var(--accent)" : "var(--accent-2)"}
              strokeWidth="3" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * C} ${C}`}
              style={{ transition: "stroke-dasharray 0.5s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-semibold text-app">
            {fmtTime(p.secondsLeft)}
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: p.phase === "work" ? "var(--accent)" : "var(--accent-2)" }}>
            {p.phase === "work" ? "Focus" : "Break"} · #{p.cycle + (p.phase === "work" ? 1 : 0)}
          </div>
          <div className="text-xs font-medium text-app truncate">{p.task.title}</div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={p.toggleSound} title="Sound"
            className={`h-8 w-8 rounded-lg flex items-center justify-center transition-colors ${p.soundOn ? "text-accent hover:bg-accent/10" : "text-app-muted hover:bg-app-secondary"}`}>
            {p.soundOn ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
          </button>
          <button onClick={p.running ? p.pause : p.resume}
            className="h-8 w-8 rounded-lg bg-accent text-white hover:opacity-90 flex items-center justify-center">
            {p.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button onClick={() => p.setFloating(false)} title="Expand"
            className="h-8 w-8 rounded-lg hover:bg-app-secondary text-app-muted flex items-center justify-center">
            <Maximize2 className="h-3.5 w-3.5" />
          </button>
          <button onClick={p.stop} title="Stop"
            className="h-8 w-8 rounded-lg hover:bg-danger/10 text-danger flex items-center justify-center">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
