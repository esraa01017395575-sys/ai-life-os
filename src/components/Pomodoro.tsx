import { useEffect, useState } from "react";

interface PomodoroProps {
  workMin?: number;
  breakMin?: number;
  onComplete?: (minutes: number) => void;
  compact?: boolean;
}

export function Pomodoro({ workMin = 25, breakMin = 5, onComplete, compact = false }: PomodoroProps) {
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (phase === "work") {
            onComplete?.(workMin);
            setPhase("break");
            return breakMin * 60;
          } else {
            setPhase("work");
            setRunning(false);
            return workMin * 60;
          }
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, workMin, breakMin, onComplete]);

  const mm = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const ss = (secondsLeft % 60).toString().padStart(2, "0");
  const total = (phase === "work" ? workMin : breakMin) * 60;
  const pct = ((total - secondsLeft) / total) * 100;

  return (
    <div className={compact ? "flex items-center gap-3" : "flex flex-col items-center gap-4"}>
      <div className="relative">
        <svg className={compact ? "h-16 w-16" : "h-32 w-32"} viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke="var(--accent)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${(pct / 100) * 283} 283`}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dasharray 0.5s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-semibold ${compact ? "text-sm" : "text-2xl"} text-app`}>
            {mm}:{ss}
          </span>
          {!compact && <span className="text-xs uppercase tracking-wider text-app-muted">{phase}</span>}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => setRunning((r) => !r)}
          className="px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90"
        >
          {running ? "Pause" : "Start"}
        </button>
        <button
          onClick={() => { setRunning(false); setPhase("work"); setSecondsLeft(workMin * 60); }}
          className="px-3 h-9 rounded-lg bg-app-card border border-app text-sm hover:bg-app-elevated"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
