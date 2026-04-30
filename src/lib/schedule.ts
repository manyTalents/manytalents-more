import { callMethod } from "@/lib/frappe";

const API = "hcp_replacement.hcp_replacement.api.schedule_utils";

export interface ScheduleTech {
  user_id: string;
  employee_name: string;
  truck_number: number;
  custom_van_warehouse: string;
}

export interface SchedulePuck {
  name: string;
  hcp_job_id: string;
  job_number: number;
  customer_name: string;
  address: string;
  town: string;
  job_type: string;
  status: string;
  scheduled_date: string | null;
  scheduled_start_time: string | null;
  scheduled_end_time: string | null;
  priority: string;
  assigned_techs: { tech_user: string; tech_name: string; role: string }[];
}

export interface TimeOffEntry {
  name: string;
  employee: string;
  employee_name: string;
  date: string;
  request_type: string;
  status: "Pending" | "Approved" | "Denied";
  reason?: string;
  requested_by?: string;
}

export interface ScheduleBoardData {
  techs: ScheduleTech[];
  jobs: SchedulePuck[];
  time_off: TimeOffEntry[];
  unscheduled: SchedulePuck[];
}

export async function fetchScheduleBoard(weekStart: string): Promise<ScheduleBoardData> {
  return callMethod<ScheduleBoardData>(`${API}.get_schedule_board`, { week_start: weekStart });
}

export async function updateJobSchedule(params: {
  job_name: string;
  scheduled_date?: string;
  start_time?: string;
  end_time?: string;
  tech_user?: string;
}) {
  return callMethod(`${API}.update_job_schedule`, params);
}

export async function createTimeOff(params: {
  employee: string;
  date: string;
  request_type?: string;
  reason?: string;
}) {
  return callMethod(`${API}.create_time_off`, params);
}

export async function approveTimeOff(requestName: string) {
  return callMethod(`${API}.approve_time_off`, { request_name: requestName });
}

export async function denyTimeOff(requestName: string) {
  return callMethod(`${API}.deny_time_off`, { request_name: requestName });
}

export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (hour > 12) return min > 0 ? `${hour - 12}:${m}` : `${hour - 12}`;
  return min > 0 ? `${hour}:${m}` : `${hour}`;
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  return `${formatTime(start)}\u2013${formatTime(end)}`;
}

export function getTrade(jobType: string | null): "plumbing" | "hvac" | "electrical" | "other" {
  if (!jobType) return "other";
  const lower = jobType.toLowerCase();
  if (lower.includes("hvac") || lower.includes("ac") || lower.includes("heat")) return "hvac";
  if (lower.includes("electric")) return "electrical";
  if (lower.includes("plumb")) return "plumbing";
  return "other";
}
