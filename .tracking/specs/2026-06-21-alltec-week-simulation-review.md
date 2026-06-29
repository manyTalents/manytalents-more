# AllTec One-Week Operations Simulation & Friction Review — Design Spec

**Date:** 2026-06-21
**Owner:** Chris (10T orchestrating)
**Status:** Approved-pending-final-review → execution
**Goal:** Run a realistic full week of AllTec field-service operations through the real apps as two personas (Adam = field tech, Zach = office/admin), using real images and real-modeled data, to surface UX/functional friction across the entire job lifecycle. Produce a friction-graded review. **All data is disposable test data, deleted on completion.**

## Confirmed environment (verified 2026-06-21)
- **Backend (shared, live):** `https://erp.manytalentsmore.com` (Docker Frappe on droplet 134.199.198.83). HTTP 200. **Frappe Cloud is fully decommissioned — NOTHING uses FC** (purged `next.config.ts` straggler this session).
- **Mobile (Adam):** Expo SDK 54 app on the **Pixel_8 Android emulator** (already running via Expo Go), defaults to droplet. Repo working copy `C:/temp/hcp_build/mobile`.
- **Web (Zach):** canonical repo `C:/Users/chris/OneDrive/Documentos/ManyTalentsMore` (master, June 20; FC-free). Run locally (`npm run dev`) pointed at droplet. NOTE: the C:/Dev/ManyTalentsMore copy is STALE (May 11, still has FC) — do not use; recommend deleting.

## Decisions (locked with Owner)
- **Execution mode: Hybrid** — drive the friction-critical steps by real taps on the emulator + real clicks in the web manager; bulk-seed the rest via ERPNext API for speed.
- **Email target:** all test customers use `christoph3reverding@gmail.com` so estimate/invoice/receipt emails land in Owner's inbox. **No real customer is ever contacted.**
- **Data safety:** all test docs prefixed `ZZSIM_`. Live pricebook is **read-only** (standing rule). Everything created is logged to the Teardown Manifest below and deleted at the end.
- **Adam wears THREE+ hats, all from the MOBILE app** (his real account `adam@manytalentsmore.com` on the emulator) — "confusing but that's reality": **tech** (field work) + **dispatcher** (assigns/reassigns other techs) + **invoice reviewer** (Needs-Check → approve for invoice).
- **"Adam collects on one job" = Adam collects AS A TECH** — the field-collect path on mobile (InvoiceScreen pay flow), done on-site by Adam.
- **Other techs are simulated, not driven** — their "reported done by phone" is represented by API status flips, which is what churns Adam's unscheduled list.

## Personas
- **Adam — Pixel_8 emulator (real account), THREE+ roles all from the phone:**
  - **Tech (field):** clock in, add parts, chandelier-cash custom part, receipt photos, finish, **collect payment on one job** (field-collect).
  - **Dispatcher:** AM assignment; "check the list" (constantly-churning unscheduled queue); assign/reassign other techs as they report done; schedule only the **bigger jobs**.
  - **Invoice reviewer:** take jobs through Needs-Check → approve for invoice.
- **Other techs — simulated.** Completions flipped via API to represent phone-in "done," driving the unscheduled-list churn Adam reacts to.
- **Zach — web manager.** Office-side billing: create/send estimates, generate/send invoices, AR aging, send-back-with-notes, higher-level oversight; sees everything.

## Headline friction questions
1. Can **one person (Adam)** fluidly switch tech ↔ dispatch ↔ invoice-review modes in the mobile app without friction/role-confusion? (His real overload.)
2. Can Adam **run dispatch from the phone** — assign to other techs, watch the unscheduled list change live, reassign on the fly — **while doing his own field jobs**? (Capability verified in code: `getTechList` + `AssignModal` + `assignTech` + `UnscheduledJobsScreen` 30s polling.)

## Feature ground-truth (from recon — what actually exists)
| Capability | Mobile (Adam) | Web (Zach) |
|---|---|---|
| Jobs list/detail | ✅ assigned-only | ✅ all jobs |
| Drag-drop weekly schedule | ❌ read-only calendar | ✅ real `ScheduleGrid` DnD |
| Clock in/out | ✅ (no GPS/geofence) | — |
| Inventory search / stock | ✅ pricebook + warehouses | ✅ full mgmt |
| Add part to job (price auto) | ✅ `add_material` | ✅ |
| Custom/cash one-off part (chandelier) | ✅ `add_custom_material` | ✅ |
| Estimates | ⚠️ flag-only ("Estimate Required") | ✅ create/send |
| Invoices: gen/pay/send | ✅ full | ✅ AR aging, resend |
| Photo/receipt upload + OCR | ✅ | view |
| Needs-review queue + send-back-with-notes | ✅ submit | ✅ review/approve/send-back |

## The week to run (scenario script)
Mon–Fri, ~8 jobs across 2 test techs (Adam + one helper), modeled on real HCP job line items (~$580 avg ticket). Each scenario maps to a confirmed feature:
1. **Zach schedules the week** — drag unscheduled jobs onto tech/day cells (real DnD + time picker).
2. **Adam works jobs** — clock in, labor notes, finish.
3. **Part-needed friction** — Adam searches a part mid-job: *in office/truck? easy to find? price current?* → adds it. (Answers Owner's explicit questions.)
4. **Chandelier-cash** — Adam adds a one-off chandelier bought with cash as a custom part to bill the customer.
5. **Receipts** — Adam uploads **real receipt photos** (from Pictures/Camera Roll) → OCR → limbo → Zach dispatches.
6. **Estimate** — Zach creates + sends an estimate to a test customer (email to Owner).
7. **Invoice lifecycle** — job → needs-check → Zach **sends one back with notes** → approves another → generate invoice → mark paid → receipt emailed.
8. **Oversight** — confirm Zach sees all jobs/billing/AR that Adam cannot.

## Friction grading
Each step recorded as: **what worked / what was clunky / severity (Blocker / Major / Minor / Polish) / fix idea.** Compiled into the Owner's Inbox review report.

## Teardown Manifest (append every created doc here during execution)
> Delete in dependency order: Payment Entry → Sales Invoice → Estimate → Stock Entry/material rows → HCP Job → Customer. Verify zero `ZZSIM` residue after. Backend = droplet `dev.localhost` via SSH+bench. Jobs have **no hcp_job_id** → never push to real Housecall Pro.

**HCP Jobs (9):** 2 Aldridge, 3 Boyett, 4 Caldwell, 5 Dupree, 6 Easley, 7 Fontenot, 8 Guidry, 9 Hebert, 11 Istre
**Customers (9):** ZZSIM Aldridge, Boyett, Caldwell, Dupree, Easley, Fontenot, Guidry, Hebert, Istre
**Downstream (append as created):** _(estimates / invoices / payments / stock entries during run)_

Teardown command pattern (frappe.init python runner): delete Payment Entries → Sales Invoices (cancel+delete) → Estimates → HCP Jobs → Customers where name/customer LIKE 'ZZSIM%'.

## Friction Findings Log (graded; compiled into Owner's Inbox report)
1. **[Major] Web intake ↔ backend param mismatch.** Web `createJob` TS interface declares `is_vacant` and `keycode`, but backend `create_job` accepts neither → submitting a vacant-property/lockbox intake from the web would 500. Backend accepts: customer/address/town/phone/description/scheduled_date/job_type/priority/is_estimate/occupant_name/occupant_phone/labor_*. Fix: add `is_vacant`/`keycode` to `create_job` (and persist to HCP Job fields) OR strip them client-side.
2. **[Minor] `scheduled_date` set on intake does not move status to `Scheduled`.** Jobs 4/6/8 got a date but stayed `Entered`. Either intentional (status is workflow, date is data) or a gap — confirm intended behavior; a dated job arguably should show as Scheduled on the board.
3. _(intake creation as office requires role {System Manager, Accounts Manager, MTM Office} — correct gate; "Zach" persona needs MTM Office role.)_
4. **[MAJOR / HEADLINE] Cash/custom part add is BROKEN for all techs.** `materials.add_custom_material` hardcodes `"stock_uom": "Ea"` when creating the Item, but no `Ea` UOM exists (valid: Unit/Box/Nos/Pair/Set…) → every custom-part add throws `LinkValidationError: Could not find Default Unit of Measure: 'Ea'`. This is exactly the Owner's "bought a chandelier with cash — can he add it?" scenario, and the answer today is **no**. **Fix: change `"Ea"` → `"Nos"`** in `add_custom_material` (one line). Verified on Hebert #9.
5. **[POSITIVE] Part search + pricing works well.** `search_pricebook("toilet")` → 20 ranked results **with current prices** ($104.68 / $31.00 / $40.96); "urinal flange" → 12 with prices. Finding a part and seeing its price is solid. (Answers Owner's "easy to find? price up to date?" — find=yes, price shown=yes.)
6. **[INFO] Dispatch works end-to-end.** `assign_tech(job, tech, role)` moves status Entered→Assigned and renders on the assigned tech's app (verified: Adam's My Jobs showed his 2; tenant/occupant 2nd phone icon shows on rental cards).
7. **[INFO] RN release build exposes no accessibility tree** → automated UI tap-testing is unreliable; QA automation would need testIDs/accessibility labels. (Drove scenarios via the same API endpoints the buttons call + visual verification.)

## Open setup dependencies (resolve in Setup phase)
- API credentials for droplet via BW (`.10T/tools/BW_ACCESS_PROCEDURE.md`); confirm `adam@` / `zach@` users exist (create ZZSIM test users if not). **bw serve started on :8087; awaiting one-time master-password unlock (Owner runs unlock curl).**
- Run web manager locally on droplet; confirm Adam logged into emulator.
- ✅ **Real images RESOLVED:** phone `C:\Users\chris\CrossDevice\Christopher's S25 Ultra\storage\DCIM\Camera\` (2,943 imgs). Real receipts (Coburn's `20260617_144028.jpg`: Oatey urinal flange OAT43541 ×2 @ $14.13, Sloan A-42-A SLO3301044 @ $24.82, total $58.92), Lennox HVAC nameplates, plumbing job-site photos.

## Success criteria
- Full lifecycle executed end-to-end with real UIs for the friction-critical steps.
- Owner receives the estimate/invoice/receipt emails.
- Friction review delivered to Owner's Inbox.
- **100% of `ZZSIM_` test data deleted; live data and pricebook untouched (verified).**
