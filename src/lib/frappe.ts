/**
 * Frappe API client — shared with MTM mobile (same backend, same endpoints).
 * Uses fetch + token auth. Credentials stored in browser localStorage.
 */

const SITE = process.env.NEXT_PUBLIC_FRAPPE_SITE || "https://erp.manytalentsmore.com";

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

export async function getManagerJobs(params: {
  mode?: "active" | "all";
  search?: string;
  status_filter?: string;
  page_length?: number;
  page?: number;
}) {
  return await callMethod(`${API}.get_job_list`, params);
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

export async function revertStatus(jobName: string, targetStatus: string) {
  return await callMethod(`${API}.revert_status`, { job_name: jobName, target_status: targetStatus });
}

/** Set a job's status directly (forward moves like Finish/Unschedule). Backend validates + role-gates office-only statuses. */
export async function updateJobStatus(jobName: string, status: string) {
  return await callMethod(`${API}.update_job_status`, { job_name: jobName, status });
}

export async function addJobNote(jobName: string, noteText: string) {
  return await callMethod(`${API}.add_job_note`, { job_name: jobName, note_text: noteText });
}

/** Revert status AND add a note explaining why */
export async function revertWithNote(jobName: string, targetStatus: string, note: string) {
  if (note.trim()) {
    await addJobNote(jobName, `Sent back to ${targetStatus}: ${note.trim()}`);
  }
  return await revertStatus(jobName, targetStatus);
}

// ──────────────────────────────────────────────
// Job Intake & Labor/Service Management
// ──────────────────────────────────────────────

export async function getDefaultLaborRate(): Promise<{ rate: number; labor_item: string }> {
  return await callMethod(`${API}.get_default_labor_rate`);
}

export async function createJob(params: {
  customer_name: string;
  address?: string;
  town?: string;
  customer_phone?: string;
  description?: string;
  scheduled_date?: string;
  job_type?: string;
  priority?: string;
  is_estimate?: boolean;
  occupant_name?: string;
  occupant_phone?: string;
  is_vacant?: boolean;
  keycode?: string;
  labor_hours?: number;
  labor_rate?: number;
  labor_description?: string;
}): Promise<unknown> {
  return await callMethod(`${API}.create_job`, {
    ...params,
    is_estimate: params.is_estimate ? 1 : 0,
    is_vacant: params.is_vacant ? 1 : 0,
  } as Record<string, unknown>);
}

export async function updateJobServices(
  jobName: string,
  services: Array<{ description: string; qty: number; rate: number }>
): Promise<unknown> {
  return await callMethod(`${API}.update_job_services`, {
    job_name: jobName,
    services: JSON.stringify(services),
  });
}

export async function saveJobField(jobName: string, field: string, value: string): Promise<unknown> {
  return callMethod(`${API}.save_job_field`, { job_name: jobName, field, value });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe search returns untyped records
export async function searchCustomers(query: string): Promise<any[]> {
  return await callMethod(`${API}.search_customers`, { query });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe history returns untyped records
export async function getCustomerHistory(customerName: string): Promise<any> {
  return await callMethod(`${API}.get_customer_history`, { customer_name: customerName });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Frappe search returns untyped records
export async function searchAddresses(query: string): Promise<any[]> {
  return await callMethod(`${API}.search_addresses`, { query });
}

// ──────────────────────────────────────────────
// Magic-link login (auth_utils)
// ──────────────────────────────────────────────

const AUTH_API = "hcp_replacement.hcp_replacement.api.auth_utils";

/** Extract a human-readable error from a Frappe error response */
function parseFrappeError(json: unknown, fallback: string): string {
  const j = json as Record<string, unknown>;
  try {
    if (j?._server_messages) {
      const msgs = JSON.parse(j._server_messages as string);
      if (msgs?.[0]) {
        const first = typeof msgs[0] === "string" ? JSON.parse(msgs[0]) : msgs[0];
        if (first?.message) return String(first.message).replace(/<[^>]*>/g, "");
      }
    }
  } catch {}
  if (j?.exception) return String(j.exception);
  if (j?.message && typeof j.message === "string") return j.message;
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
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`API ${method} returned non-JSON (${res.status})`);
  }
  if (!res.ok) {
    throw new Error(parseFrappeError(json, `API ${method} failed (${res.status})`));
  }
  return (json as Record<string, unknown>).message as T;
}

export interface RedeemInviteResponse {
  api_key: string;
  api_secret: string;
  site_url: string;
  user_email: string;
  full_name?: string;
}

/** Email + password login → returns API credentials */
export async function requestPasswordReset(email: string): Promise<{ sent: boolean; message: string }> {
  return await callGuestMethod<{ sent: boolean; message: string }>(`${AUTH_API}.request_password_reset`, { email });
}

export async function loginWithPassword(email: string, password: string): Promise<RedeemInviteResponse> {
  return await callGuestMethod<RedeemInviteResponse>(`${AUTH_API}.login_with_password`, { email, password });
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
// Tech Onboarding
// ──────────────────────────────────────────────

export interface OnboardTechResponse {
  user_email: string;
  full_name: string;
  api_key: string;
  api_secret: string;
  user_created: boolean;
  van_warehouse: string;
  site_url: string;
}

export async function onboardTech(params: {
  email: string;
  fullName: string;
  vanWarehouse?: string;
  phone?: string;
  designation?: string;
  emergencyName?: string;
  emergencyPhone?: string;
}): Promise<OnboardTechResponse> {
  return await callMethod<OnboardTechResponse>(`${AUTH_API}.onboard_tech`, {
    email: params.email,
    full_name: params.fullName,
    van_warehouse: params.vanWarehouse || "",
    phone: params.phone || "",
    designation: params.designation || "",
    emergency_name: params.emergencyName || "",
    emergency_phone: params.emergencyPhone || "",
  });
}

export interface TechListItem {
  employee: string;
  name: string;
  email: string;
  van: string;
  has_app_access: boolean;
}

export async function listTechs(): Promise<TechListItem[]> {
  return await callMethod<TechListItem[]>(`${AUTH_API}.list_techs`);
}

/** Assign a tech (by user email) to an existing job. */
export async function assignTech(
  jobName: string,
  techUser: string,
  role: "Lead Tech" | "Helper" = "Lead Tech"
): Promise<{ status: string }> {
  return await callMethod(`${API}.assign_tech`, {
    job_name: jobName,
    tech_user: techUser,
    role,
  });
}

/** Unassign a tech (by user email) from a job. */
export async function unassignTech(
  jobName: string,
  techUser: string
): Promise<{ status: string }> {
  return await callMethod(`${API}.unassign_tech`, {
    job_name: jobName,
    tech_user: techUser,
  });
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

/** Approve an access request. Requires an authenticated office-role session (F-3). */
export async function approveAccessRequest(params: {
  token?: string;
  requestId?: string;
  role?: string;
}): Promise<ApproveRequestResponse> {
  return await callMethod<ApproveRequestResponse>(`${AUTH_API}.approve_access_request`, {
    token: params.token || "",
    request_id: params.requestId || "",
    role: params.role || "",
  });
}

export interface DenyRequestResponse {
  denied: boolean;
  requester_email: string;
}

/** Deny an access request. Requires an authenticated office-role session (F-3). */
export async function denyAccessRequest(params: {
  token?: string;
  requestId?: string;
  reason?: string;
}): Promise<DenyRequestResponse> {
  return await callMethod<DenyRequestResponse>(`${AUTH_API}.deny_access_request`, {
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

// ──────────────────────────────────────────────
// Pricebook & Pricing
// ──────────────────────────────────────────────

const PRICING_API = "hcp_replacement.hcp_replacement.api.pricing";

export interface PricebookItem {
  item_code: string;
  item_name: string;
  item_group: string;
  cost: number;
  valuation_rate: number;
  last_purchase_rate: number;
  standard_rate: number;
  custom_selling_price: number;
  custom_markup_pct: number;
  computed_selling_price: number;
  pricing_source: "exact" | "item_%" | "global_%" | "standard_rate" | "cost";
}

export interface PricebookResponse {
  items: PricebookItem[];
  total: number;
  page: number;
  page_size: number;
  global_markup_pct: number;
}

export interface UpdatePricingResponse {
  item_code: string;
  custom_selling_price: number;
  custom_markup_pct: number;
  computed_selling_price: number;
  pricing_source: string;
}

export async function getPricebookList(
  search: string = "",
  page: number = 1,
  pageSize: number = 50
): Promise<PricebookResponse> {
  return await callMethod<PricebookResponse>(`${PRICING_API}.get_pricebook_list`, {
    search,
    page,
    page_size: pageSize,
  });
}

export async function updateItemPricing(
  itemCode: string,
  sellingPrice?: number | null,
  markupPct?: number | null
): Promise<UpdatePricingResponse> {
  const data: Record<string, unknown> = { item_code: itemCode };
  if (sellingPrice !== undefined && sellingPrice !== null) data.selling_price = sellingPrice;
  if (markupPct !== undefined && markupPct !== null) data.markup_pct = markupPct;
  return await callMethod<UpdatePricingResponse>(`${PRICING_API}.update_item_pricing`, data);
}

export async function bulkUpdateMarkup(
  itemCodes: string[],
  markupPct: number
): Promise<{ updated: number; markup_pct: number }> {
  return await callMethod(`${PRICING_API}.bulk_update_markup`, {
    item_codes: JSON.stringify(itemCodes),
    markup_pct: markupPct,
  });
}

export async function updateGlobalMarkup(
  markupPct: number
): Promise<{ materials_markup_pct: number }> {
  return await callMethod(`${PRICING_API}.update_global_markup`, {
    markup_pct: markupPct,
  });
}

// ──────────────────────────────────────────────
// Global Search
// ──────────────────────────────────────────────

export interface SearchResult {
  job_name: string;
  hcp_job_id: string;
  customer_name: string;
  address: string;
  town: string;
  status: string;
  scheduled_date: string;
  total_job_cost: number;
  match_field: "job_number" | "customer" | "address" | "town" | "description" | "tech" | "other";
}

export async function globalSearch(query: string): Promise<SearchResult[]> {
  if (!query || query.trim().length < 2) return [];
  return await callMethod<SearchResult[]>(`${API}.global_search`, { query: query.trim() });
}

// ── Dashboard Stats ──────────────────────────────────────

const DASHBOARD_API = "hcp_replacement.hcp_replacement.api.dashboard_stats";

export async function getJobStats(weeks = 10) {
  return callMethod<{
    weeks: { label: string; revenue: number; count: number; avg: number }[];
    totals: { revenue: number; count: number; avg: number };
  }>(`${DASHBOARD_API}.get_job_stats`, { weeks });
}

export async function getTeamStats(period = "weekly") {
  return callMethod<{
    techs: { name: string; initials: string; revenue: number; job_count: number; hours_clocked: number; hours_billable: number }[];
    period: { start: string; end: string };
  }>(`${DASHBOARD_API}.get_team_stats`, { period });
}

export async function getRecentJobImages(limit = 20) {
  return callMethod<{
    images: { url: string; job_name: string; job_id: string; uploaded_at: string }[];
  }>(`${DASHBOARD_API}.get_recent_job_images`, { limit });
}

export async function getJobsNeedingEstimate() {
  return callMethod<{
    jobs: { name: string; hcp_job_id: string; customer_name: string; address: string; status: string; modified: string }[];
    count: number;
  }>(`${DASHBOARD_API}.get_jobs_needing_estimate`);
}

// ── A/R Aging ────────────────────────────────────────────

const AR_API = "hcp_replacement.hcp_replacement.api.ar_aging";

export interface ARInvoice {
  name: string;
  customer: string;
  amount: number;
  days: number;
  status: string;
  last_resend: string;
  resend_count: number;
  colour: string;
}

export interface ARBucket {
  label: string;
  count: number;
  total: number;
  invoices: ARInvoice[];
}

export async function getARAging() {
  return callMethod<{
    buckets: ARBucket[];
    summary: { total_outstanding: number; total_count: number };
  }>(`${AR_API}.get_ar_aging`);
}

export async function sendInvoice(invoiceName: string, sendEmail = true) {
  return callMethod<{ status: string; sent_at: string }>(
    `${AR_API}.send_invoice`,
    { invoice_name: invoiceName, send_email: sendEmail ? 1 : 0 }
  );
}

export async function resendInvoice(invoiceName: string) {
  return callMethod<{ status: string; resend_count: number; resent_at: string }>(
    `${AR_API}.resend_invoice`,
    { invoice_name: invoiceName }
  );
}

// ── Customers ─────────────────────────────────────────────

const CUSTOMERS_API = "hcp_replacement.hcp_replacement.api.customers";

export interface CustomerListItem {
  name: string;
  customer_name: string;
  phone: string;
  address_count: number;
  total_owed: number;
  lifetime_value: number;
  last_job_date: string;
  job_count: number;
}

export interface CustomerListResponse {
  customers: CustomerListItem[];
  total_count: number;
  has_more: boolean;
}

export async function getCustomerList(
  query = "",
  page = 1,
  pageSize = 30
): Promise<CustomerListResponse> {
  return callMethod<CustomerListResponse>(`${CUSTOMERS_API}.get_customer_list`, {
    query,
    page,
    page_size: pageSize,
  });
}

export interface CustomerAddress {
  name: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface CustomerJob {
  name: string;
  hcp_job_id: string;
  address: string;
  status: string;
  total_job_cost: number;
  modified: string;
}

export interface CustomerProfile {
  name: string;
  customer_name: string;
  phone: string;
  email: string;
  creation: string;
  addresses: CustomerAddress[];
  jobs: CustomerJob[];
  total_owed: number;
  lifetime_value: number;
  upcoming_jobs: { name: string; hcp_job_id: string; address: string; status: string }[];
}

export async function getCustomerProfile(customer: string): Promise<CustomerProfile> {
  return callMethod<CustomerProfile>(`${CUSTOMERS_API}.get_customer_profile`, { customer });
}

// ── Estimates ─────────────────────────────────────────────

const ESTIMATES_API = "hcp_replacement.hcp_replacement.api.estimates";

export interface EstimateLineItem {
  description: string;
  qty: number;
  rate: number;
  amount: number;
}

export interface EstimateOption {
  name: string;
  option_index: number;
  name_label: string;
  description: string;
  total_price: number;
  status: string;
  financing_available: number;
  line_items: EstimateLineItem[];
}

export interface EstimateSummary {
  name: string;
  estimate_number: string;
  customer: string;
  customer_name: string;
  status: string;
  linked_job: string;
  total: number;
  created: string;
}

export interface EstimateDetail {
  name: string;
  estimate_number: string;
  customer: string;
  customer_name: string;
  address: string;
  linked_job: string;
  linked_job_id: string;
  status: string;
  approval_mode: string;
  sent_at: string | null;
  notes: string;
  options: EstimateOption[];
}

export async function getEstimateList(statusFilter = "all", page = 1, pageSize = 30) {
  return callMethod<{ estimates: EstimateSummary[]; total_count: number; has_more: boolean }>(
    `${ESTIMATES_API}.get_estimate_list`, { status_filter: statusFilter, page, page_size: pageSize }
  );
}

export async function getEstimateDetail(estimateName: string) {
  return callMethod<EstimateDetail>(`${ESTIMATES_API}.get_estimate_detail`, { estimate_name: estimateName });
}

export async function createEstimate(params: {
  customer: string; address: string; linked_job?: string;
  options_json: string; approval_mode?: string; notes?: string;
}) {
  return callMethod<{ name: string; estimate_number: string }>(`${ESTIMATES_API}.create_estimate`, params);
}

export async function sendEstimate(estimateName: string) {
  return callMethod<{ status: string; email_sent: boolean }>(`${ESTIMATES_API}.send_estimate`, { estimate_name: estimateName });
}

export async function approveEstimateOption(token: string, optionIdx: number, action: "approve" | "decline") {
  return callGuestMethod<{ status: string; estimate_status: string; option_status: string }>(
    `${ESTIMATES_API}.approve_estimate_option`, { token, option_idx: optionIdx, action }
  );
}

export async function expireEstimate(estimateName: string) {
  return callMethod<{ status: string }>(`${ESTIMATES_API}.expire_estimate`, { estimate_name: estimateName });
}

// ── Service Plans ─────────────────────────────────────────

const PLANS_API = "hcp_replacement.hcp_replacement.api.service_plans";

export interface PlanTemplate {
  name: string;
  name_label: string;
  trade: string;
  price: number;
  service_interval_months: number;
  visits_per_year: number;
  billing_cadence: string;
}

export interface PlanInstance {
  name: string;
  template_name: string;
  customer_name: string;
  address: string;
  status: string;
  price: number;
  next_service_date: string;
}

export interface PlanDetail {
  name: string;
  template: string;
  template_name: string;
  customer: string;
  customer_name: string;
  address: string;
  status: string;
  price: number;
  next_service_date: string;
  last_service_date: string;
  approved_at: string | null;
  checklist: { item_text: string; required: number }[];
  trade: string;
  service_interval_months: number;
  visits_per_year: number;
}

export async function getPlanTemplates() {
  return callMethod<{ templates: PlanTemplate[] }>(`${PLANS_API}.get_plan_templates`);
}

export async function getPlansList(statusFilter = "all", page = 1, pageSize = 30) {
  return callMethod<{ plans: PlanInstance[]; total_count: number; has_more: boolean }>(
    `${PLANS_API}.get_plans_list`,
    { status_filter: statusFilter, page, page_size: pageSize }
  );
}

export async function getPlanDetail(planName: string) {
  return callMethod<PlanDetail>(`${PLANS_API}.get_plan_detail`, { plan_name: planName });
}

export async function createPlanInstance(template: string, customer: string, address: string) {
  return callMethod<{ name: string }>(`${PLANS_API}.create_plan_instance`, { template, customer, address });
}

export async function sendPlan(planName: string) {
  return callMethod<{ status: string; email_sent: boolean }>(`${PLANS_API}.send_plan`, { plan_name: planName });
}

export async function approvePlan(token: string) {
  return callGuestMethod<{ status: string }>(`${PLANS_API}.approve_plan`, { token });
}

export async function declinePlan(token: string) {
  return callGuestMethod<{ status: string }>(`${PLANS_API}.decline_plan`, { token });
}

export async function getPlanByToken(token: string) {
  return callGuestMethod<unknown>(`${PLANS_API}.get_plan_by_token`, { token });
}

export async function generateWorkOrder(planName: string) {
  return callMethod<{ job_name: string; hcp_job_id: string }>(
    `${PLANS_API}.generate_work_order`,
    { plan_name: planName }
  );
}

export async function getPlansDue(daysAhead = 14) {
  return callMethod<{
    plans: {
      name: string;
      template_name: string;
      customer_name: string;
      address: string;
      next_service_date: string;
      days_until: number;
    }[];
    count: number;
  }>(`${PLANS_API}.get_plans_due`, { days_ahead: daysAhead });
}

// ── Materials & Checklist ──────────────────────────────────────
const MATERIALS_API = "hcp_replacement.hcp_replacement.api.materials";

export async function searchPricebook(query: string, limit = 20): Promise<Array<{
  name: string;
  item_name: string;
  description?: string;
  stock_uom?: string;
  standard_rate: number;
}>> {
  return callMethod(`${MATERIALS_API}.search_pricebook`, { query, limit });
}

export async function addMaterial(jobName: string, item: string, quantity: number, source: string, warehouse: string): Promise<{ status: string; total_material_cost: number }> {
  return callMethod(`${MATERIALS_API}.add_material`, { job_name: jobName, item, quantity, source, warehouse });
}

export async function removeMaterial(jobName: string, rowName: string): Promise<{ status: string; total_material_cost: number }> {
  return callMethod(`${MATERIALS_API}.remove_material`, { job_name: jobName, row_name: rowName });
}

export async function updateMaterialQty(jobName: string, rowName: string, quantity: number): Promise<{ status: string; total_material_cost: number }> {
  return callMethod(`${MATERIALS_API}.update_material_qty`, { job_name: jobName, row_name: rowName, quantity });
}

export async function updateMaterialRate(jobName: string, rowName: string, rate: number): Promise<{ status: string; total_material_cost: number }> {
  return callMethod(`${MATERIALS_API}.update_material_rate`, { job_name: jobName, row_name: rowName, rate });
}

export async function getJobChecklist(jobName: string): Promise<{
  job_name: string;
  populated_from_template: boolean;
  items: Array<{ idx: number; item_text: string; required: number; checked: number; checked_at: string | null; checked_by: string | null }>;
}> {
  return callMethod("hcp_replacement.hcp_replacement.api.checklists.get_job_checklist", { job_name: jobName });
}

// ── Payments ──────────────────────────────────────────────────────────────────

const INVOICE_API = "hcp_replacement.hcp_replacement.api.invoice";
const STRIPE_API = "hcp_replacement.hcp_replacement.api.stripe_payments";
const RECEIPT_API = "hcp_replacement.hcp_replacement.api.receipt_delivery";

export interface RecordPaymentResult {
  success: boolean;
  invoice_name: string;
  method: string;
  paid_at: string;
}

/** Record a cash or check payment against a Sales Invoice. */
export async function recordPayment(
  invoiceName: string,
  method: "cash" | "check",
  amount: number,
  reference?: string
): Promise<RecordPaymentResult> {
  return callMethod<RecordPaymentResult>(`${INVOICE_API}.record_payment`, {
    invoice_name: invoiceName,
    method,
    amount,
    reference: reference ?? "",
  });
}

export interface StripeConfig {
  configured: boolean;
  publishable_key?: string;
}

/** Fetch the Stripe publishable key from ERPNext site config. */
export async function getStripeConfig(): Promise<StripeConfig> {
  return callMethod<StripeConfig>(`${STRIPE_API}.get_stripe_config`);
}

export interface PaymentIntentResult {
  client_secret: string;
  payment_intent_id: string;
  publishable_key: string;
}

/** Create a Stripe PaymentIntent for the given invoice + amount (card total, fee included). */
export async function createPaymentIntent(
  invoiceName: string,
  amount: number
): Promise<PaymentIntentResult> {
  return callMethod<PaymentIntentResult>(`${STRIPE_API}.create_payment_intent`, {
    invoice_name: invoiceName,
    amount,
  });
}

export interface ConfirmCardPaymentResult {
  success: boolean;
  invoice_name: string;
  method: string;
  paid_at: string;
}

/** Record a confirmed Stripe card payment in ERPNext. */
export async function confirmCardPayment(
  invoiceName: string,
  paymentIntentId: string
): Promise<ConfirmCardPaymentResult> {
  return callMethod<ConfirmCardPaymentResult>(`${STRIPE_API}.confirm_card_payment`, {
    invoice_name: invoiceName,
    payment_intent_id: paymentIntentId,
  });
}

export interface PaymentLinkResult {
  url: string;
  session_id: string;
}

/** Create a Stripe Checkout Session pay-link for a customer to pay remotely. */
export async function createInvoicePaymentLink(
  invoiceName: string
): Promise<PaymentLinkResult> {
  return callMethod<PaymentLinkResult>(`${STRIPE_API}.create_invoice_payment_link`, {
    invoice_name: invoiceName,
  });
}

export interface ReceiptTokenResult {
  token_url: string;
}

/** Generate an opaque receipt token URL (used as a share target). */
export async function generateReceiptToken(
  invoiceName: string
): Promise<ReceiptTokenResult> {
  return callMethod<ReceiptTokenResult>(`${RECEIPT_API}.generate_receipt_token`, {
    invoice_name: invoiceName,
  });
}

export interface SendReceiptEmailResult {
  success: boolean;
  message: string;
}

/** Email the PDF receipt to a customer. */
export async function sendReceiptEmail(
  invoiceName: string,
  email: string
): Promise<SendReceiptEmailResult> {
  return callMethod<SendReceiptEmailResult>(`${RECEIPT_API}.send_receipt_email`, {
    invoice_name: invoiceName,
    email,
  });
}

export interface SendReceiptSmsResult {
  success: boolean;
  message: string;
}

/** SMS the receipt link to a customer. */
export async function sendReceiptSms(
  invoiceName: string,
  phone: string
): Promise<SendReceiptSmsResult> {
  return callMethod<SendReceiptSmsResult>(`${RECEIPT_API}.send_receipt_sms`, {
    invoice_name: invoiceName,
    phone,
  });
}

export interface InvoiceSettings {
  card_processing_pct: number;
  default_labor_rate: number;
}

// ── Job Photo Upload ───────────────────────────────────────────────────────────

const PHOTO_API = "hcp_replacement.hcp_replacement.api.photo_upload";

export interface PhotoUploadResult {
  photo_row_name: string;
  classification: string;
  confidence: number;
  quality_ok: boolean;
  quality_warnings: string[];
  receipt_name?: string;
}

/**
 * Step 1 — upload a raw file to Frappe's file storage. Returns the server-side
 * file_url which is then passed to uploadAndClassifyPhoto.
 * Mirrors mobile queue.ts uploadFile().
 */
export async function uploadRawFile(file: File): Promise<string> {
  const creds = getAuth();
  if (!creds) throw new Error("Not authenticated");
  const formData = new FormData();
  formData.append("file", file, file.name);
  formData.append("is_private", "0");
  const res = await fetch(`${baseUrl()}/api/method/upload_file`, {
    method: "POST",
    headers: {
      Authorization: `token ${creds.apiKey}:${creds.apiSecret}`,
      // NOTE: do NOT set Content-Type — browser sets it with the correct boundary
    },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`upload_file failed (${res.status}): ${text.slice(0, 300)}`);
  }
  const json = await res.json() as { message?: { file_url?: string } };
  const fileUrl = json.message?.file_url;
  if (!fileUrl) throw new Error("upload_file returned no file_url");
  return fileUrl;
}

/**
 * Step 2 — classify/attach the uploaded file to a job.
 * Mirrors mobile queue.ts uploadAndClassify().
 * Endpoint: hcp_replacement.hcp_replacement.api.photo_upload.upload_and_classify
 */
export async function uploadAndClassifyPhoto(
  hcpJobName: string,
  fileUrl: string
): Promise<PhotoUploadResult> {
  return callMethod<PhotoUploadResult>(`${PHOTO_API}.upload_and_classify`, {
    hcp_job_name: hcpJobName,
    file_url: fileUrl,
  });
}

// ── HCP Sync ──────────────────────────────────────────────────────────────────

const HCP_SYNC_API = "hcp_replacement.hcp_replacement.core.hcp_sync";

export interface SyncHcpJobResult {
  status: string;
  synced_at: string;
}

/**
 * Push + pull sync between MTM and HouseCall Pro.
 * Mirrors mobile JobDetailScreen.tsx handleSync().
 * Endpoint: hcp_replacement.hcp_replacement.core.hcp_sync.sync_hcp_job
 */
export async function syncHcpJob(hcpJobName: string): Promise<SyncHcpJobResult> {
  return callMethod<SyncHcpJobResult>(`${HCP_SYNC_API}.sync_hcp_job`, {
    hcp_job_name: hcpJobName,
  });
}

// ── Time Tracking (clock in/out) ──────────────────────────────────────────────

const TIME_API = "hcp_replacement.hcp_replacement.api.time_tracking";

export interface ClockStatusResult {
  clocked_in: boolean;
  clock_in_time?: string;
  timesheet?: string;
}

export interface DayClockInResult {
  status: string;
  clock_in_time: string;
  timesheet: string;
}

export interface DayClockOutResult {
  status: string;
  hours: number;
}

export interface JobClockInResult {
  status: string;
}

export interface JobClockOutResult {
  status: string;
  hours: number;
}

/**
 * Get the current user's day-level clock status.
 * Endpoint: hcp_replacement.hcp_replacement.api.time_tracking.get_clock_status
 */
export async function getClockStatus(): Promise<ClockStatusResult> {
  return callMethod<ClockStatusResult>(`${TIME_API}.get_clock_status`);
}

/**
 * Clock the current user in for the day (creates a Timesheet).
 * Endpoint: hcp_replacement.hcp_replacement.api.time_tracking.day_clock_in
 */
export async function dayClockIn(): Promise<DayClockInResult> {
  return callMethod<DayClockInResult>(`${TIME_API}.day_clock_in`);
}

/**
 * Clock the current user out for the day (closes the Timesheet).
 * Endpoint: hcp_replacement.hcp_replacement.api.time_tracking.day_clock_out
 */
export async function dayClockOut(): Promise<DayClockOutResult> {
  return callMethod<DayClockOutResult>(`${TIME_API}.day_clock_out`);
}

/**
 * Clock in to a specific job.
 * Endpoint: hcp_replacement.hcp_replacement.api.time_tracking.clock_in
 */
export async function jobClockIn(hcpJobName: string): Promise<JobClockInResult> {
  return callMethod<JobClockInResult>(`${TIME_API}.clock_in`, {
    hcp_job_name: hcpJobName,
  });
}

/**
 * Clock out of a specific job.
 * Endpoint: hcp_replacement.hcp_replacement.api.time_tracking.clock_out
 */
export async function jobClockOut(hcpJobName: string): Promise<JobClockOutResult> {
  return callMethod<JobClockOutResult>(`${TIME_API}.clock_out`, {
    hcp_job_name: hcpJobName,
  });
}

// ── Receipt Dispatch ──────────────────────────────────────────────────────────

const LIMBO_API = "hcp_replacement.hcp_replacement.api.limbo";
const RECEIPT_OCR_API = "hcp_replacement.hcp_replacement.api.receipt_ocr";

/** Destinations available when dispatching a receipt line item. */
export type ReceiptDispatchDestination =
  | "This Job"
  | "Different Job"
  | "Truck Stock"
  | "Warehouse"
  | "Return"
  | "Discard";

/** One parsed item row returned by get_receipt_dispatch_state. */
export interface ReceiptDispatchLine {
  /** `name` of the parsed-items child row — used as parsed_item_row. */
  parsed_item_row: string;
  description: string;
  quantity: number;
  product_code: string | null;
  unit_price: number | null;
  total_price: number | null;
  dispatched: boolean;
  dispatch_destination: ReceiptDispatchDestination | null;
  destination_job: string | null;
}

export interface ReceiptDispatchState {
  receipt_name: string;
  supplier: string | null;
  receipt_date: string | null;
  parsed_total: number;
  lines: ReceiptDispatchLine[];
  pending_count: number;
  dispatched_count: number;
}

/** One item in the items_json payload sent to dispatch_receipt_items. */
export interface ReceiptDispatchPayloadItem {
  parsed_item_row: string;
  destination: ReceiptDispatchDestination;
  dispatch_quantity: number;
  destination_job?: string;
}

export interface DispatchReceiptItemsResult {
  dispatched: number;
  counts: Partial<Record<ReceiptDispatchDestination, number>>;
}

/**
 * Fetch current dispatch state for every parsed line on a receipt.
 * Endpoint: hcp_replacement.hcp_replacement.api.limbo.get_receipt_dispatch_state
 */
export async function getReceiptDispatchState(
  receiptName: string
): Promise<ReceiptDispatchState> {
  return callMethod<ReceiptDispatchState>(`${LIMBO_API}.get_receipt_dispatch_state`, {
    receipt_name: receiptName,
  });
}

/**
 * Dispatch one or more receipt lines to their chosen destinations.
 * Endpoint: hcp_replacement.hcp_replacement.api.limbo.dispatch_receipt_items
 */
export async function dispatchReceiptItems(
  receiptName: string,
  items: ReceiptDispatchPayloadItem[]
): Promise<DispatchReceiptItemsResult> {
  return callMethod<DispatchReceiptItemsResult>(`${LIMBO_API}.dispatch_receipt_items`, {
    receipt_name: receiptName,
    items_json: JSON.stringify(items),
  });
}

/** Summary row returned by get_linked_receipts. */
export interface LinkedReceiptSummary {
  name: string;
  receipt_date: string | null;
  supplier: string | null;
  ocr_status: string;
  parsed_total: number;
}

/**
 * Fetch receipts linked to a job.
 * Endpoint: hcp_replacement.hcp_replacement.api.receipt_ocr.get_linked_receipts
 */
export async function getLinkedReceipts(
  hcpJobName: string
): Promise<LinkedReceiptSummary[]> {
  return callMethod<LinkedReceiptSummary[]>(`${RECEIPT_OCR_API}.get_linked_receipts`, {
    hcp_job_name: hcpJobName,
  });
}

/** Fetch MTM Invoice Settings (single doctype) — needed for card fee %. */
export async function getInvoiceSettings(): Promise<InvoiceSettings> {
  // MTM Invoice Settings is a Single doctype — read via the document API
  const res = await fetch(
    `${(getAuth()?.siteUrl || "https://erp.manytalentsmore.com").replace(/\/+$/, "")}/api/resource/MTM Invoice Settings/MTM Invoice Settings`,
    {
      headers: {
        ...(() => {
          const creds = getAuth();
          if (!creds) throw new Error("Not authenticated");
          return {
            Authorization: `token ${creds.apiKey}:${creds.apiSecret}`,
            Accept: "application/json",
          };
        })(),
      },
    }
  );
  if (!res.ok) {
    // Graceful fallback — same defaults as the Python get_settings()
    return { card_processing_pct: 2.7, default_labor_rate: 155 };
  }
  const json = await res.json() as { data?: { card_processing_pct?: number; default_labor_rate?: number } };
  return {
    card_processing_pct: json.data?.card_processing_pct ?? 2.7,
    default_labor_rate: json.data?.default_labor_rate ?? 155,
  };
}
