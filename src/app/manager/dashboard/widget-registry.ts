export interface WidgetConfig {
  id: string;
  title: string;
  component: string;
  defaultWidth: "half" | "full" | "third";
}

export const WIDGET_CATALOG: WidgetConfig[] = [
  { id: "job-revenue", title: "Job Revenue", component: "JobRevenueWidget", defaultWidth: "half" },
  { id: "job-count", title: "Job Count", component: "JobCountWidget", defaultWidth: "half" },
  { id: "team-leaderboard", title: "Team Leaderboard", component: "TeamLeaderboardWidget", defaultWidth: "half" },
  { id: "ar-aging", title: "A/R Aging", component: "ARAgingWidget", defaultWidth: "full" },
  { id: "needs-check", title: "Needs Check", component: "NeedsCheckWidget", defaultWidth: "half" },
  { id: "need-estimate", title: "Need Estimate", component: "NeedEstimateWidget", defaultWidth: "half" },
];

export type RolePreset = "office" | "operations" | "owner";

export const ROLE_PRESETS: Record<RolePreset, string[]> = {
  office: ["job-count", "needs-check", "ar-aging"],
  operations: ["job-revenue", "team-leaderboard", "need-estimate", "ar-aging"],
  owner: ["job-revenue", "ar-aging", "team-leaderboard"],
};

const STORAGE_KEY = "mtm_dashboard_layout";

export function loadLayout(role: RolePreset): string[] {
  if (typeof window === "undefined") return ROLE_PRESETS[role];
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return ROLE_PRESETS[role];
}

export function saveLayout(widgetIds: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(widgetIds));
}
