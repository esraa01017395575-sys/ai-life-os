import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PomoTaskRef {
  id: string;
  title: string;
  workMin: number;
  breakMin: number;
}

interface PomodoroState {
  task: PomoTaskRef | null;
  phase: "work" | "break";
  secondsLeft: number;
  running: boolean;
  cycle: number;       // # of completed work pomodoros in this run
  floating: boolean;   // is the mini floating widget showing?
  soundOn: boolean;
}

interface PomoCtx extends PomodoroState {
  start: (task: PomoTaskRef) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  reset: () => void;
  setFloating: (v: boolean) => void;
  toggleSound: () => void;
}

const Ctx = createContext<PomoCtx | undefined>(undefined);
const SOUND_KEY = "ai-life-os-pomodoro-sound";

function playTone(kind: "tick" | "phase" | "done") {
  if (typeof window === "undefined") return;
  try {
    const C = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
    const ctx = new C();
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
    if (kind === "done") { make(523, 0, 0.16); make(659, 0.18, 0.16); make(784, 0.36, 0.32); }
    setTimeout(() => ctx.close().catch(() => {}), 1500);
  } catch { /* noop */ }
}

function notify(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window)) return;
  if (Notification.permission === "granted") {
    try { new Notification(title, { body }); } catch { /* noop */ }
  }
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [task, setTask] = useState<PomoTaskRef | null>(null);
  const [phase, setPhase] = useState<"work" | "break">("work");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [cycle, setCycle] = useState(0);
  const [floating, setFloating] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem(SOUND_KEY) !== "0";
  });
  const soundRef = useRef(soundOn); soundRef.current = soundOn;
  const taskRef = useRef(task); taskRef.current = task;
  const cycleRef = useRef(cycle); cycleRef.current = cycle;

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      const next = !v;
      try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch { /* noop */ }
      if (next) playTone("tick");
      return next;
    });
  }, []);

  const start = useCallback((t: PomoTaskRef) => {
    setTask(t);
    setPhase("work");
    setSecondsLeft(t.workMin * 60);
    setCycle(0);
    setRunning(true);
    setFloating(false);
    if (soundRef.current) playTone("tick");
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const pause = useCallback(() => setRunning(false), []);
  const resume = useCallback(() => setRunning(true), []);
  const reset = useCallback(() => {
    setRunning(false);
    setPhase("work");
    if (taskRef.current) setSecondsLeft(taskRef.current.workMin * 60);
  }, []);
  const stop = useCallback(() => {
    setRunning(false);
    setTask(null);
    setFloating(false);
    setPhase("work");
    setCycle(0);
  }, []);

  // Tick
  useEffect(() => {
    if (!running || !task) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s > 1) {
          if (s <= 4 && soundRef.current) playTone("tick");
          return s - 1;
        }
        // phase complete
        const cur = taskRef.current;
        if (!cur) return 0;
        if (phase === "work") {
          if (soundRef.current) playTone("done");
          notify("Focus complete", `Time for a break — ${cur.title}`);
          // log session
          if (user) {
            supabase.from("pomodoro_sessions").insert({
              user_id: user.id, task_id: cur.id, duration_min: cur.workMin, kind: "work",
              ended_at: new Date().toISOString(),
            }).then(() => {});
            supabase.rpc("add_xp" as any, { p_user_id: user.id, p_xp: 5 }).then(() => {});
          }
          const newCycle = cycleRef.current + 1;
          setCycle(newCycle);
          // 4th break is extended (15 for classic, 20 for deep work >= 50)
          const isDeep = cur.workMin >= 50;
          const extBreak = isDeep ? 20 : 15;
          const nextBreak = newCycle % 4 === 0 ? extBreak : cur.breakMin;
          setPhase("break");
          toast.success(`+5 XP · break ${nextBreak}m`);
          return nextBreak * 60;
        } else {
          if (soundRef.current) playTone("phase");
          notify("Break over", `Back to focus — ${cur.title}`);
          setPhase("work");
          return cur.workMin * 60;
        }
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, phase, task, user]);

  return (
    <Ctx.Provider value={{
      task, phase, secondsLeft, running, cycle, floating, soundOn,
      start, pause, resume, stop, reset, setFloating, toggleSound,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export function usePomodoro() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePomodoro must be used within PomodoroProvider");
  return c;
}

export function fmtTime(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}
