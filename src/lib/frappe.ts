/**
 * Frappe API client — shared with MTM mobile (same backend, same endpoints).
 * Uses fetch + token auth. Credentials stored in browser localStorage.
 */

const SITE = process.env.NEXT_PUBLIC_FRAPPE_SITE || "https://manytalentsmore.v.frappe.cloud";

export interface AuthCreds {
  siteUrl: string;
  apiKey: string;
  apiSecret: string;
}

const AUTH_KEY = "mtm_web_auth";

export function getAuth(): AuthCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setAuth(creds: AuthCreds) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(creds));
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
}

function getHeaders(): Record<string, string> {
  const creds = getAuth();
  if (!creds) throw new Error("Not authenticated");
  return {
    Authorization: `token ${creds.apiKey}:${creds.apiSecret}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function baseUrl(): string {
  const creds = getAuth();
  return (creds?.siteUrl || SITE).replace(/\/+$/, "");
}

/** Call a whitelisted Frappe method (POST) */
export async function callMethod<T = unknown>(
  method: string,
  data?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${baseUrl()}/api/method/${method}`, {
    method: "POST",
    headers: getHeaders(),
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.message as T;
}

/** Test connection with credentials (used for login) */
export async function testConnection(creds: AuthCreds): Promise<string> {
  const res = await fetch(`${creds.siteUrl.replace(/\/+$/, "")}/api/method/frappe.auth.get_logged_user`, {
    headers: {
      Authorization: `token ${creds.apiKey}:${creds.apiSecret}`,
    },
  });
  if (!res.ok) {
    throw new Error(`Auth failed: ${res.status}`);
  }
  const json = await res.json();
  return json.message || "Unknown user";
}

// ──────────────────────────────────────────────
// Typed API helpers — mirror the mobile app
// ──────────────────────────────────────────────

const API = "hcp_replacement.hcp_replacement.api.tech_utils";

export interface WorkflowCounts {
  finished: number;
  needs_checked: number;
  to_invoice: number;
  pending_payment: number;
  paid_today: number;
}

export async function getWorkflowCounts(): Promise<WorkflowCounts> {
  return await callMethod<WorkflowCounts>(`${API}.get_workflow_counts`);
}

export async function getJobsByStatus(statusKey: string) {
  return await callMethod(`${API}.get_jobs_by_status`, { status_key: statusKey });
}

export async function getJobList() {
  return await callMethod(`${API}.get_job_list`);
}

export async function getJobDetail(jobName: string) {
  return await callMethod(`${API}.get_job_detail`, { job_name: jobName });
}

export async function sendToCheck(jobName: string) {
  return await callMethod(`${API}.send_to_check`, { job_name: jobName });
}

export async function approveForInvoice(jobName: string) {
  return await callMethod(`${API}.approve_for_invoice`, { job_name: jobName });
}

export async function createInvoiceForJob(jobName: string, sendEmail: boolean = false) {
  return await callMethod(`${API}.create_invoice_for_job`, {
    job_name: jobName,
    send_email: sendEmail ? 1 : 0,
  });
}

export async function markInvoiced(jobName: string) {
  return await callMethod(`${API}.mark_invoiced`, { job_name: jobName });
}

export async function markPaid(jobName: string) {
  return await callMethod(`${API}.mark_paid`, { job_name: jobName });
}
