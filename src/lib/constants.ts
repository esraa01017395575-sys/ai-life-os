export const APP_NAME = "AI Life OS";

export const TASK_STATUSES = ["draft", "todo", "doing", "done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_STATUS_LABEL: Record<TaskStatus, { en: string; ar: string }> = {
  draft: { en: "Draft", ar: "مسودة" },
  todo: { en: "To Do", ar: "قائمة" },
  doing: { en: "Doing", ar: "قيد التنفيذ" },
  done: { en: "Done", ar: "مكتمل" },
};

export const PRIORITIES = ["low", "medium", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const HABIT_FREQUENCIES = ["daily", "weekly", "custom"] as const;

export const PLAN_SCOPES = ["monthly", "quarterly", "yearly"] as const;

export const POMODORO_PRESETS = [
  { work: 25, break: 5, label: "25/5 Classic" },
  { work: 50, break: 10, label: "50/10 Deep" },
  { work: 15, break: 3, label: "15/3 Sprint" },
];

export const THEMES = ["midnight", "aurora", "solar"] as const;
export type Theme = (typeof THEMES)[number];

export const XP_PER_LEVEL = 100;

export const SECTION_COLORS = [
  "#7C5CFC", "#00C896", "#F5A623", "#FF5C7A",
  "#4DA3FF", "#FF8FB1", "#9B82FF", "#FFC75A",
];
