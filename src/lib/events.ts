/**
 * Event tracker types, API client, and real-time connection.
 */

import { callMethod } from "./frappe";

export type EventType =
  | "job_status" | "clock" | "receipt" | "ocr" | "dispatch"
  | "hcp_sync" | "material" | "cron" | "api_error" | "login";

export type EventCategory = "Business" | "System";
export type EventSeverity = "info" | "success" | "warning" | "error";

export interface MTMEvent {
  name: string;
  event_type: EventType;
  category: EventCategory;
  severity: EventSeverity;
  title: string;
  detail: string;
  tech_name: string;
  job: string;
  job_id: string;
  source: string;
  timestamp: string;
}

export interface EventsResponse {
  events: MTMEvent[];
  total_count: number;
  has_more: boolean;
}

export interface EventFilters {
  category?: EventCategory;
  event_type?: string;
  severity?: string;
  tech?: string;
  job?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  page_size?: number;
}

const API = "hcp_replacement.hcp_replacement.api.events";

export async function fetchRecentEvents(limit = 20, category?: EventCategory): Promise<MTMEvent[]> {
  return await callMethod<MTMEvent[]>(`${API}.get_recent_events`, {
    limit, ...(category ? { category } : {}),
  });
}

export async function fetchEvents(filters: EventFilters): Promise<EventsResponse> {
  return await callMethod<EventsResponse>(`${API}.get_events`, filters as Record<string, unknown>);
}

export async function fetchEventStats(): Promise<{ last_hour: number }> {
  return await callMethod<{ last_hour: number }>(`${API}.get_event_stats`);
}

export function connectEventPolling(
  onEvents: (events: MTMEvent[]) => void,
  intervalMs = 5000,
  category?: EventCategory,
): { disconnect: () => void } {
  let lastTimestamp = new Date().toISOString();
  const poll = async () => {
    try {
      const events = await fetchRecentEvents(10, category);
      const fresh = events.filter((e) => e.timestamp > lastTimestamp);
      if (fresh.length > 0) {
        onEvents(fresh.reverse());
        lastTimestamp = events[0].timestamp;
      }
    } catch { /* ignore */ }
  };
  const id = setInterval(poll, intervalMs);
  return { disconnect: () => clearInterval(id) };
}

export const SEVERITY_COLORS: Record<EventSeverity, { border: string; bg: string }> = {
  success: { border: "#28a745", bg: "#f8fff8" },
  info:    { border: "#2196F3", bg: "#f5f9ff" },
  warning: { border: "#E67E22", bg: "#fffbf5" },
  error:   { border: "#dc3545", bg: "#fff5f5" },
};

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  job_status: "Job Status",
  clock:      "Clock In/Out",
  receipt:    "Receipt",
  ocr:        "OCR",
  dispatch:   "Dispatch",
  hcp_sync:   "HCP Sync",
  material:   "Materials",
  cron:       "Cron Task",
  api_error:  "API Error",
  login:      "Login",
};

export function relativeTime(timestamp: string): string {
  const diff = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
