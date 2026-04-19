import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";

interface PomodoroProps {
  workMin?: number;
  breakMin?: number;
  onComplete?: (minutes: number) => void;
  compact?: boolean;
}

const SOUND_KEY = "ai-life-os-pomodoro-sound";

/** Tiny tone generator — no assets, uses Web Audio API. */
function playTone(kind: "tick" | "phase" | "done") {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const make = (freq: number, start: number, dur: number, gain = 0.18) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);
      g.gain.setValueAtTime(0, now + start);
      g.gain.linearRampToValueAtTime(gain, now + start + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(now + start);
      osc.stop(now + start + dur + 0.05);
    };
    if (kind === "tick") make(880, 0, 0.08, 0.10);
    if (kind === "phase") { make(659, 0, 0.18); make(880, 0.18, 0.22); }
    if (kind === "done")  { make(523, 0, 0.16); make(659, 0.18, 0.16); make(784, 0.36, 0.32); }
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch { /* ignore */ }
}

export function Pomodoro({ workMin = 25, breakMin = 5, onComplete, compact = false }: PomodoroProps) {
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(workMin * 60);
  const [running, setRunning] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SOUND_KEY) !== "0";
  });
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  function toggleSound() {
    setSoundOn((v) => {
      const next = !v;
      try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* noop */ }
      if (next) playTone("tick");
      return next;
    });
  }

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (phase === "work") {
            if (soundOnRef.current) playTone("done");
            onComplete?.(workMin);
            setPhase("break");
            return breakMin * 60;
          } else {
            if (soundOnRef.current) playTone("phase");
            setPhase("work");
            setRunning(false);
            return workMin * 60;
          }
        }
        // soft tick on the last 3 seconds
        if (s <= 4 && s > 1 && soundOnRef.current) playTone("tick");
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
      <div className="flex items-center gap-2">
        <button
          onClick={() => { if (!running && soundOnRef.current) playTone("tick"); setRunning((r) => !r); }}
          className="px-4 h-9 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 flex items-center gap-1.5"
        >
          {running ? <><Pause className="h-3.5 w-3.5" /> Pause</> : <><Play className="h-3.5 w-3.5" /> Start</>}
        </button>
        <button
          onClick={() => { setRunning(false); setPhase("work"); setSecondsLeft(workMin * 60); }}
          className="px-3 h-9 rounded-lg bg-app-card border border-app text-sm hover:bg-app-elevated flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset
        </button>
        <button
          onClick={toggleSound}
          title={soundOn ? "Mute sounds" : "Enable sounds"}
          className={`h-9 w-9 rounded-lg border border-app flex items-center justify-center text-sm transition-colors ${
            soundOn ? "bg-accent/10 text-accent border-accent/30" : "bg-app-card text-app-muted hover:text-app"
          }`}
        >
          {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
