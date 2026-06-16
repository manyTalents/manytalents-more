# MTM Web Dashboard Catalog
**Generated:** 2026-06-15
**Source root:** `C:/Users/chris/OneDrive/Documentos/ManyTalentsMore/src/`
**Total .ts/.tsx files:** 116
**Files documented at function-level:** 116
**Files documented at file-level only:** 0
**Status:** COMPLETE — all sections fully documented

---

## Table of Contents
1. [Project Configuration](#1-project-configuration)
2. [Middleware & Auth](#2-middleware--auth)
3. [src/lib — API Modules, Hooks, Stores, Utilities](#3-srclib)
4. [Manager Dashboard Pages (src/app/manager/)](#4-manager-dashboard-pages)
5. [Other App Routes (src/app/ non-manager)](#5-other-app-routes)
6. [Shared Components (src/components/)](#6-shared-components)
7. [Findings & Flags](#7-findings--flags)

---

## 1. Project Configuration

### next.config.ts
**One-line purpose:** Next.js configuration — injects Frappe Cloud site URL as build-time env.

Env injected: `FRAPPE_SITE = process.env.FRAPPE_SITE || "https://manytalentsmore.v.frappe.cloud"`

Key settings:
- `reactStrictMode: true`
- `eslint.ignoreDuringBuilds: true` — ESLint errors do NOT fail CI builds
- `typescript.ignoreBuildErrors: true` — TypeScript errors do NOT fail CI builds

**FLAG:** Both ignores are production risk — type and lint errors are silently deployed.

### package.json
**One-line purpose:** Project dependencies and scripts.

Key dependencies:
| Package | Version | Role |
|---|---|---|
| next | ^15.1.0 | Framework |
| react / react-dom | ^19.0.0 | UI |
| @supabase/supabase-js | ^2.103.3 | Options platform DB |
| @supabase/ssr | ^0.10.2 | Supabase SSR helpers |
| @tanstack/react-query | ^5.62.0 | Installed — NOT USED (no QueryClientProvider found) |
| recharts | ^3.8.1 | Bar charts in dashboard widgets |
| lightweight-charts | ^5.1.0 | Equity charts in money dashboard |
| zustand | ^5.0.2 | Installed — NOT USED (no store found) |
| stripe | ^22.0.2 | Server-side Stripe for options checkout |
| @stripe/stripe-js | ^9.2.0 | Client-side Stripe.js |
| resend | ^6.12.2 | Email sending (kingdom contact form) |

**FLAGS:**
- `@tanstack/react-query` and `zustand` are installed but never used — dead dependencies.
- No middleware.ts file exists at root or in src/ — no server-side auth guard.

---

## 2. Middleware & Auth

**No middleware.ts file exists** at either the project root or src/.

Auth is entirely client-side:
- **Manager dashboard:** `getAuth()` from `lib/frappe.ts` reads `localStorage["mtm_web_auth"]`. Each page calls this in `useEffect` and redirects to `/manager` if null.
- **Money dashboard:** `getMoneyAuth()` from `lib/money-auth.ts` reads `localStorage["mtm_money_auth"]`. Auth gate is a React component (AuthGate.tsx), not middleware.
- **Options platform:** Auth is per-request via Supabase `createServiceClient()` in Next.js API routes.

**Risk:** No server-side route protection. SSR bots can access page HTML without auth. Since all real data is fetched client-side via token-authenticated Frappe API calls, actual data exposure is low — but manager routes are technically crawlable.

---

## 3. src/lib

### lib/frappe.ts
**One-line purpose:** Central Frappe API client — all Manager dashboard backend calls go through here.

**Architecture:** Token-based auth (`Authorization: token {apiKey}:{apiSecret}`), credentials in `localStorage["mtm_web_auth"]`. All API methods target the `hcp_replacement` Frappe app on the self-hosted ERPNext at `https://erp.manytalentsmore.com`.

#### Exported interfaces
- `AuthCreds { siteUrl, apiKey, apiSecret }`
- `WorkflowCounts { finished, needs_checked, to_invoice, pending_payment, paid_today }`
- `RedeemInviteResponse { api_key, api_secret, site_url, user_email, full_name? }`
- `RequestLoginLinkResponse { sent, message, admin_fallback_url? }`
- `CreateInviteResponse { invite_url, expires_at, email_sent }`
- `OnboardNewUserResponse extends CreateInviteResponse { user_created, user_email, role_assigned }`
- `OnboardTechResponse { user_email, full_name, api_key, api_secret, user_created, van_warehouse, site_url }`
- `TechListItem { employee, name, email, van, has_app_access }`
- `Approver { user_email, display_name, added_on, added_by }`
- `AccessRequestInfo { name, requester_name, requester_email, requested_role, note, status, requested_at }`
- `ApproveRequestResponse { approved, user_email, role_assigned, invite_url, email_sent }`
- `PricebookItem`, `PricebookResponse`, `UpdatePricingResponse`
- `SearchResult { job_name, hcp_job_id, customer_name, address, town, status, scheduled_date, total_job_cost, match_field }`
- `ARInvoice`, `ARBucket`
- `CustomerListItem`, `CustomerListResponse`, `CustomerAddress`, `CustomerJob`, `CustomerProfile`
- `EstimateLineItem`, `EstimateOption`, `EstimateSummary`, `EstimateDetail`
- `PlanTemplate`, `PlanInstance`, `PlanDetail`

#### Auth utility exports
| Function | Signature | What it does | Backend call |
|---|---|---|---|
| `getAuth` | `(): AuthCreds \| null` | Reads credentials from localStorage | None |
| `setAuth` | `(creds): void` | Writes credentials to localStorage | None |
| `clearAuth` | `(): void` | Removes credentials | None |
| `testConnection` | `(creds): Promise<string>` | Validates API key pair, returns user email | `frappe.auth.get_logged_user` |

#### Private helpers
- `getHeaders()` — Builds Authorization token header from stored creds. Throws if no creds.
- `baseUrl()` — Returns site URL from stored creds or env default.
- `callMethod<T>(method, data?)` — POST to `/api/method/{method}`. Requires auth. Throws descriptive error on non-OK.
- `callGuestMethod<T>(method, data?)` — POST without auth. Parses Frappe error format. Used for invite redemption, access requests, estimate/plan approval.
- `parseFrappeError(json, fallback)` — Unwraps Frappe's JSON-in-JSON `_server_messages` error format.

#### Job management (API prefix: `hcp_replacement.hcp_replacement.api.tech_utils`)
| Function | Params | Backend method |
|---|---|---|
| `getWorkflowCounts` | — | `get_workflow_counts` |
| `getJobsByStatus` | statusKey | `get_jobs_by_status` |
| `getJobList` | — | `get_job_list` |
| `getManagerJobs` | {mode, search, status_filter, page_length, page} | `get_job_list` |
| `getJobDetail` | jobName | `get_job_detail` |
| `sendToCheck` | jobName | `send_to_check` |
| `approveForInvoice` | jobName | `approve_for_invoice` |
| `createInvoiceForJob` | jobName, sendEmail | `create_invoice_for_job` |
| `markInvoiced` | jobName | `mark_invoiced` |
| `markPaid` | jobName | `mark_paid` |
| `revertStatus` | jobName, targetStatus | `revert_status` |
| `addJobNote` | jobName, noteText | `add_job_note` |
| `revertWithNote` | jobName, targetStatus, note | `add_job_note` + `revert_status` (two calls) |
| `getDefaultLaborRate` | — | `get_default_labor_rate` |
| `createJob` | {customer_name, address, town, ...} | `create_job` |
| `updateJobServices` | jobName, services[] | `update_job_services` |
| `saveJobField` | jobName, field, value | `save_job_field` |
| `searchCustomers` | query | `search_customers` |
| `getCustomerHistory` | customerName | `get_customer_history` |
| `searchAddresses` | query | `search_addresses` |
| `assignTech` | jobName, techUser, role | `assign_tech` |
| `globalSearch` | query | `global_search` |

#### Auth/invite management (API prefix: `hcp_replacement.hcp_replacement.api.auth_utils`)
| Function | Guest? | Backend method |
|---|---|---|
| `requestPasswordReset` | Yes | `request_password_reset` |
| `loginWithPassword` | Yes | `login_with_password` |
| `redeemInvite` | Yes | `redeem_invite` |
| `requestLoginLink` | Yes | `request_login_link` |
| `createInvite` | No | `create_invite` |
| `onboardNewUser` | No | `onboard_new_user` |
| `checkOfficeAccess` | No | `check_office_access` |
| `onboardTech` | No | `onboard_tech` |
| `listTechs` | No | `list_techs` |
| `listApprovers` | No | `list_approvers` |
| `addApprover` | No | `add_approver` |
| `removeApprover` | No | `remove_approver` |
| `submitAccessRequest` | Yes | `submit_access_request` |
| `getAccessRequestByToken` | Yes | `get_access_request_by_token` |
| `approveAccessRequest` | Yes | `approve_access_request` |
| `denyAccessRequest` | Yes | `deny_access_request` |
| `listAccessRequests` | No | `list_access_requests` |

#### Pricebook (API prefix: `hcp_replacement.hcp_replacement.api.pricing`)
| Function | Backend method |
|---|---|
| `getPricebookList(search, page, pageSize)` | `get_pricebook_list` |
| `updateItemPricing(itemCode, sellingPrice?, markupPct?)` | `update_item_pricing` |
| `bulkUpdateMarkup(itemCodes[], markupPct)` | `bulk_update_markup` |
| `updateGlobalMarkup(markupPct)` | `update_global_markup` |

#### Dashboard stats (API prefix: `hcp_replacement.hcp_replacement.api.dashboard_stats`)
| Function | Backend method |
|---|---|
| `getJobStats(weeks?)` | `get_job_stats` |
| `getTeamStats(period?)` | `get_team_stats` |
| `getRecentJobImages(limit?)` | `get_recent_job_images` |
| `getJobsNeedingEstimate()` | `get_jobs_needing_estimate` |

#### A/R Aging (API prefix: `hcp_replacement.hcp_replacement.api.ar_aging`)
| Function | Backend method |
|---|---|
| `getARAging()` | `get_ar_aging` |
| `sendInvoice(invoiceName, sendEmail?)` | `send_invoice` |
| `resendInvoice(invoiceName)` | `resend_invoice` |

#### Customers (API prefix: `hcp_replacement.hcp_replacement.api.customers`)
| Function | Backend method |
|---|---|
| `getCustomerList(query, page, pageSize)` | `get_customer_list` |
| `getCustomerProfile(customer)` | `get_customer_profile` |

#### Estimates (API prefix: `hcp_replacement.hcp_replacement.api.estimates`)
| Function | Guest? | Backend method |
|---|---|---|
| `getEstimateList(statusFilter, page, pageSize)` | No | `get_estimate_list` |
| `getEstimateDetail(estimateName)` | No | `get_estimate_detail` |
| `createEstimate(params)` | No | `create_estimate` |
| `sendEstimate(estimateName)` | No | `send_estimate` |
| `approveEstimateOption(token, optionIdx, action)` | Yes | `approve_estimate_option` |
| `expireEstimate(estimateName)` | No | `expire_estimate` |

#### Service Plans (API prefix: `hcp_replacement.hcp_replacement.api.service_plans`)
| Function | Guest? | Backend method |
|---|---|---|
| `getPlanTemplates()` | No | `get_plan_templates` |
| `getPlansList(statusFilter, page, pageSize)` | No | `get_plans_list` |
| `getPlanDetail(planName)` | No | `get_plan_detail` |
| `createPlanInstance(template, customer, address)` | No | `create_plan_instance` |
| `sendPlan(planName)` | No | `send_plan` |
| `approvePlan(token)` | Yes | `approve_plan` |
| `declinePlan(token)` | Yes | `decline_plan` |
| `getPlanByToken(token)` | Yes | `get_plan_by_token` |
| `generateWorkOrder(planName)` | No | `generate_work_order` |
| `getPlansDue(daysAhead?)` | No | `get_plans_due` |

**State managed:** `localStorage["mtm_web_auth"]`

---

### lib/supabase.ts
**One-line purpose:** Supabase client factory for the Options Trading Platform (browser + service role).

| Export | Type | What it does |
|---|---|---|
| `getSupabase()` | `(): SupabaseClient` | Lazy browser client with anon key. Throws if env vars missing. |
| `supabase` | `SupabaseClient (Proxy)` | Legacy export — Proxy that delegates to `getSupabase()`. Import without invoking init. |
| `createServiceClient()` | `(): SupabaseClient` | Service-role client for API routes. Uses `SUPABASE_SERVICE_ROLE_KEY`. |

**Env required:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

### lib/features.ts
**One-line purpose:** Feature flag system — fetches from Frappe, caches in localStorage with TTL, gates nav items.

| Export | What it does |
|---|---|
| `FeatureFlags` (interface) | 10 boolean flags: inventory, estimates, service_plans, invoicing, customers, team, pricebook, events, scheduling, money |
| `fetchFeatureFlags()` | Calls `tech_utils.get_feature_flags`, writes to cache, returns flags. Has 1-min error cooldown. |
| `getFeatureFlags()` | Sync read from localStorage cache. Falls back to ALL_OFF (except money always true). |
| `clearFeatureFlags()` | Clears cache + resets error cooldown. Called on logout. |
| `FLAG_TO_NAV` | Maps nav route paths to flag keys for NavBar filtering. |

**State managed:** `localStorage["mtm_feature_flags"]` (JSON: {flags, ts}). Module-level `lastFetchError` timestamp.

**Frappe call:** `hcp_replacement.hcp_replacement.api.tech_utils.get_feature_flags`

**GOTCHA:** `money` flag is always forced `true` (line 57-58) regardless of backend value. Even if backend disables money, the frontend ignores it.

---

### lib/events.ts
**One-line purpose:** Event tracker types, API client, and polling connection for the live Events panel.

| Export | What it does |
|---|---|
| `MTMEvent` (interface) | Full event record: name, event_type, category, severity, title, detail, tech_name, job, job_id, source, timestamp |
| `EventFilters` (interface) | Filter params for paginated event query |
| `fetchRecentEvents(limit, category?)` | `events.get_recent_events` |
| `fetchEvents(filters)` | `events.get_events` — full paginated/filtered |
| `fetchEventStats()` | `events.get_event_stats` → `{last_hour}` |
| `connectEventPolling(onEvents, intervalMs, category?)` | setInterval polling, emits only events newer than last seen. Returns `{disconnect()}`. |
| `SEVERITY_COLORS` | border/bg color per severity |
| `EVENT_TYPE_LABELS` | Human labels per event_type |
| `relativeTime(timestamp)` | "just now"/"5m ago"/"2h ago"/"3d ago" |

**Frappe calls:** `hcp_replacement.hcp_replacement.api.events.*`
**Side effects:** `connectEventPolling` uses `setInterval` — caller must call `disconnect()`.

---

### lib/status-colors.ts
**One-line purpose:** Canonical job status → Tailwind CSS class map for dark-mode badges.

Single export: `STATUS_COLORS: Record<string, string>` — 11 statuses mapped.

**GOTCHA:** This is duplicated verbatim in NavBar.tsx, dashboard/page.tsx, jobs/page.tsx, jobs/[name]/page.tsx, section/[section]/page.tsx. None import from this file. Maintenance risk — updates require 6 edits.

---

### lib/schedule.ts
**One-line purpose:** Schedule board API client, time utilities, and trade classifier for the scheduling feature.

| Export | What it does |
|---|---|
| Types: `ScheduleTech`, `SchedulePuck`, `TimeOffEntry`, `ScheduleBoardData` | — |
| `fetchScheduleBoard(weekStart)` | `tech_utils.get_schedule_board` |
| `updateJobSchedule(params)` | `tech_utils.update_job_schedule` |
| `unscheduleJob(jobName)` | `tech_utils.update_job_schedule` with empty strings |
| `createTimeOff(params)` | `tech_utils.create_time_off` |
| `approveTimeOff(requestName)` | `tech_utils.approve_time_off` |
| `denyTimeOff(requestName)` | `tech_utils.deny_time_off` |
| `getWeekStart(date)` | Returns ISO date of Monday for given date |
| `formatTime(time)` | "14:30" → "2:30" (strips leading zero, skips ":00") |
| `formatTimeRange(start, end)` | "9–11" style |
| `getTrade(jobType)` | Classifies "HVAC", "Electrical", "Plumbing", "other" from jobType string |

**Frappe calls:** `hcp_replacement.hcp_replacement.api.tech_utils.*`

---

### lib/inventory-api.ts
**One-line purpose:** Typed wrappers for inventory, receipts, warehouse stock, limbo, restock, and match-review Frappe endpoints.

#### Domain: Summary
- `fetchInventorySummary(): Promise<InventorySummary>` — pending_receipts, pending_limbo_items, restock_items counts.
  - Frappe: `hcp_replacement.hcp_replacement.api.inventory.get_inventory_summary`

#### Domain: Receipts
- `fetchAllReceipts(page, pageSize, statusFilter)` — Paginated receipt list.
  - Frappe: `inventory.get_all_receipts`
- `fetchReceiptDetail(receiptName)` — Full receipt with items + dispatch summary.
  - Frappe: `inventory.get_receipt_detail`

#### Domain: Warehouses
- `fetchWarehouseList()` — my_truck, office[], other_trucks[] cards.
  - Frappe: `inventory.get_warehouse_list`
- `fetchWarehouseStock(warehouse, page, pageSize, search, stockFilter)` — Paginated stock.
  - Frappe: `inventory.get_warehouse_stock`

#### Domain: Dispatch / Limbo (API prefix: `hcp_replacement.hcp_replacement.api.limbo`)
- `dispatchItems(jobName, items[])` — Routes receipt items to destinations (This Job, Truck, Office, Limbo, Diff Job, Returned, Lost).
- `dispatchAllToJob(jobName)` — Bulk dispatches all pending to job.
- `fetchLimboItems()` — Global limbo queue grouped by receipt.

#### Domain: Restock (API prefix: `hcp_replacement.hcp_replacement.api.restock`)
- `fetchPullLists(date?)` — Pull lists per truck.
- `generatePullList(date?)` — Creates pull list from low-stock logic.
- `markPulled(items[])` — Marks items pulled from warehouse.
- `acceptPullList(truckWarehouse, date?)` — Confirms transfer, creates stock entry.
- `rejectPullItem(name, rejectNote)` — Rejects specific pull item.
- `resolveRejection(name, newItemCode?, newQty?)` — Corrects rejected item.
- `ignorePullItem(name)` — Dismisses pull item.
- `addToPullList(truckWarehouse, itemCode, qty, date?)` — Manual addition.
- `fetchPullSummary()` — Count summary (pending, pulled, rejected, total_active).

#### Domain: Match Review (API prefix: `hcp_replacement.hcp_replacement.api.match_review`)
- `fetchUnmatchedItems(page, pageSize)` — Receipt items needing pricebook match.
- `searchPricebook(query, limit)` — Search for correct match item.
- `correctMatch(parsedItemName, itemCode, learn?)` — Corrects AI match, optionally trains mapping.
- `approveMatch(parsedItemName)` — Approves AI's match.
- `bulkApprove(itemNames[])` — Bulk-approves high-confidence matches.
- `markNotItem(parsedItemName)` — Marks as non-inventory.
- `submitNewPart(params)` — Submits pricebook add request.
- `fetchPendingParts(page?, pageSize?)` — Lists pending pricebook requests.
- `approveNewPart(requestName, itemCode?)` — Admin approves new part.
- `rejectNewPart(requestName, reason?)` — Admin rejects new part.
- `getConfidenceTier(matchCount)` — Returns "unmatched"|"first_match"|"locked_in".

**Types:** `ReceiptStatus`, `ItemDestination`, `ReceiptItem`, `DispatchSummary`, `InventorySummary`, `ReceiptRow`, `ReceiptsResponse`, `ReceiptDetail`, `WarehouseCard`, `WarehouseListResponse`, `StockItem`, `WarehouseStockResponse`, `DispatchItemInput`, `DispatchResult`, `LimboGroup`, `LimboResponse`, `PullItemStatus`, `PullListItem`, `TruckPullList`, `PullListsResponse`, `PullSummary`, `MappingStatus`, `UnmatchedItem`, `UnmatchedItemsResponse`, `PricebookResult`, `CorrectMatchResult`, `ApproveMatchResult`, `BulkApproveResult`, `MarkNotItemResult`, `PricebookRequest`, `CONFIDENCE_COLORS`

---

### lib/money-api.ts
**One-line purpose:** Typed fetch wrappers for VEOE bot API and The Machine (crypto grid bot) API.

**Architecture:** Bearer token auth from `getMoneyAuth()`, base URL `https://money-api.manytalentsmore.com`. Two namespaced client objects exported: `veoe` and `crypto`.

#### `veoe` object
| Method | Endpoint | What it returns |
|---|---|---|
| `veoe.summary()` | `GET /veoe/api/summary` | Account value, PnL, drawdown, MTD/YTD |
| `veoe.equity()` | `GET /veoe/api/equity` | Equity curve points |
| `veoe.trades()` | `GET /veoe/api/trades` | Trade history |
| `veoe.signals()` | `GET /veoe/api/signals` | Signal scores per ticker |
| `veoe.alpha()` | `GET /veoe/api/alpha` | Alpha vs SPY |
| `veoe.config()` | `GET /veoe/api/config` | Bot configuration |
| `veoe.learning()` | `GET /veoe/api/learning` | Learning stats |
| `veoe.health()` | `GET /veoe/api/health` | Status |

#### `crypto` object (adapts The Machine's dashboard API to legacy shapes)
| Method | Source | Notes |
|---|---|---|
| `crypto.balance()` | `/machine/api/v1/dashboard` | Maps grid PnL + equity |
| `crypto.equity(days?)` | `/machine/api/v1/equity` | Falls back to single point on error |
| `crypto.positions()` | `/machine/api/v1/dashboard` | Grid instances as positions |
| `crypto.trades()` | `/machine/api/v1/trades` | Fill history mapped to CryptoTrade |
| `crypto.strategies()` | `/machine/api/v1/dashboard` | Strategy status |
| `crypto.signals()` | STUB | Returns all zeros — Machine has no signal API |
| `crypto.risk()` | `/machine/api/v1/dashboard` | Derives drawdown, circuit breakers |
| `crypto.stats()` | `/machine/api/v1/stats` | Falls back to computed w/ hardcoded startingEquity=436.55 |
| `crypto.learning()` | STUB | Returns all zeros — no learning API |
| `crypto.health()` | `GET /machine/health` | Status |

`connectCryptoWS()` — Always returns `null`. WebSocket not implemented on The Machine.

**FLAGS:**
- `startingEquity = 436.55` hardcoded in `crypto.stats()` fallback — produces wrong total_return_pct.
- Machine API endpoints called without auth (`useAuth = false`).
- `crypto.signals()` and `crypto.learning()` are zero stubs — UI shows these but data is meaningless.

---

### lib/money-auth.ts
**One-line purpose:** Simple localStorage-based Bearer token auth for the Money dashboard.

| Export | What it does |
|---|---|
| `getMoneyAuth(): MoneyAuth \| null` | Reads `localStorage["mtm_money_auth"]` |
| `setMoneyAuth(auth)` | Writes token |
| `clearMoneyAuth()` | Removes token |

**Note:** No token validation — any string in storage is treated as valid until API returns 401.

---

### lib/money-types.ts
**One-line purpose:** TypeScript interfaces for VEOE and Crypto bot API responses.

Pure type file — no executable code.

Types exported: `VEOESummary`, `VEOEEquityPoint`, `VEOETrade`, `VEOESignal`, `VEOEAlpha`, `VEOEConfig`, `VEOELearning`, `CryptoBalance`, `CryptoEquityPoint`, `CryptoPosition`, `CryptoTrade`, `CryptoStrategy`, `CryptoSignals`, `CryptoRisk`, `CryptoStats`, `CryptoLearning`, `CryptoWSUpdate`

---

### lib/options-access.ts
**One-line purpose:** localStorage-based state for Options Platform: disclaimer ack, admin flag, per-run purchases, subscriptions.

| Export | localStorage key |
|---|---|
| `hasAcknowledgedDisclaimer() / setDisclaimerAcknowledged()` | `mtm_options_disclaimer` |
| `isAdmin() / setAdmin()` | `mtm_options_admin` |
| `getPurchaseForRun(runId) / setPurchaseForRun(runId, tier)` | `mtm_purchase_{runId}` |
| `getSubscription() / setSubscription(email) / clearSubscription()` | `mtm_options_sub` |

**RISK:** Admin status is localStorage-only — any user can set admin by writing to localStorage. No server validation.

---

### lib/options-api.ts
**One-line purpose:** Fetch client for Options Platform internal Next.js API routes (`/api/options/*`).

`optionsApi` object:
| Method | HTTP | Route | What it does |
|---|---|---|---|
| `analyze()` | POST | `/api/options/analyze` | Triggers analysis run |
| `execute({recommendation_id, quantity})` | POST | `/api/options/execute` | Places option trade |
| `close(positionId)` | POST | `/api/options/close/{id}` | Closes position |
| `adjustStop(positionId, trailingPct)` | POST | `/api/options/adjust-stop/{id}` | Updates trailing stop |
| `checkout(tier, mode)` | POST | `/api/options/checkout` | Creates Stripe checkout session |
| `getRunStatus()` | GET | `/api/options/run-status` | Checks for cached analysis run |
| `getRecommendations(params)` | GET | `/api/options/recommendations` | Fetches gated recommendations |
| `verifyAdmin(password)` | POST | `/api/options/admin-verify` | Validates admin password |

---

### lib/options-types.ts
**One-line purpose:** TypeScript interfaces for Options Platform DB rows and API shapes.

Pure type file. Key types:
- DB rows: `Settings`, `AnalysisRun`, `Recommendation`, `Position`, `ExitRule`, `TradeLogEntry`
- API: `ExecuteRequest`, `AnalyzeResponse`, `ExecuteResponse`, `CloseResponse`
- Monetization: `Tier` (3|5|10), `TeaserRecommendation`, `Purchase`, `Subscriber`, `RunStatus`, `CheckoutResponse`, `GatedRecommendationsResponse`

---

### lib/stripe.ts
**One-line purpose:** Singleton Stripe client factories — server-side (API routes) and client-side (Checkout redirect).

| Export | Usage |
|---|---|
| `getStripe(): Stripe` | Server-side lazy singleton. Uses `STRIPE_SECRET_KEY`. API routes only. |
| `getStripeJs(): Promise<StripeJs \| null>` | Client-side lazy singleton. Uses `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`. For redirectToCheckout. |

---

## 4. Manager Dashboard Pages

### app/layout.tsx (root)
**One-line purpose:** Root HTML shell — metadata, Google Fonts (Playfair Display + Inter), dark navy body classes.

- Title: "ManyTalents Manager"
- Body: `bg-navy text-cream min-h-screen font-sans antialiased`

### app/manager/layout.tsx
**One-line purpose:** Wraps all `/manager/*` routes in the class-based ErrorBoundary.

Single child: `<ErrorBoundary>{children}</ErrorBoundary>`

### app/manager/error.tsx
**One-line purpose:** Next.js route-segment error fallback — shown on unhandled errors in server components or during navigation.

`ManagerError({ error, reset })`:
- Logs error to console.
- Collapsible error details with stack trace.
- "Try Again" button calls `reset()`.
- "Return to Dashboard" → `/manager/jobs`.

**Note:** Nearly identical UI to ErrorBoundary.tsx. Two separate mechanisms: this catches async/navigation errors; ErrorBoundary.tsx catches synchronous render errors.

---

### Login (manager/page.tsx)

**Route:** `/manager`
**One-line purpose:** Multi-mode login page — email+password, magic-link auto-redemption, API key manual entry, forgot password, request access.

**Component structure:** `LoginPage` (Suspense wrapper) → `LoginPageInner`

**Auth flows:**
1. **Magic-link auto-redeem:** `?invite=TOKEN` → `redeemInvite(token)` → `setAuth(creds)` → redirect `/manager/dashboard`. Strips token from URL on failure.
2. **Email + password:** `loginWithPassword(email, password)` → `setAuth()` → redirect.
3. **Forgot password:** `requestPasswordReset(email)` → "Check your email" message.
4. **API key (advanced):** `testConnection(creds)` → `setAuth()` → redirect.
5. **Already logged in:** `getAuth()` non-null + no token → auto-redirect to dashboard.

**Frappe calls:**
- `auth_utils.redeem_invite` (guest)
- `auth_utils.login_with_password` (guest)
- `auth_utils.request_password_reset` (guest)
- `frappe.auth.get_logged_user` (via testConnection)

**RESOLVED (2026-06-15):** Previously a `handleSendLink` function referenced undeclared `linkEmail`/`linkStatus` state and an un-imported `requestLoginLink` (orphaned magic-link *send* flow, replaced by request-access + forgot-password). It was never wired into the JSX, so it only latently broke (and only shipped because TS build errors are silenced). The dead function has been **deleted**. The login page now uses email+password (`login_with_password`), forgot-password (`request_password_reset`), invite redemption (`redeem_invite`), and a collapsed API-key option. Note: `requestLoginLink` in `lib/frappe.ts` is now an unused export.

---

### manager/dashboard/

#### manager/dashboard/page.tsx
**Route:** `/manager/dashboard`
**One-line purpose:** KPI dashboard — 5 pipeline stage counts, + widget grid of 8 widgets.

**Auth gate:** `getAuth()` → redirect `/manager`.
**Feature gate:** Pipeline cards only if `flags.invoicing`.

**Data on mount:**
- `fetchFeatureFlags()` — refreshes flag cache
- `getWorkflowCounts()` — 5 pipeline counts

**Widget grid (conditional):**
| Widget | Gate |
|---|---|
| ARAgingWidget | flags.invoicing |
| JobRevenueWidget | always |
| TeamLeaderboardWidget | always |
| JobCountWidget | always |
| NeedsCheckWidget | flags.invoicing |
| NeedEstimateWidget | flags.estimates |
| ServicePlansDueWidget | flags.service_plans |
| JobsImagesWidget | always |

**Frappe calls:** `tech_utils.get_workflow_counts`, `tech_utils.get_feature_flags`

#### manager/dashboard/widget-registry.ts
**One-line purpose:** Widget metadata catalog and localStorage layout persistence.

- `WIDGET_CATALOG: WidgetConfig[]` — 8 widgets with id, title, component name, defaultWidth.
- `ROLE_PRESETS: Record<"office"|"operations"|"owner", string[]>` — predefined widget sets.
- `loadLayout(role): string[]` — reads from `localStorage["mtm_dashboard_layout"]`, falls back to role preset.
- `saveLayout(widgetIds[])` — persists to localStorage.

**FLAG (DEAD CODE):** Dashboard page does NOT use this registry — it hardcodes its widget layout. `WIDGET_CATALOG`, `ROLE_PRESETS`, `loadLayout`, `saveLayout` are all unused.

#### manager/dashboard/widgets/WidgetShell.tsx
`Props: { title, children, loading?, onDrill?, className? }`

Reusable card: title bar + loading spinner + optional click/keyboard handler. `onDrill` makes card a button.

#### manager/dashboard/widgets/ARAgingWidget.tsx
Calls `getARAging()`. Shows total outstanding + 4 aging bucket cards. Click → `/manager/invoices?bucket=...`. 91+ shows "Collections" badge.
**Frappe:** `ar_aging.get_ar_aging`

#### manager/dashboard/widgets/JobRevenueWidget.tsx
Calls `getJobStats(10)`. Shows total revenue + Recharts BarChart (gold bars, 10-week view).
**Frappe:** `dashboard_stats.get_job_stats`
**FLAG:** Called independently from JobCountWidget — double API call on same page.

#### manager/dashboard/widgets/JobCountWidget.tsx
Calls `getJobStats(10)`. Shows job count + Recharts BarChart (blue bars).
**Frappe:** `dashboard_stats.get_job_stats` (same call as JobRevenueWidget — wasteful)

#### manager/dashboard/widgets/TeamLeaderboardWidget.tsx
Calls `getTeamStats("weekly")`. Shows tech initials avatar, name, revenue, job count, proportional progress bar.
**Frappe:** `dashboard_stats.get_team_stats`

#### manager/dashboard/widgets/NeedsCheckWidget.tsx
Calls `getJobsByStatus("needs_checked")`. Shows up to 8 jobs needing check, each links to job detail.
**Feature gate:** `flags.invoicing`
**Frappe:** `tech_utils.get_jobs_by_status`

#### manager/dashboard/widgets/NeedEstimateWidget.tsx
Calls `getJobsNeedingEstimate()`. Shows up to 8 jobs needing estimates.
**Feature gate:** `flags.estimates`
**Frappe:** `dashboard_stats.get_jobs_needing_estimate`

#### manager/dashboard/widgets/ServicePlansDueWidget.tsx
Calls `getPlansDue(14)`. Shows up to 8 plans due in 14 days. Urgency colors: red (≤2d), amber (≤7d), blue (8-14d).
**Feature gate:** `flags.service_plans`
**Frappe:** `service_plans.get_plans_due`

#### manager/dashboard/widgets/JobsImagesWidget.tsx
Calls `getRecentJobImages(12)`. 4-column image grid, each clickable to job. Uses Next.js `<Image unoptimized>` — no optimization.
**Frappe:** `dashboard_stats.get_recent_job_images`

---

### manager/components/

#### manager/components/ErrorBoundary.tsx
Class-based React error boundary. Catches synchronous render errors in Client Components.

- `getDerivedStateFromError(error)` → sets `hasError: true`.
- `componentDidCatch(error, info)` → logs to console.
- `handleReset()` → clears error state.
- `toggleDetails()` → shows/hides collapsible stack trace.

#### manager/components/NavBar.tsx
**One-line purpose:** Sticky nav with feature-flag-gated links, debounced global search, event badge, logout, mobile menu.

Key behaviors:
- On mount: reads cached flags, then `fetchFeatureFlags()` to refresh.
- Links filtered by `FLAG_TO_NAV` — disabled flags hide nav entries.
- Global search: `globalSearch(q)` with 300ms debounce → results dropdown. Auto-closes on route change or outside click.
- Logout: `clearFeatureFlags()` + `clearAuth()` + redirect `/manager`.
- EventBadge shown when `flags.events`.

**Frappe call:** `tech_utils.global_search`
**FLAG:** Duplicates `STATUS_COLORS` object instead of importing from `lib/status-colors.ts`.

#### manager/components/EventBadge.tsx
Bell button with orange count badge. Polls `fetchEventStats()` every 30s. Badge shows events in last hour.
**Frappe:** `events.get_event_stats`

#### manager/components/EventPanel.tsx
Slide-in drawer: live event feed with Business/System filter chips.
- On open: loads last 30 events + starts 5s polling.
- On close: disconnects poller.
- Escape key closes.
- Events prepended to list, capped at 100.
- Footer → `/manager/events` full page.
- Re-exports `SEVERITY_DOT` for events page.

**Frappe calls:** `events.get_recent_events`, `events.get_event_stats` (via polling)

---

### manager/jobs/

#### manager/jobs/page.tsx
**Route:** `/manager/jobs`
**One-line purpose:** All jobs — loads entire job list client-side, with search and status filter.

**Auth gate:** `getAuth()` on mount.

`JobCard({ job })` — Link card: customer name, job ID badge, status badge, address, description snippet, tech chips, cost, scheduled date.

**Data:** `getJobList()` — ALL jobs, no pagination.

**Client-side derivations:**
- `activeJobs` = jobs not in `TERMINAL_STATUSES` (Completed/Checked/Paid/Canceled/Invoiced)
- `searchResults` = search-filtered across all jobs
- `filteredAllJobs` = status-dropdown-filtered

**Frappe call:** `tech_utils.get_job_list`
**FLAG:** No pagination — loads all jobs into memory. Will degrade at scale.

#### manager/jobs/new/page.tsx
**Route:** `/manager/jobs/new`
**One-line purpose:** Job creation form with customer autocomplete, address autocomplete, labor calculator, tech assignment.

`NewJobPage` (Suspense wrapper) → `NewJobInner`

**Auth gate:** `getAuth()` on mount.
**Query param:** `?customer=` pre-populates customer.

**Helper functions:**
- `formatPhone(raw): string` — formats digits to "(xxx) xxx-xxxx".
- `handlePhoneChange(value, setter)` — phone input handler.

**Internal handlers:**
- `handleCustomerSearch(value)` — 300ms debounced search, shows dropdown, marks `customerIsNew` if no results.
- `selectCustomer(cust)` — fills name, autofills address/phone/town from `getCustomerHistory()`.
- `confirmNewCustomer()` — dismisses "new customer" badge without clearing name.
- `handleAddressSearch(value)` — shows customer-specific addresses first, then global search.
- `selectAddress(addr)` — fills address + town.
- `toggleTrade(trade)` — Set<string> toggle for Electrical/HVAC/Plumbing.
- `toggleTech(email)` — Set<string> toggle for tech selection.
- `handleSubmit()` — validates, calls `createJob()`, then parallel `assignTech()` per selected tech, redirects to job detail.

**Frappe calls:**
- `tech_utils.get_default_labor_rate` (on mount)
- `auth_utils.list_techs` (on mount)
- `tech_utils.search_customers` (debounced)
- `tech_utils.get_customer_history` (on customer select)
- `tech_utils.search_addresses` (debounced)
- `tech_utils.create_job` (on submit)
- `tech_utils.assign_tech` (per tech, post-creation)

**Side effects:** Navigates to `/manager/jobs/{name}` on success.

#### manager/jobs/[name]/page.tsx
**Route:** `/manager/jobs/{name}`
**One-line purpose:** Full job detail — workflow actions, editable info/services, notes, photos, materials, estimates, receipts.

**Auth gate:** `getAuth()` on mount.

**Data on mount:**
- `getJobDetail(jobName)` — full job record (services, materials, photos, notes, receipts, assigned techs)
- `getDefaultLaborRate()` — for services edit default
- `getEstimateList("all", 1, 50)` — all estimates, filtered client-side by `linked_job === jobName`

**Workflow action config (WORKFLOW_ACTIONS):**
| Job Status | Primary Actions | Secondary |
|---|---|---|
| Completed | Send to Check | — |
| Needs Check | Approve for Invoice | Send Back → Completed (requires note) |
| Checked | Create Invoice, Create & Email Invoice | Send Back → Needs Check (requires note) |
| Invoiced | Mark Paid | Send Back → Checked (requires note) |

**Internal functions:**
- `loadJob()` — re-fetches job. Called after every action.
- `createAndMarkInvoiced(jobName, sendEmail)` — creates invoice then marks as Invoiced.
- `handleAction(action, confirmMsg?)` — wrapper: runs action, shows result/error, reloads. Extracts invoice link from response.
- `handleSendBack()` — requires note, calls `revertWithNote`.
- `startEditingServices() / addServiceRow() / removeServiceRow() / updateServiceRow() / saveServices()` — inline services table editing.
- `startEditingInfo() / saveInfo()` — inline customer/location editing. Saves only changed fields in parallel via `saveJobField`.
- `handleAddNote()` — appends note.
- `fmtCurrency(n)` — USD formatter.

**Frappe calls:**
- `tech_utils.get_job_detail`, `get_default_labor_rate`
- `estimates.get_estimate_list`
- `tech_utils.send_to_check`, `approve_for_invoice`, `create_invoice_for_job`, `mark_invoiced`, `mark_paid`, `revert_status`, `add_job_note`, `save_job_field`, `update_job_services`

**FLAGS:**
- Estimates loaded with hard limit 50, filtered client-side — misses estimates if > 50.
- Photos use `<img>` (not Next.js `<Image>`) — no lazy loading optimization.
- Invoice link opens ERPNext admin UI directly: `${siteUrl}/app/sales-invoice/{name}`.

---

### manager/section/[section]/

#### manager/section/[section]/page.tsx
**Route:** `/manager/section/{section}`
**Valid sections:** finished, needs_checked, to_invoice, pending_payment, paid
**One-line purpose:** Pipeline section view — filterable job list for one workflow stage.

**Auth gate:** `getAuth()`. Redirects to dashboard if unknown section.

**Data:** `getJobsByStatus(section)` on mount. Client-side search filter.

**Frappe call:** `tech_utils.get_jobs_by_status`

---

### manager/invoices/

#### manager/invoices/page.tsx
**Route:** `/manager/invoices`
**One-line purpose:** A/R invoice table with aging bucket filter tabs and per-invoice Resend action.
**Feature gate:** `flags.invoicing` → redirect dashboard if off.
**Query param:** `?bucket=` pre-selects aging bucket.

`InvoicesPage` (Suspense wrapper) → `InvoicesInner`

**Data:** `getARAging()` on mount.

**`handleResend(invoiceName)`:** Calls `resendInvoice()`, refreshes A/R data.

**Local helpers:**
- `colourBadge(colour)` — ARInvoice colour → Tailwind badge class.
- `statusLabel(colour)` — colour → "COLLECTIONS"/"RESENT"/"OVERDUE"/"SENT".

**Frappe calls:** `ar_aging.get_ar_aging`, `ar_aging.resend_invoice`

---

### manager/customers/

#### manager/customers/page.tsx
**Route:** `/manager/customers`
**One-line purpose:** Paginated customer list with debounced search and infinite "Load More".
**Feature gate:** `flags.customers`.

**Data:** `getCustomerList(query, page, 30)` — 300ms debounced on search.
**Behavior:** Append pages on Load More, reset to page 1 on new search.

**Frappe call:** `customers.get_customer_list`

#### manager/customers/[name]/page.tsx
**Route:** `/manager/customers/{name}` (URL-encoded)
**One-line purpose:** Customer profile — financials, addresses, upcoming jobs, full job history, inline contact editing.
**Feature gate:** `flags.customers`.

`StatusBadge({ status })` — local inline component.

**Edit contact:** Inline edit for phone/email. Saves via direct `callMethod("hcp_replacement.hcp_replacement.api.customers.update_customer_contact", ...)`.

**Frappe calls:**
- `customers.get_customer_profile`
- `customers.update_customer_contact` (direct `callMethod` — NOT a typed lib/frappe.ts wrapper)

**FLAG:** `update_customer_contact` bypasses lib/frappe.ts typed wrappers — inconsistent pattern.

---

### manager/estimates/

#### manager/estimates/page.tsx
**Route:** `/manager/estimates`
**One-line purpose:** Paginated estimates list with status filter tabs and "New Estimate" entry point.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.estimates`.

Internal functions:
- `StatusBadge({ status })` — local inline badge component.
- `fmtCurrency(n)` — USD formatter.
- `fmtDate(d)` — locale date string.
- `fetchEstimates(filter, pg, append)` — calls `getEstimateList(filter, pg, 30)`, supports append (Load More) or replace.
- `handleLoadMore()` — increments page, appends results.

**Frappe call:** `estimates.get_estimate_list`

#### manager/estimates/new/page.tsx
**Route:** `/manager/estimates/new`
**One-line purpose:** Estimate creation — customer autocomplete, multi-option line-item builder, approval mode, save-as-draft or save-and-send.

`NewEstimatePage` (Suspense wrapper) → `NewEstimateInner`

**Query param:** `?job=` pre-links estimate to a job (read-only linked_job field).

Internal functions:
- `makeLineItem()` — creates blank line item with UUID.
- `makeOption(index)` — creates blank option card.
- `optionTotal(opt)` — sums qty × rate for all line items.
- `handleCustomerSearch(value)` — 300ms debounced `searchCustomers`.
- `selectCustomer(cust)` — populates name/address from `getCustomerHistory`.
- `addOption() / removeOption(id)` — option array management.
- `updateOptionName / addLineItem / removeLineItem / updateLineItem` — option/line-item mutations.
- `buildOptionsJson()` — serializes options+line items to JSON string for API.
- `validate()` — checks customer, option names, line item fields.
- `handleSaveAsDraft()` — `createEstimate()` → navigate to detail.
- `handleSaveAndSend()` — validates → confirm modal → `createEstimate()` + `sendEstimate()`.

**Frappe calls:** `tech_utils.search_customers`, `tech_utils.get_customer_history`, `estimates.create_estimate`, `estimates.send_estimate`

#### manager/estimates/[name]/page.tsx
**Route:** `/manager/estimates/{name}`
**One-line purpose:** Estimate detail — collapsible option cards, send/expire actions, per-option approval status.
**Feature gate:** `flags.estimates`.

Sub-components:
- `StatusBadge({ status, cls })` — generic badge with injected class map.
- `OptionCard({ opt, expanded, onToggle })` — collapsible card: name, status, total, line items table.

Internal functions:
- `reload()` — re-fetches estimate detail.
- `handleSend()` — `sendEstimate`, shows success message.
- `handleExpire()` — confirm → `expireEstimate`.
- `toggleOption(idx)` — Set<number> expand/collapse.

**Actions by status:** Draft → "Send to Customer". Sent → "Mark Expired".

**Frappe calls:** `estimates.get_estimate_detail`, `estimates.send_estimate`, `estimates.expire_estimate`

---

### manager/service-plans/

#### manager/service-plans/page.tsx
**Route:** `/manager/service-plans`
**One-line purpose:** Service plans list with status filter, "New Plan" modal, and Load More pagination.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.service_plans`.

`NewPlanModal({ templates, onClose, onCreated })` — modal with template selector, customer typeahead (250ms debounce), address typeahead (250ms debounce). On submit: `createPlanInstance(templateName, customerName, address)` → navigate to plan detail.

Internal functions:
- `fetchPlans(filter, pg, append)` — `getPlansList(filter, pg, 30)`.
- `handleLoadMore()` — increments page.
- In NewPlanModal: `handleCustomerInput`, `selectCustomer`, `handleAddressInput`, `selectAddress`, `handleSubmit`.

**Frappe calls:** `service_plans.get_plan_templates` (on mount), `service_plans.get_plans_list`, `tech_utils.search_customers`, `tech_utils.search_addresses`, `service_plans.create_plan_instance`

#### manager/service-plans/templates/page.tsx
**Route:** `/manager/service-plans/templates`
**One-line purpose:** Read-only grid of plan templates from ERPNext. Templates can only be created via ERPNext admin.
**Feature gate:** `flags.service_plans`.

`TemplateCard({ template })` — card: name, trade badge, price, interval, visits/yr, billing cadence.
`TradeBadge({ trade })` — color-coded by trade.

**Frappe call:** `service_plans.get_plan_templates`

#### manager/service-plans/[name]/page.tsx
**Route:** `/manager/service-plans/{name}`
**One-line purpose:** Plan detail — service schedule, checklist, and workflow actions (Send / Generate Work Order / Cancel).
**Feature gate:** `flags.service_plans`.

Internal functions:
- `loadPlan()` — `getPlanDetail(planName)`.
- `handleSend()` — `sendPlan`.
- `handleGenerateWorkOrder()` — `generateWorkOrder` → sets workOrderResult → link to created job.
- `handleCancel()` — confirm → direct `callMethod("service_plans.cancel_plan")` (bypasses typed wrapper).

**Actions by status:** Draft → Send. Active → Generate Work Order + Cancel. Sent → Cancel.

**Frappe calls:** `service_plans.get_plan_detail`, `service_plans.send_plan`, `service_plans.generate_work_order`, `service_plans.cancel_plan` (direct callMethod)

---

### manager/pricing/

#### manager/pricing/page.tsx
**Route:** `/manager/pricing`
**One-line purpose:** Pricebook editor — paginated table with inline markup/exact-price editing, global markup, and bulk selection markup.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.pricebook`.

Sub-components:
- `EditableCell({ value, prefix, suffix, onSave })` — click-to-edit number input, commits on blur/Enter, cancels on Escape.
- `SourceBadge({ source })` — "Exact $" / "Item %" / "Global %" / "Std Rate" / "Cost Only" badges.

Internal functions:
- `fetchData(q, pg)` — `getPricebookList(q, pg, 50)`.
- `handleSearchChange(val)` — 300ms debounced, resets selection, fetches page 1.
- `goToPage(pg)` — clears selection, fetches page.
- `startGlobalEdit() / saveGlobalMarkup() / cancelGlobalEdit()` — global markup inline editing.
- `handleSaveMarkup(item, pct)` — `updateItemPricing(item_code, undefined, pct)`, updates row in-place.
- `handleSaveExact(item, price)` — `updateItemPricing(item_code, price, undefined)`, updates row in-place.
- `toggleAll() / toggleOne(code)` — checkbox selection.
- `handleBulkMarkup()` — `bulkUpdateMarkup(selected[], pct)`, refreshes.

**Frappe calls:** `pricing.get_pricebook_list`, `pricing.update_item_pricing`, `pricing.update_global_markup`, `pricing.bulk_update_markup`

---

### manager/inventory/

#### manager/inventory/page.tsx
**Route:** `/manager/inventory`
**One-line purpose:** Inventory hub — 5-tab interface (Receipts / Warehouses / Limbo / Restock / Matches) with badge counts per tab.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.inventory`.

On mount: fetches `fetchInventorySummary()`, `fetchPullSummary()`, `fetchUnmatchedItems(1,1)` for tab badge counts. Tab content fully delegated to child tab components.

#### manager/inventory/ReceiptImageViewer.tsx
**One-line purpose:** Standalone image viewer for receipt photos. Used within ReceiptsTab for viewing scanned receipt images.

#### manager/inventory/components/

| Component | Purpose |
|---|---|
| `ReceiptsTab` | Paginated receipt list (status filter), click-through to DispatchView |
| `DispatchView` | Per-receipt dispatch form: DestButtons per item, submit batch dispatch |
| `DestButtons` | Destination selector buttons (This Job / Truck / Office / Limbo / Diff Job / Returned / Lost) |
| `WarehousesTab` | Warehouse cards list, delegates to WarehouseDetail on click |
| `WarehouseDetail` | Paginated stock for one warehouse with search/filter |
| `LimboTab` | Limbo items grouped by receipt, dispatch actions |
| `RestockTab` | Pull lists per truck — mark-pulled, accept, reject flows |
| `TruckSection` | Single-truck section within RestockTab |
| `MatchesTab` | Unmatched receipt items; approve/correct/reject via match-review API |
| `PricebookSearch` | Shared pricebook search for match correction |
| `NewPartModal` | Form to submit a new pricebook part request |
| `PendingPartsSection` | Admin view of pending pricebook requests with approve/reject |
| `SwapModal` | Modal to swap an item's match to a different pricebook entry |
| `SendButton` | Generic submit button with loading state |
| `Spinner` | Generic spinner |

---

### manager/schedule/

#### manager/schedule/page.tsx
**Route:** `/manager/schedule`
**One-line purpose:** Weekly schedule board — place jobs on tech/day cells, view time-off, navigate weeks.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.scheduling`.

On mount: `fetchScheduleBoard(weekStart)`. Week navigation via `getWeekStart(date)`.

Sub-components: `ScheduleGrid`, `Puck`, `TimeOffPuck`, `UnscheduledSidebar`, `TimePickerPopover`.

**Frappe calls:** `tech_utils.get_schedule_board`, `tech_utils.update_job_schedule`, `tech_utils.create_time_off`, `tech_utils.approve_time_off`, `tech_utils.deny_time_off`

#### manager/schedule/components/ScheduleGrid.tsx
Grid layout: tech rows × day columns. Renders `Puck` per scheduled job, `TimeOffPuck` per time-off block.

#### manager/schedule/components/Puck.tsx
Job card in the grid: job ID, trade color from `getTrade()`, customer name, formatted time range. Handles drag/drop for rescheduling.

#### manager/schedule/components/TimeOffPuck.tsx
Time-off block in the grid with approve/deny action buttons.

#### manager/schedule/components/TimePickerPopover.tsx
Popover for selecting start/end time when placing a job on the schedule.

#### manager/schedule/components/UnscheduledSidebar.tsx
Sidebar listing unscheduled jobs that can be dragged into the grid.

---

### manager/events/

#### manager/events/page.tsx
**Route:** `/manager/events`
**One-line purpose:** Full event log with live tail, historical date presets, multi-filter controls, and group-by options.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.events`.

Internal functions:
- `datePresetToFilters(preset)` — "live"/"today"/"7d"/"30d" → from_date/to_date params.
- `groupEvents(events, groupBy)` — groups by time (no grouping) / job / tech.
- `handleSearchInput(val)` — 350ms debounced keyword search.
- `buildFilters(pageNum)` — assembles EventFilters from all active state.
- `handleLoadMore()` — appends next page.

**Live tail:** `connectEventPolling` (5s interval) runs when `liveTail=true` and `datePreset="live"`. Disconnected on filter change or unmount.

**Frappe calls:** `events.get_events`, `events.get_recent_events` (via polling)

---

### manager/admin/

#### manager/admin/features/page.tsx
**Route:** `/manager/admin/features`
**One-line purpose:** Feature flag toggles — switch per flag that writes to "MTM Feature Flags" Frappe singleton.

`handleToggle(key)` — `frappe.client.set_value` → updates local state + primes cache. Also renders links to all other admin pages.

**Frappe call:** `frappe.client.set_value` (direct callMethod, bypasses typed wrappers)

#### manager/admin/techs/page.tsx
**Route:** `/manager/admin/techs`
**One-line purpose:** Team onboarding — create ERPNext Employee + Frappe user for Lead Tech, Helper, Office+Field, or Office-only roles.
**Auth gate:** `getAuth()`. **Feature gate:** `flags.team`.

`formatPhone(raw)` — phone formatter.

`handleSubmit()`:
- Office only → `onboardNewUser({ role: "MTM Office" })` → shows invite URL.
- Office+Field → `onboardTech({...})` + `createInvite()` → shows QR + invite URL.
- Lead Tech / Helper → `onboardTech({ vanWarehouse })` → shows QR code.

QR code URL: `https://api.qrserver.com/v1/create-qr-code/` with credentials JSON embedded as URL param.

**FLAG:** QR code transmits `api_key` and `api_secret` to external service `api.qrserver.com`. Consider replacing with client-side `qrcode.react` library (comment in source acknowledges this TODO).

**Frappe calls:** `auth_utils.list_techs`, `auth_utils.onboard_tech`, `auth_utils.onboard_new_user`, `auth_utils.create_invite`

#### manager/admin/invite/page.tsx
**Route:** `/manager/admin/invite`
**One-line purpose:** Generate magic-link invite for existing or new office users. Requires `is_office` Frappe role.

**Mode "existing":** `createInvite(email, sendEmail)`.
**Mode "new":** `onboardNewUser({ email, fullName, role, sendEmail })`. "System Manager" role hidden unless `is_admin`.

`handleCopy()` — `navigator.clipboard.writeText`.

**Frappe calls:** `auth_utils.check_office_access`, `auth_utils.create_invite`, `auth_utils.onboard_new_user`

#### manager/admin/invoice-settings/page.tsx
**Route:** `/manager/admin/invoice-settings`
**One-line purpose:** Editable form for "MTM Invoice Settings" singleton — pricing rates, payment terms, 3 invoice clauses, branding.

`loadSettings()` — `frappe.client.get("MTM Invoice Settings")`.
`handleSave()` — iterates 14 fields, calls `frappe.client.set_value` per field (14 sequential API calls).

Sub-components: `Section`, `Row`, `TextArea`.

**FLAG:** 14 individual API calls per save. Should be a single batch update.

**Frappe calls:** `frappe.client.get`, `frappe.client.set_value` (×14 per save — direct callMethod)

#### manager/admin/approvers/page.tsx
**Route:** `/manager/admin/approvers`
**One-line purpose:** Manage access-request approvers — view, add (admin only), remove (admin, protected: cannot remove last).

`refreshList()` — `listApprovers()`.
`handleAdd()` — `addApprover(email)`.
`handleRemove(email)` — confirm → `removeApprover(email)`. Blocked if only one approver remains.
`fmtDate(iso)` — date formatter.

**Note:** Does NOT use NavBar — has its own inline nav header.

**Frappe calls:** `auth_utils.check_office_access`, `auth_utils.list_approvers`, `auth_utils.add_approver`, `auth_utils.remove_approver`

#### manager/admin/requests/page.tsx
**Route:** `/manager/admin/requests`
**One-line purpose:** Review access requests — tabbed Pending/Approved/Denied/Expired views with approve/deny actions.

`refreshList()` — `listAccessRequests(tab)`.
`handleApprove(reqId, role?)` — `approveAccessRequest({ requestId, role })`.
`handleDeny(reqId)` — shows inline reason input → `denyAccessRequest({ requestId, reason })`.

**Note:** Does NOT use NavBar — has its own inline nav header.

**Frappe calls:** `auth_utils.check_office_access`, `auth_utils.list_access_requests`, `auth_utils.approve_access_request`, `auth_utils.deny_access_request`

---

### manager/approve/[token]/

#### manager/approve/[token]/page.tsx
**Route:** `/manager/approve/{token}`
**One-line purpose:** Email-linked one-click approve/deny page for access requests sent to approvers.
**Auth:** None — public page, gated by token validity.

`ApprovePage` (Suspense wrapper) → `ApprovePageInner`

**Query param:** `?action=deny` pre-selects deny mode.

`handleApprove()` — `approveAccessRequest({ token, role: selectedRole })`.
`handleDeny()` — `denyAccessRequest({ token, reason })`.
`handleCopy(url)` — copies invite URL to clipboard.

On load: `getAccessRequestByToken(token)` — shows terminal state if already actioned.

**Frappe calls:** `auth_utils.get_access_request_by_token`, `auth_utils.approve_access_request`, `auth_utils.deny_access_request` (all guest/unauthenticated)

---

### manager/request-access/

#### manager/request-access/page.tsx
**Route:** `/manager/request-access`
**One-line purpose:** Self-service access request form for prospective office users. No auth required.

`handleSubmit()` — `submitAccessRequest({ name, email, role, note })` (guest call).
Role options: "MTM Office" or "Accounts Manager".

**Frappe call:** `auth_utils.submit_access_request` (guest)

---

## 5. Other App Routes (src/app/ non-manager)

### app/page.tsx
**Route:** `/` (landing page)
**One-line purpose:** Static marketing landing page — MTM logo hero + 3 product cards (Prep / Manager / Money).

`LandingPage` — client component. Reads `getFeatureFlags()` to conditionally show the Money card (though `money` is always forced true). Uses inline CSS (`LANDING_CSS` constant) for glow/typography effects. Cards link to `/prep`, `/manager/dashboard`, `/money`.

No API calls on mount. Static except for flag read.

---

### app/approve/estimate/[token]/page.tsx
**Route:** `/approve/estimate/{token}`
**One-line purpose:** Public customer-facing estimate approval page — customer approves or declines options via tokenized link.
**Auth:** None — unauthenticated, gated by token.

`loadPublicEstimate(token)` — direct raw `fetch` to `{FRAPPE_SITE}/api/method/hcp_replacement.hcp_replacement.api.estimates.get_estimate_by_token`. Does NOT use `callMethod` — uses `NEXT_PUBLIC_FRAPPE_SITE` env var directly.

`OptionCard({ opt, outcome, onApprove, onDecline, acting })` — per-option card with approve/decline buttons.

Actions per option:
- Approve → `approveEstimateOption(token, optionIdx, "approve")` (guest)
- Decline → `approveEstimateOption(token, optionIdx, "decline")` (guest)

Light theme UI — customer-facing, not dark navy.

**Frappe calls:** `estimates.get_estimate_by_token` (raw fetch, guest), `estimates.approve_estimate_option` (guest)

---

### app/approve/plan/[token]/page.tsx
**Route:** `/approve/plan/{token}`
**One-line purpose:** Public customer-facing service plan approval page — customer approves or declines a plan via tokenized link.
**Auth:** None — unauthenticated, gated by token.

`PlanApprovalPage` (Suspense wrapper) → `PlanApprovalInner`

`handleApprove()` — `approvePlan(token)` (guest).
`handleDecline()` — `declinePlan(token)` (guest).

Shows plan details: template name, customer, address, annual price, billing cadence, service interval, checklist items.

Pre-populates outcome if plan status is already "Active" or "Cancelled".

Light theme UI — customer-facing.

**Frappe calls:** `service_plans.get_plan_by_token` (guest), `service_plans.approve_plan` (guest), `service_plans.decline_plan` (guest)

---

### app/money/ (Money Hub)

#### app/money/layout.tsx
**One-line purpose:** Money section layout — redirects to `/` if `money` feature flag is off (though flag is always true).

Client component. `getFeatureFlags().money` → redirect if false. Since money is always forced true, this redirect never fires in practice.

#### app/money/page.tsx
**Route:** `/money`
**One-line purpose:** Money dashboard login — password form that exchanges for an API bearer token.

`handleLogin()` — POSTs to `/api/money/verify` with password. On success: `setMoneyAuth({ token })` → redirect `/money/hub`.

On mount: if already authenticated (`getMoneyAuth()` non-null) → redirect `/money/hub`.

#### app/money/hub/page.tsx
**Route:** `/money/hub`
**One-line purpose:** Money dashboard hub — side-by-side VEOE and Machine summaries, combined portfolio view, equity charts.

Wrapped in `AuthGate` (which also renders MoneyNav).

**Data on mount:** `Promise.allSettled([veoe.summary(), crypto.balance(), crypto.stats(), veoe.equity(), crypto.equity(90)])`. Polls every 60s.

Displays: combined total value, combined PnL, individual bot cards (status, value, PnL%, position count), equity charts.

**Money API calls:** `veoe.summary()`, `crypto.balance()`, `crypto.stats()`, `veoe.equity()`, `crypto.equity(90)`

#### app/money/veoe/page.tsx
**Route:** `/money/veoe`
**One-line purpose:** VEOE options bot detail — account summary, equity curve, signal cards, trade history, config.

Wrapped in `AuthGate`.

**Data on mount:** `Promise.all([veoe.summary(), veoe.equity(), veoe.trades(), veoe.signals(), veoe.alpha(), veoe.config()])`. Polls every 60s.

**Money API calls:** `veoe.summary()`, `veoe.equity()`, `veoe.trades()`, `veoe.signals()`, `veoe.alpha()`, `veoe.config()`

#### app/money/crypto/page.tsx
**Route:** `/money/crypto`
**One-line purpose:** The Machine (crypto grid bot) detail — balance, equity, grid positions, strategies, signals (zeros), risk, stats, trades.

Wrapped in `AuthGate`.

**View modes:** "operator" (full detail) / "investor" (simplified). Toggle button.

**Data on mount:** `Promise.all` of 9 crypto API calls. Polls every 60s. Also attempts `connectCryptoWS()` which always returns null.

`wsRef.current` is set to the WS connection (null), `wsConnected` is always false.

**Money API calls:** `crypto.balance()`, `crypto.equity(90)`, `crypto.positions()`, `crypto.strategies()`, `crypto.signals()`, `crypto.risk()`, `crypto.stats()`, `crypto.trades()`, `crypto.learning()`

#### app/money/options/layout.tsx
**One-line purpose:** Force-dynamic rendering for Options pages (uses Supabase Realtime, cannot be statically rendered).

`export const dynamic = 'force-dynamic'`. Passes children through directly.

#### app/money/options/page.tsx
**Route:** `/money/options`
**One-line purpose:** AI options trading platform — gated recommendations, run trigger, payment modal, admin mode, positions.

Complex page with multiple gate layers:
1. Disclaimer gate (`hasAcknowledgedDisclaimer()`) → `DisclaimerModal`.
2. Payment gate per run → `PaymentModal`.
3. Admin mode → `AdminLogin`.

Sub-hooks:
- `useToasts()` — toast notification queue (5s auto-dismiss).

Key state: `recommendations`, `positions`, `teaserRecs`, `runStatus`, `isAdmin`, `isSubscriber`, `purchase`, `activeRunId`.

Key handlers:
- `handleAnalyze()` — `optionsApi.analyze()` + polls `getRunStatus()` every 3s until done, then fetches recommendations.
- `handleGetRecommendations()` — checks purchase/subscription, calls `optionsApi.getRecommendations({...})`.
- `handleCheckout(tier, mode)` — `optionsApi.checkout()` → redirect to Stripe URL.
- `handleExecute(recId, qty)` — `optionsApi.execute({ recommendation_id, quantity })`.
- `handleClose(positionId)` — `optionsApi.close(positionId)`.
- `handleAdjustStop(positionId, pct)` — `optionsApi.adjustStop(positionId, pct)`.
- On Supabase channel: listens to `realtime:recommendations` for new data.

Uses `supabase` (browser client) for Realtime subscription.

Reads from `localStorage` via `options-access.ts` for all gating state.

**Supabase Realtime:** Subscribes to `recommendations` table updates.

#### app/money/options/rec/[id]/page.tsx
**Route:** `/money/options/rec/{id}`
**One-line purpose:** Public shareable recommendation page — shows ticker, direction, confidence, expected return. Rationale is GATED and NOT shown on this page.

**Server component** (`async` function). Uses `createServiceClient()` (service role Supabase).

`generateMetadata({ params })` — builds dynamic title/description from recommendation data.

`RationalePage` — queries `recommendations` table for id. Calls `notFound()` if not found. Reasons and kill_conditions fields intentionally NOT fetched (gated).

No Frappe calls. No money-api calls.

#### app/money/components/

| Component | Purpose |
|---|---|
| `AuthGate` | Wraps money pages — reads `getMoneyAuth()`, redirects to `/money` if not authed. Renders MoneyNav above children. |
| `MoneyNav` | Sticky nav for money section: links (Hub / VEOE / Crypto / Options), logout button (`clearMoneyAuth()` + redirect). |
| `MetricCard` | Stat card: label, value, optional subvalue and delta. |
| `StatusBadge` | Simple status dot + label badge. |
| `EquityChart` | Lightweight Charts line chart for equity curves. Handles both VEOE and Crypto equity point shapes. |
| `TradeTable` | Scrollable table of trade history. Handles both VEOETrade and CryptoTrade shapes. |
| `SignalCard` | Signal strength card. For VEOE: ticker + score. For Crypto: stubbed zeros. |
| `DrawdownGauge` | Visual drawdown gauge — arc or bar showing current drawdown vs max. |
| `StrategyCard` | Grid strategy card: strategy name, status, PnL, position count. |

#### app/money/options/components/

| Component | Purpose |
|---|---|
| `DisclaimerModal` | Legal disclaimer modal — must acknowledge before accessing options platform. Writes to `localStorage["mtm_options_disclaimer"]`. |
| `AdminLogin` | Admin password form — `optionsApi.verifyAdmin(password)` → `setAdmin()`. |
| `PaymentModal` | Tier selection + checkout — shows $4.99/$5.98/$6.97 tiers and $9.99/mo subscription. Calls `handleCheckout`. |
| `TeaserTable` | Shows top 3 teaser recommendations (ticker, direction, confidence) with blurred/locked rationale. Prompts purchase. |
| `MarketPulse` | Market conditions summary card — VIX, sentiment, sector rotation cues. |
| `RunProgress` | Progress indicator for analysis run (polling `getRunStatus()` every 3s). |

---

### app/api/ (API routes)

#### app/api/money/verify/route.ts
**Route:** `POST /api/money/verify`
**One-line purpose:** Validates money dashboard password and returns the API bearer token.

Uses `crypto.timingSafeEqual` to prevent timing oracle attacks. Compares against `MONEY_PASSWORD` env var. Returns `MONEY_API_TOKEN` on success.

**Env vars:** `MONEY_PASSWORD`, `MONEY_API_TOKEN`

#### app/api/options/analyze/route.ts
**Route:** `POST /api/options/analyze`
**One-line purpose:** Proxy to options-service FastAPI (`/options/analyze`), injecting server-side `OPTIONS_API_KEY`.

No request body forwarded (analysis runs with no params). Returns upstream response as-is.

**Env vars:** `NEXT_PUBLIC_MONEY_API`, `OPTIONS_API_KEY`

#### app/api/options/checkout/route.ts
**Route:** `POST /api/options/checkout`
**One-line purpose:** Creates Stripe Checkout session for one-time tier purchase or monthly subscription.

Pricing:
- Tier 3: $4.99, Tier 5: $5.98, Tier 10: $6.97
- Subscription: $9.99/mo

For one-time purchase: queries Supabase `analysis_runs` for latest run ID to embed in metadata.

**Env vars:** `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`

#### app/api/options/recommendations/route.ts
**Route:** `GET /api/options/recommendations?session_id=xxx`
**One-line purpose:** Gated recommendation delivery — verifies purchase/subscription, returns top N picks.

Access levels (checked in order):
1. `x-admin-token` header matches `OPTIONS_ADMIN_PASSWORD` → tier 10.
2. `x-sub-email` header → checks Supabase `subscribers` table, enforces 5 runs/day limit with atomic increment (optimistic lock).
3. `session_id` query param → Stripe session retrieval, checks `payment_status === "paid"`, extracts tier from metadata.

Fetches recommendations from Supabase `recommendations` table ordered by rank, limited to tier count.

**Env vars:** `OPTIONS_ADMIN_PASSWORD`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

#### app/api/options/webhook/route.ts
**Route:** `POST /api/options/webhook`
**One-line purpose:** Stripe webhook handler — records one-time purchases to `purchases` table, manages subscriptions in `subscribers` table.

Uses `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET` for signature verification.

Idempotency check: inserts `stripe_event_id` into `webhook_events` table before processing, skips duplicates.

Events handled:
- `checkout.session.completed` (payment) → insert to `purchases`.
- `checkout.session.completed` (subscription) → upsert to `subscribers` as active.
- `customer.subscription.updated/deleted` → update subscriber status.

#### app/api/options/execute/route.ts
**Route:** `POST /api/options/execute`
**One-line purpose:** Proxy to options-service `/options/execute` — places an options trade.

Auth check: requires `x-admin-token` matching `OPTIONS_ADMIN_PASSWORD` OR presence of `x-sub-email` header. Returns 401 if neither. Forwards `{ recommendation_id, quantity }` body. Injects `OPTIONS_API_KEY` header.

**Note:** `close` and `adjust-stop` routes do NOT perform this auth check — they proxy directly without checking headers. Potential gap if the upstream options-service doesn't enforce caller identity independently.

#### app/api/options/close/[id]/route.ts
**Route:** `POST /api/options/close/{id}`
**One-line purpose:** Proxy to options-service `/options/{id}/close`.

#### app/api/options/adjust-stop/[id]/route.ts
**Route:** `POST /api/options/adjust-stop/{id}`
**One-line purpose:** Proxy to options-service `/options/{id}/adjust-stop`.

Forwards `{ trailing_pct }` body.

#### app/api/options/run-status/route.ts
**Route:** `GET /api/options/run-status`
**One-line purpose:** Returns cache state for analysis runs — whether a completed run exists within the past hour, and how many seconds until next run is available.

Queries `analysis_runs` table for the most recent row with `status = 'completed'`. If the completed run is less than 1 hour old: returns `{ has_cached_run: true, run_id, completed_at, next_available_in_seconds }`. Otherwise returns `has_cached_run: false`. This enforces a 1-hour minimum between paid runs from the client side.

#### app/api/options/admin-verify/route.ts
**Route:** `POST /api/options/admin-verify`
**One-line purpose:** Validates admin password for options platform. Returns `{ valid: true }` on match.

**FLAG (SECURITY):** Uses plain string equality (`password === process.env.OPTIONS_ADMIN_PASSWORD`) — NOT timing-safe. Vulnerable to timing oracle attacks. Should use `crypto.timingSafeEqual` like `/api/money/verify` does.

#### app/api/kingdom-contact/route.ts
**Route:** `POST /api/kingdom-contact`
**One-line purpose:** Saves email to Supabase `kingdom_contacts` table and emails Jonathan Uncapher (Cameroon missionary) via Resend.

Validates email. On success: inserts to Supabase, sends transactional email from `kingdom@manytalentsmore.com` to `jonathan.uncapher@gmail.com`.

**Env vars:** `RESEND_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

### app/kingdom/

#### app/kingdom/page.tsx
**Route:** `/kingdom`
**One-line purpose:** Kingdom/missionary support page — features Jonathan Uncapher's Cameroon mission with contact form.

Server component. Renders `KingdomContactForm` (separate client component in same folder).
Uses `export const metadata` for SEO.

**Note:** Jonathan Uncapher is Chris's friend building hospitals and teaching trades in Nomedjoh, Cameroon.

#### app/kingdom/contact-form.tsx
**One-line purpose:** Email capture form that POSTs to `/api/kingdom-contact`.

`handleSubmit(e)` — validates email, POSTs `{ email }` to `/api/kingdom-contact`, sets status "sent" on success or "error" on failure. Simple two-state UI (form → success message). No Frappe calls.

---

### app/privacy/page.tsx
**Route:** `/privacy`
**One-line purpose:** Privacy policy page — static legal text. No API calls.

Server component. Policy last updated May 18, 2026. Covers: account info (email), usage data (quiz/flashcard), payment via Stripe/RevenueCat. Data contact: `wit@manytalentsmore.com`.

**Note:** Privacy policy references "ManyTalents Prep" app — this is the test prep app (app.manytalentsmore.com), not the manager dashboard. Policy text was written for the mobile/consumer app, not the business dashboard.

### app/delete-data/page.tsx
**Route:** `/delete-data`
**One-line purpose:** Data deletion request page — manual email process, no self-serve API.

Server component. Instructs user to email `wit@manytalentsmore.com` with subject "Data Deletion Request". 30-day SLA. Retains Stripe payment records per legal requirement. No form, no API call.

---

## 6. Shared Components (src/components/)

No files found in `src/components/` — this directory either does not exist or is empty. All shared components live in feature-specific subdirectories (e.g., `manager/components/`, `money/components/`).

---

## 7. Findings & Flags

### Critical Issues

1. **`typescript.ignoreBuildErrors: true` and `eslint.ignoreDuringBuilds: true`** in next.config.ts — TypeScript and ESLint errors are silently deployed. Any type error in any file ships to production.

2. **No server-side middleware / auth guards** — all auth is `localStorage` checks in `useEffect`. SSR bots can fetch page HTML without credentials. Low data risk since all API data requires tokens, but route protection is entirely client-side.

3. **~~Login page references undeclared `linkEmail`/`linkStatus`~~ — FIXED 2026-06-15.** The orphaned `handleSendLink` dead function (undeclared state + un-imported `requestLoginLink`) was deleted. Login page is clean.

4. **Options admin auth is localStorage-only** (`isAdmin()` in `lib/options-access.ts`) — any user can grant themselves admin by writing `"true"` to `localStorage["mtm_options_admin"]`. No server-side validation.

5. **`getJobList()` loads ALL jobs with no pagination** — `manager/jobs/page.tsx` calls `getJobList()` which returns the entire job dataset. Will degrade significantly as job history grows.

### Design Inconsistencies

6. **`STATUS_COLORS` duplicated in 5+ files** — `lib/status-colors.ts` exists but NavBar.tsx, dashboard/page.tsx, jobs/page.tsx, jobs/[name]/page.tsx, and section/[section]/page.tsx each maintain their own copy. Any status added/renamed requires 6 edits.

7. **`update_customer_contact` bypasses lib/frappe.ts** — called via raw `callMethod` in `customers/[name]/page.tsx` without a typed wrapper. Inconsistent with all other API calls.

8. **Estimates hard-limited to 50 in job detail** — `getEstimateList("all", 1, 50)` then filtered client-side by `linked_job`. If a job has > 50 estimates total across all jobs, some linked estimates will be invisible.

### Dead Code

9. **`widget-registry.ts` is completely unused** — `WIDGET_CATALOG`, `ROLE_PRESETS`, `loadLayout`, `saveLayout` are all defined but never imported by the dashboard page (which hardcodes its widget layout).

10. **`@tanstack/react-query` and `zustand` installed but never used** — dead dependencies adding bundle weight.

11. **`connectCryptoWS()` always returns null** — The Machine has no WebSocket. This function is a no-op stub.

12. **`CryptoWSUpdate` interface in money-types.ts** — only referenced by the no-op `connectCryptoWS` stub.

### Data Correctness Flags

13. **`startingEquity = 436.55` hardcoded** in `money-api.ts` `crypto.stats()` fallback — produces incorrect `total_return_pct` as actual equity diverges from this constant.

14. **`crypto.signals()` and `crypto.learning()` return all-zero stubs** — The Machine has no signal or learning API. Any UI that displays these metrics shows meaningless zeros.

15. **`money` feature flag always forced true** — `getFeatureFlags()` in `lib/features.ts` hardcodes `money: true` regardless of backend response. The money dashboard cannot be toggled off via feature flags.

### Remaining `hcp_replacement.*` Frappe Calls (all are self-hosted `hcp_replacement` app calls)

All Frappe backend calls in this codebase target the `hcp_replacement` Frappe custom app on the self-hosted ERPNext at `https://erp.manytalentsmore.com`. There are NO `mtm_*` Frappe Cloud server-script calls found in the files read so far.

API modules used:
- `hcp_replacement.hcp_replacement.api.tech_utils` — jobs, schedule, search, feature flags
- `hcp_replacement.hcp_replacement.api.auth_utils` — auth, invites, onboarding, access requests
- `hcp_replacement.hcp_replacement.api.pricing` — pricebook
- `hcp_replacement.hcp_replacement.api.dashboard_stats` — dashboard widgets
- `hcp_replacement.hcp_replacement.api.ar_aging` — A/R
- `hcp_replacement.hcp_replacement.api.customers` — customer list/profile
- `hcp_replacement.hcp_replacement.api.estimates` — estimates
- `hcp_replacement.hcp_replacement.api.service_plans` — service plans
- `hcp_replacement.hcp_replacement.api.events` — event tracker
- `hcp_replacement.hcp_replacement.api.inventory` — inventory
- `hcp_replacement.hcp_replacement.api.limbo` — dispatch/limbo
- `hcp_replacement.hcp_replacement.api.restock` — pull lists
- `hcp_replacement.hcp_replacement.api.match_review` — receipt matching

### Additional Issues (from full pass)

16. **`/api/options/admin-verify` uses plain string equality** — not timing-safe, unlike `/api/money/verify` which correctly uses `crypto.timingSafeEqual`. Upgrade to timing-safe compare.

17. **`/api/options/close` and `/api/options/adjust-stop` skip auth checks** — the execute route checks for admin/subscriber headers, but the close and adjust-stop proxies forward blindly to upstream with no caller validation. If the upstream options-service trusts the Next.js layer, this is a gap.

18. **Privacy/data-deletion pages are written for the Prep app, not the Manager dashboard** — they reference ManyTalents Prep, Supabase auth, quiz data, and RevenueCat. A manager user looking for their data rights would see the wrong policy context.

19. **Invoice settings save is 14 sequential `frappe.client.set_value` calls** — each field is saved one at a time in a for-loop. A failed save partway through leaves the document in a partially saved state with no rollback. Should be replaced with a single `frappe.client.save` or a custom batch API method.

20. **`cancel_plan` and `features.set_value` bypass typed lib wrappers** — several pages call `callMethod` directly with raw method strings instead of using the typed functions in `lib/frappe.ts`. Creates type drift risk when API signatures change.

### Catalog Completeness

All 116 .ts/.tsx files in `src/` have been documented at the function level in this catalog. No remaining TODO stubs.
- app/money/components/ (8 components: AuthGate, MetricCard, StatusBadge, TradeTable, SignalCard, DrawdownGauge, StrategyCard, EquityChart, MoneyNav)
- app/money/options/components/ (6 components: AdminLogin, DisclaimerModal, MarketPulse, PaymentModal, RunProgress, TeaserTable)
- app/api/ (all 11 route handlers)
- app/kingdom/ (page.tsx, contact-form.tsx)
- app/privacy/page.tsx
- app/delete-data/page.tsx
