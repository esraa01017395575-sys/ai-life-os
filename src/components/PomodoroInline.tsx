import { Play, Pause, Square, Minimize2, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { fmtTime, usePomodoro, type PomoTaskRef } from "@/contexts/PomodoroContext";

interface Props {
  task: PomoTaskRef;
  presets?: Array<{ work: number; break: number; label: string }>;
}

const DEFAULT_PRESETS = [
  { work: 25, break: 5, label: "Classic 25/5" },
  { work: 50, break: 10, label: "Deep 50/10" },
];

/** Inline pomodoro that expands within a task card. */
export function PomodoroInline({ task, presets = DEFAULT_PRESETS }: Props) {
  const p = usePomodoro();
  const isThis = p.task?.id === task.id;
  const total = isThis ? (p.phase === "work" ? p.task!.workMin : p.task!.breakMin) * 60 : task.workMin * 60;
  const left = isThis ? p.secondsLeft : task.workMin * 60;
  const pct = ((total - left) / total) * 100;
  const C = 2 * Math.PI * 36;

  return (
    <div onClick={(e) => e.stopPropagation()}
      className="mt-3 rounded-2xl bg-app-secondary/60 border border-app p-4 animate-fade-in-up">
      <div className="flex items-center gap-4">
        {/* Arc */}
        <div className="relative h-20 w-20 shrink-0">
          <svg className="h-20 w-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" strokeWidth="5" />
            <circle
              cx="40" cy="40" r="36" fill="none"
              stroke={isThis && p.phase === "break" ? "var(--accent-2)" : "var(--accent)"}
              strokeWidth="5" strokeLinecap="round"
              strokeDasharray={`${(pct / 100) * C} ${C}`}
              style={{ transition: "stroke-dasharray 0.5s linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono font-semibold text-app text-base leading-none">{fmtTime(left)}</span>
            <span className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: isThis && p.phase === "break" ? "var(--accent-2)" : "var(--accent)" }}>
              {isThis ? p.phase : "ready"}
            </span>
          </div>
        </div>

        {/* Right column */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Presets */}
          {!isThis && (
            <div className="flex flex-wrap gap-1">
              {presets.map((pr) => (
                <button key={pr.label}
                  onClick={() => p.start({ id: task.id, title: task.title, workMin: pr.work, breakMin: pr.break })}
                  className="text-[10px] px-2 py-1 rounded-md bg-app-card border border-app text-app-muted hover:text-accent hover:border-accent/30 transition-colors">
                  {pr.label}
                </button>
              ))}
            </div>
          )}

          {isThis && (
            <div className="text-[10px] text-app-muted">
              Cycle {p.cycle + (p.phase === "work" ? 1 : 0)} · {p.task!.workMin}/{p.task!.breakMin}m
              {(p.cycle + 1) % 4 === 0 && p.phase === "work" && (
                <span className="ms-1 text-warning">long break next</span>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5 flex-wrap">
            {!isThis ? (
              <button
                onClick={() => p.start({ id: task.id, title: task.title, workMin: task.workMin, breakMin: task.breakMin })}
                className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90"
              >
                <Play className="h-3 w-3" /> Start
              </button>
            ) : (
              <>
                <button
                  onClick={p.running ? p.pause : p.resume}
                  className="h-8 px-3 rounded-lg bg-accent text-white text-xs font-semibold flex items-center gap-1.5 hover:opacity-90"
                >
                  {p.running ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Resume</>}
                </button>
                <button onClick={p.reset}
                  className="h-8 w-8 rounded-lg bg-app-card border border-app text-app-muted hover:text-app flex items-center justify-center" title="Reset">
                  <RotateCcw className="h-3 w-3" />
                </button>
                <button onClick={p.stop}
                  className="h-8 w-8 rounded-lg bg-app-card border border-app text-danger hover:bg-danger/10 flex items-center justify-center" title="Stop">
                  <Square className="h-3 w-3" />
                </button>
                <button onClick={() => p.setFloating(true)}
                  className="h-8 w-8 rounded-lg bg-app-card border border-app text-app-muted hover:text-accent flex items-center justify-center ms-auto" title="Minimize">
                  <Minimize2 className="h-3 w-3" />
                </button>
              </>
            )}
            <button onClick={p.toggleSound}
              className={`h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
                p.soundOn ? "bg-accent/10 text-accent border-accent/30" : "bg-app-card border-app text-app-muted hover:text-app"
              } ${isThis ? "" : "ms-auto"}`}
              title={p.soundOn ? "Mute" : "Unmute"}>
              {p.soundOn ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
