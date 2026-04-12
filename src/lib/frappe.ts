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

// ──────────────────────────────────────────────
// Magic-link login (auth_utils)
// ──────────────────────────────────────────────

const AUTH_API = "hcp_replacement.hcp_replacement.api.auth_utils";

/** Extract a human-readable error from a Frappe error response */
function parseFrappeError(json: any, fallback: string): string {
  try {
    if (json?._server_messages) {
      const msgs = JSON.parse(json._server_messages);
      if (msgs?.[0]) {
        const first = typeof msgs[0] === "string" ? JSON.parse(msgs[0]) : msgs[0];
        if (first?.message) return String(first.message).replace(/<[^>]*>/g, "");
      }
    }
  } catch {}
  if (json?.exception) return String(json.exception);
  if (json?.message && typeof json.message === "string") return json.message;
  return fallback;
}

/** Call a guest endpoint (no auth required) — used for invite redemption */
async function callGuestMethod<T = unknown>(
  method: string,
  data?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${SITE.replace(/\/+$/, "")}/api/method/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`API ${method} returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(parseFrappeError(json, `API ${method} failed (${res.status})`));
  }
  return json.message as T;
}

export interface RedeemInviteResponse {
  api_key: string;
  api_secret: string;
  site_url: string;
  user_email: string;
  full_name?: string;
}

/** Redeem a magic-link token → returns fresh API credentials */
export async function redeemInvite(token: string): Promise<RedeemInviteResponse> {
  return await callGuestMethod<RedeemInviteResponse>(`${AUTH_API}.redeem_invite`, { token });
}

export interface RequestLoginLinkResponse {
  sent: boolean;
  message: string;
  admin_fallback_url?: string;
}

/** Self-service: request a login link be emailed to an office user */
export async function requestLoginLink(email: string): Promise<RequestLoginLinkResponse> {
  return await callGuestMethod<RequestLoginLinkResponse>(`${AUTH_API}.request_login_link`, {
    email,
  });
}

export interface CreateInviteResponse {
  invite_url: string;
  expires_at: string;
  email_sent: boolean;
}

/** Admin-only: generate a magic-link URL for a user */
export async function createInvite(
  userEmail: string,
  sendEmail: boolean = false
): Promise<CreateInviteResponse> {
  return await callMethod<CreateInviteResponse>(`${AUTH_API}.create_invite`, {
    user_email: userEmail,
    send_email: sendEmail ? 1 : 0,
  });
}

export interface OnboardNewUserResponse extends CreateInviteResponse {
  user_created: boolean;
  user_email: string;
  role_assigned: string;
}

/** Admin-only: create a new Frappe User + generate magic-link invite in one call */
export async function onboardNewUser(params: {
  email: string;
  fullName: string;
  role: "MTM Office" | "Accounts Manager" | "System Manager";
  sendEmail?: boolean;
}): Promise<OnboardNewUserResponse> {
  return await callMethod<OnboardNewUserResponse>(`${AUTH_API}.onboard_new_user`, {
    email: params.email,
    full_name: params.fullName,
    role: params.role,
    send_email: params.sendEmail ? 1 : 0,
  });
}

/** Check if current logged-in user has an office role (for admin page access) */
export async function checkOfficeAccess(): Promise<{ is_office: boolean; is_admin: boolean; user: string }> {
  return await callMethod(`${AUTH_API}.check_office_access`);
}

// ──────────────────────────────────────────────
// Access Approvers management
// ──────────────────────────────────────────────

export interface Approver {
  user_email: string;
  display_name: string;
  added_on: string;
  added_by: string;
}

/** List current access-request approvers (office role required) */
export async function listApprovers(): Promise<Approver[]> {
  return await callMethod<Approver[]>(`${AUTH_API}.list_approvers`);
}

/** Add a user to the approvers list (System Manager only) */
export async function addApprover(userEmail: string): Promise<{ added: boolean; user_email: string }> {
  return await callMethod(`${AUTH_API}.add_approver`, { user_email: userEmail });
}

/** Remove a user from the approvers list (System Manager only) */
export async function removeApprover(userEmail: string): Promise<{ removed: boolean; user_email: string }> {
  return await callMethod(`${AUTH_API}.remove_approver`, { user_email: userEmail });
}

// ──────────────────────────────────────────────
// Access Requests
// ──────────────────────────────────────────────

export interface SubmitAccessRequestResponse {
  submitted: boolean;
  message: string;
}

/** Public: submit an access request (guest, no auth) */
export async function submitAccessRequest(params: {
  name: string;
  email: string;
  role?: string;
  note?: string;
}): Promise<SubmitAccessRequestResponse> {
  return await callGuestMethod<SubmitAccessRequestResponse>(
    `${AUTH_API}.submit_access_request`,
    { name: params.name, email: params.email, role: params.role || "MTM Office", note: params.note || "" }
  );
}

export interface AccessRequestInfo {
  name: string;
  requester_name: string;
  requester_email: string;
  requested_role: string;
  note: string;
  status: string;
  requested_at: string;
}

/** Public: load an access request by approver token (for the approve page) */
export async function getAccessRequestByToken(token: string): Promise<AccessRequestInfo> {
  return await callGuestMethod<AccessRequestInfo>(`${AUTH_API}.get_access_request_by_token`, { token });
}

export interface ApproveRequestResponse {
  approved: boolean;
  user_email: string;
  role_assigned: string;
  invite_url: string;
  email_sent: boolean;
}

/** Approve an access request (guest via token, or session via request_id) */
export async function approveAccessRequest(params: {
  token?: string;
  requestId?: string;
  role?: string;
}): Promise<ApproveRequestResponse> {
  return await callGuestMethod<ApproveRequestResponse>(`${AUTH_API}.approve_access_request`, {
    token: params.token || "",
    request_id: params.requestId || "",
    role: params.role || "",
  });
}

export interface DenyRequestResponse {
  denied: boolean;
  requester_email: string;
}

/** Deny an access request (guest via token, or session via request_id) */
export async function denyAccessRequest(params: {
  token?: string;
  requestId?: string;
  reason?: string;
}): Promise<DenyRequestResponse> {
  return await callGuestMethod<DenyRequestResponse>(`${AUTH_API}.deny_access_request`, {
    token: params.token || "",
    request_id: params.requestId || "",
    reason: params.reason || "",
  });
}

export interface AccessRequestListItem extends AccessRequestInfo {
  approved_by?: string;
  approved_at?: string;
  denied_by?: string;
  denied_at?: string;
  denial_reason?: string;
}

/** List access requests by status (office role required) */
export async function listAccessRequests(status: string = "Pending"): Promise<AccessRequestListItem[]> {
  return await callMethod<AccessRequestListItem[]>(`${AUTH_API}.list_access_requests`, { status });
}
