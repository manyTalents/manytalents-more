# MTM Scheduling Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a digital schedule board (web) and tech schedule view (mobile) that replaces AllTec's physical whiteboard, with drag-and-drop job scheduling and time-off management.

**Architecture:** Grid-based schedule board on the web (trucks × days) with draggable job pucks, powered by a new `schedule_utils.py` Frappe API module. Mobile gets a read-only weekly schedule view. Time-off flows through a new `MTM Time Off Request` doctype. Everything gated behind an `enable_scheduling` feature flag.

**Tech Stack:** Frappe/ERPNext (backend), Next.js 15 + Tailwind (web), Expo 54 + React Native (mobile), HTML Drag and Drop API (web drag), custom Zustand nav (mobile)

**Spec:** `docs/superpowers/specs/2026-04-29-scheduling-module-design.md`
**Mockup:** `docs/mockups/schedule-board-mockup.html`

**Repos:**
- Backend: `C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement/`
- Web: `C:/Dev/ManyTalentsMore/`
- Mobile: `C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement/mobile/`

**Frappe Cloud constraints:** NO bench migrate/restart. Doctypes created via REST API with `custom=1`. New whitelisted functions may take 10-15 min to be recognized (worker cache). API key stored in Bitwarden.

---

## File Map

### Backend (new/modified)
- **Create:** `hcp_replacement/hcp_replacement/api/schedule_utils.py` — all scheduling API endpoints
- **Modify:** `hcp_replacement/hcp_replacement/api/tech_utils.py:1131-1150` — add `scheduling` to `get_feature_flags()`
- **Modify:** `hcp_replacement/hcp_replacement/core/hcp_sync.py:905-912` — extract `scheduled_end` from HCP payload
- **Create:** `scripts/create_time_off_doctype.py` — one-time doctype creation script
- **Create:** `scripts/add_schedule_fields.py` — one-time field addition script
- **Create:** `scripts/add_scheduling_flag.py` — one-time flag field script

### Web (new/modified)
- **Modify:** `C:/Dev/ManyTalentsMore/lib/features.ts` — add `scheduling` flag
- **Modify:** `C:/Dev/ManyTalentsMore/src/app/manager/components/NavBar.tsx` — add Schedule nav link + gear icon
- **Modify:** `C:/Dev/ManyTalentsMore/src/app/manager/admin/features/page.tsx` — add scheduling toggle
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/page.tsx` — schedule board page
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/ScheduleGrid.tsx` — the grid layout
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/Puck.tsx` — job puck component
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/TimeOffPuck.tsx` — time-off puck
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/UnscheduledSidebar.tsx` — sidebar queue
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/TimePickerPopover.tsx` — quick-pick time selector
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/TimeOffModal.tsx` — create/approve/deny UI
- **Create:** `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/ProjectionMode.tsx` — full-screen read-only view
- **Create:** `C:/Dev/ManyTalentsMore/src/lib/schedule.ts` — schedule API helpers

### Mobile (new/modified)
- **Modify:** `mobile/src/screens/HomeScreen.tsx:238` — enable SCHEDULE block
- **Modify:** `mobile/src/store/tabs.ts:26` — add `"schedule"` to Tab type union
- **Modify:** `mobile/src/navigation/TabManager.tsx:121-158` — add `case "schedule"`
- **Create:** `mobile/src/screens/ScheduleScreen.tsx` — weekly schedule view
- **Create:** `mobile/src/components/SchedulePuck.tsx` — mobile puck component
- **Create:** `mobile/src/components/TimeOffRequestModal.tsx` — request time off UI
- **Create:** `mobile/src/api/schedule.ts` — schedule API calls

---

## Task 1: Create MTM Time Off Request Doctype

**Files:**
- Create: `hcp_replacement/scripts/create_time_off_doctype.py`

- [ ] **Step 1: Write the doctype creation script**

```python
"""One-time script: create MTM Time Off Request doctype on Frappe Cloud."""
import requests
import json
import sys

FRAPPE = "https://manytalentsmore.v.frappe.cloud"
# Get API key from Bitwarden — do NOT hardcode in committed code
API_KEY = sys.argv[1] if len(sys.argv) > 1 else input("API key (token format api_key:api_secret): ")
H = {"Authorization": f"token {API_KEY}", "Content-Type": "application/json"}

doctype_def = {
    "doctype": "DocType",
    "name": "MTM Time Off Request",
    "module": "HCP Replacement",
    "custom": 1,
    "autoname": "TOFF-.#####",
    "fields": [
        {"fieldname": "employee", "fieldtype": "Link", "options": "Employee", "label": "Employee", "reqd": 1, "in_list_view": 1},
        {"fieldname": "employee_name", "fieldtype": "Data", "label": "Employee Name", "fetch_from": "employee.employee_name", "read_only": 1, "in_list_view": 1},
        {"fieldname": "date", "fieldtype": "Date", "label": "Date", "reqd": 1, "in_list_view": 1},
        {"fieldname": "request_type", "fieldtype": "Select", "label": "Request Type", "options": "\nFull Day\nHalf Day AM\nHalf Day PM", "default": "Full Day", "reqd": 1},
        {"fieldname": "reason", "fieldtype": "Small Text", "label": "Reason"},
        {"fieldname": "status", "fieldtype": "Select", "label": "Status", "options": "\nPending\nApproved\nDenied", "default": "Pending", "reqd": 1, "in_list_view": 1},
        {"fieldname": "requested_by", "fieldtype": "Link", "options": "User", "label": "Requested By", "read_only": 1},
        {"fieldname": "approved_by", "fieldtype": "Link", "options": "User", "label": "Approved By", "read_only": 1},
        {"fieldname": "approved_at", "fieldtype": "Datetime", "label": "Approved At", "read_only": 1},
    ],
    "permissions": [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1},
        {"role": "Employee", "read": 1, "write": 1, "create": 1},
    ],
}

r = requests.post(f"{FRAPPE}/api/resource/DocType", headers=H, json=doctype_def, timeout=30)
print(f"Create MTM Time Off Request: {r.status_code}")
if r.status_code != 200:
    print(r.text[:500])
else:
    print("Success!")
```

- [ ] **Step 2: Run the script**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
python scripts/create_time_off_doctype.py
```

Expected: `Create MTM Time Off Request: 200` + `Success!`

- [ ] **Step 3: Verify on Frappe Cloud**

Open `https://manytalentsmore.v.frappe.cloud/app/doctype/MTM Time Off Request` in browser. Confirm all 9 fields are present.

- [ ] **Step 4: Commit**

```bash
git add scripts/create_time_off_doctype.py
git commit -m "feat: MTM Time Off Request doctype creation script"
```

---

## Task 2: Add Schedule Time Fields to HCP Job

**Files:**
- Create: `hcp_replacement/scripts/add_schedule_fields.py`

- [ ] **Step 1: Write the field addition script**

```python
"""One-time script: add scheduled_start_time and scheduled_end_time to HCP Job."""
import requests
import sys

FRAPPE = "https://manytalentsmore.v.frappe.cloud"
API_KEY = sys.argv[1] if len(sys.argv) > 1 else input("API key (token format api_key:api_secret): ")
H = {"Authorization": f"token {API_KEY}", "Content-Type": "application/json"}

fields = [
    {
        "doctype": "Custom Field",
        "dt": "HCP Job",
        "fieldname": "scheduled_start_time",
        "fieldtype": "Time",
        "label": "Scheduled Start Time",
        "insert_after": "scheduled_date",
    },
    {
        "doctype": "Custom Field",
        "dt": "HCP Job",
        "fieldname": "scheduled_end_time",
        "fieldtype": "Time",
        "label": "Scheduled End Time",
        "insert_after": "scheduled_start_time",
    },
]

for f in fields:
    r = requests.post(f"{FRAPPE}/api/resource/Custom Field", headers=H, json=f, timeout=30)
    print(f"  {f['fieldname']}: {r.status_code}")
    if r.status_code != 200:
        print(f"  Error: {r.text[:300]}")
```

- [ ] **Step 2: Run the script**

```bash
python scripts/add_schedule_fields.py
```

Expected: Both fields return 200.

- [ ] **Step 3: Verify**

```bash
curl -s -H "Authorization: token $API_KEY" \
  "https://manytalentsmore.v.frappe.cloud/api/resource/HCP Job?filters=[]&fields=[\"scheduled_start_time\",\"scheduled_end_time\"]&limit_page_length=1" | python -m json.tool
```

Expected: returns a result with both fields (null values).

- [ ] **Step 4: Commit**

```bash
git add scripts/add_schedule_fields.py
git commit -m "feat: add scheduled_start_time and scheduled_end_time to HCP Job"
```

---

## Task 3: Add enable_scheduling Feature Flag

**Files:**
- Create: `hcp_replacement/scripts/add_scheduling_flag.py`
- Modify: `hcp_replacement/hcp_replacement/api/tech_utils.py:1131-1150`

- [ ] **Step 1: Write the flag field script**

```python
"""One-time script: add enable_scheduling field to MTM Feature Flags singleton."""
import requests
import sys

FRAPPE = "https://manytalentsmore.v.frappe.cloud"
API_KEY = sys.argv[1] if len(sys.argv) > 1 else input("API key (token format api_key:api_secret): ")
H = {"Authorization": f"token {API_KEY}", "Content-Type": "application/json"}

field = {
    "doctype": "Custom Field",
    "dt": "MTM Feature Flags",
    "fieldname": "enable_scheduling",
    "fieldtype": "Check",
    "label": "Scheduling",
    "default": "0",
    "insert_after": "enable_events",
}

r = requests.post(f"{FRAPPE}/api/resource/Custom Field", headers=H, json=field, timeout=30)
print(f"enable_scheduling: {r.status_code}")
if r.status_code != 200:
    print(r.text[:300])
```

- [ ] **Step 2: Run the script**

```bash
python scripts/add_scheduling_flag.py
```

Expected: 200.

- [ ] **Step 3: Update get_feature_flags() in tech_utils.py**

In `hcp_replacement/hcp_replacement/api/tech_utils.py`, replace the `get_feature_flags` function (lines 1131-1150):

```python
@frappe.whitelist()
def get_feature_flags():
    """Return feature flag states for the web/mobile app."""
    try:
        flags = frappe.get_single("MTM Feature Flags")
        return {
            "inventory": bool(flags.enable_inventory),
            "estimates": bool(flags.enable_estimates),
            "service_plans": bool(flags.enable_service_plans),
            "invoicing": bool(flags.enable_invoicing),
            "customers": bool(flags.enable_customers),
            "team": bool(flags.enable_team),
            "pricebook": bool(flags.enable_pricebook),
            "events": bool(flags.enable_events),
            "scheduling": bool(flags.enable_scheduling),
        }
    except Exception:
        return {
            "inventory": False, "estimates": False, "service_plans": False,
            "invoicing": False, "customers": False, "team": False,
            "pricebook": False, "events": False, "scheduling": False,
        }
```

- [ ] **Step 4: Commit**

```bash
git add scripts/add_scheduling_flag.py hcp_replacement/hcp_replacement/api/tech_utils.py
git commit -m "feat: add enable_scheduling feature flag"
```

---

## Task 4: Create schedule_utils.py — get_schedule_board

**Files:**
- Create: `hcp_replacement/hcp_replacement/api/schedule_utils.py`

- [ ] **Step 1: Create the module with get_schedule_board**

```python
"""Schedule board API endpoints for the MTM scheduling module."""
import frappe
from frappe.utils import getdate, add_days


@frappe.whitelist()
def get_schedule_board(week_start):
    """Return all jobs + time-off for the given week, grouped by tech.

    Args:
        week_start: date string (YYYY-MM-DD) for Monday of the week

    Returns:
        {
            techs: [{user_id, employee_name, truck_number, van_warehouse}],
            jobs: [{name, hcp_job_id, job_number, customer_name, address, town,
                    job_type, status, scheduled_date, scheduled_start_time,
                    scheduled_end_time, priority, assigned_techs: [{tech_user, tech_name, role}]}],
            time_off: [{name, employee, employee_name, date, request_type, status}],
            unscheduled: [{...same as jobs...}]
        }
    """
    start = getdate(week_start)
    end = add_days(start, 6)  # Sunday

    # Active employees (techs)
    techs = frappe.get_all(
        "Employee",
        filters={"status": "Active"},
        fields=["user_id", "employee_name", "custom_van_warehouse"],
        order_by="employee_name asc",
        ignore_permissions=True,
    )
    # Add truck numbers based on ordering (matches physical board)
    for i, tech in enumerate(techs):
        tech["truck_number"] = i + 1

    # Scheduled jobs for the week
    jobs = frappe.get_all(
        "HCP Job",
        filters=[
            ["scheduled_date", ">=", str(start)],
            ["scheduled_date", "<=", str(end) + " 23:59:59"],
            ["status", "not in", ["Paid", "Canceled"]],
        ],
        fields=[
            "name", "hcp_job_id", "job_number", "customer_name", "address",
            "town", "job_type", "status", "scheduled_date",
            "scheduled_start_time", "scheduled_end_time", "priority",
        ],
        order_by="scheduled_date asc",
        ignore_permissions=True,
        limit_page_length=0,
    )

    # Attach assigned_techs to each job
    job_names = [j.name for j in jobs]
    if job_names:
        tech_rows = frappe.get_all(
            "HCP Job Assigned Tech",
            filters={"parent": ["in", job_names]},
            fields=["parent", "tech_user", "tech_name", "role"],
            ignore_permissions=True,
            limit_page_length=0,
        )
        tech_map = {}
        for t in tech_rows:
            tech_map.setdefault(t.parent, []).append(t)
        for j in jobs:
            j["assigned_techs"] = tech_map.get(j.name, [])
    else:
        for j in jobs:
            j["assigned_techs"] = []

    # Unscheduled jobs (no date or no tech assigned)
    unscheduled = frappe.get_all(
        "HCP Job",
        filters=[
            ["status", "not in", ["Completed", "Checked", "Paid", "Canceled", "Invoiced"]],
            ["scheduled_date", "is", "not set"],
        ],
        fields=[
            "name", "hcp_job_id", "job_number", "customer_name", "address",
            "town", "job_type", "status", "scheduled_date",
            "scheduled_start_time", "scheduled_end_time", "priority",
        ],
        order_by="creation desc",
        ignore_permissions=True,
        limit_page_length=100,
    )
    for j in unscheduled:
        j["assigned_techs"] = []

    # Time-off requests for the week
    time_off = frappe.get_all(
        "MTM Time Off Request",
        filters=[
            ["date", ">=", str(start)],
            ["date", "<=", str(end)],
        ],
        fields=["name", "employee", "employee_name", "date", "request_type", "status"],
        ignore_permissions=True,
        limit_page_length=0,
    )

    return {
        "techs": techs,
        "jobs": jobs,
        "time_off": time_off,
        "unscheduled": unscheduled,
    }
```

- [ ] **Step 2: Verify syntax**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
python -c "import ast; ast.parse(open('hcp_replacement/hcp_replacement/api/schedule_utils.py').read()); print('OK')"
```

Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add hcp_replacement/hcp_replacement/api/schedule_utils.py
git commit -m "feat: add get_schedule_board API endpoint"
```

---

## Task 5: Add update_job_schedule Endpoint

**Files:**
- Modify: `hcp_replacement/hcp_replacement/api/schedule_utils.py`

- [ ] **Step 1: Add update_job_schedule to schedule_utils.py**

Append after the `get_schedule_board` function:

```python
@frappe.whitelist()
def update_job_schedule(job_name, scheduled_date=None, start_time=None, end_time=None, tech_user=None):
    """Update a job's schedule — called on drag-and-drop or manual edit.

    Updates scheduled_date, start/end times, and optionally reassigns to a different tech.
    All params are optional except job_name — only provided values are changed.
    """
    doc = frappe.get_doc("HCP Job", job_name)

    if scheduled_date is not None:
        doc.scheduled_date = scheduled_date
    if start_time is not None:
        doc.scheduled_start_time = start_time
    if end_time is not None:
        doc.scheduled_end_time = end_time

    # If tech_user is provided, ensure they are assigned (replace existing if solo assignment)
    if tech_user:
        already_assigned = any(t.tech_user == tech_user for t in doc.assigned_techs)
        if not already_assigned:
            # If job had exactly one tech, replace them; otherwise add
            if len(doc.assigned_techs) == 1:
                doc.assigned_techs = []
            emp = frappe.db.get_value(
                "Employee", {"user_id": tech_user},
                ["employee_name", "custom_van_warehouse"], as_dict=True,
            )
            doc.append("assigned_techs", {
                "tech_user": tech_user,
                "tech_name": emp.employee_name if emp else tech_user,
                "role": "Lead Tech",
                "van_warehouse": emp.custom_van_warehouse if emp else "",
            })

    # Update status if moving from Entered to Scheduled
    if doc.scheduled_date and doc.status == "Entered":
        doc.status = "Scheduled"

    doc.save(ignore_permissions=True)

    return {
        "name": doc.name,
        "scheduled_date": str(doc.scheduled_date) if doc.scheduled_date else None,
        "scheduled_start_time": doc.scheduled_start_time,
        "scheduled_end_time": doc.scheduled_end_time,
        "status": doc.status,
    }
```

- [ ] **Step 2: Verify syntax**

```bash
python -c "import ast; ast.parse(open('hcp_replacement/hcp_replacement/api/schedule_utils.py').read()); print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add hcp_replacement/hcp_replacement/api/schedule_utils.py
git commit -m "feat: add update_job_schedule endpoint for drag-and-drop"
```

---

## Task 6: Add Time-Off CRUD Endpoints

**Files:**
- Modify: `hcp_replacement/hcp_replacement/api/schedule_utils.py`

- [ ] **Step 1: Add time-off endpoints to schedule_utils.py**

Append after `update_job_schedule`:

```python
@frappe.whitelist()
def get_time_off_requests(week_start):
    """Return all time-off requests for the given week."""
    start = getdate(week_start)
    end = add_days(start, 6)
    return frappe.get_all(
        "MTM Time Off Request",
        filters=[["date", ">=", str(start)], ["date", "<=", str(end)]],
        fields=["name", "employee", "employee_name", "date", "request_type", "status", "reason", "requested_by"],
        ignore_permissions=True,
        limit_page_length=0,
    )


@frappe.whitelist()
def create_time_off(employee, date, request_type="Full Day", reason=""):
    """Create a pending time-off request. Works for both tech self-request and manager entry."""
    emp = frappe.db.get_value("Employee", employee, "employee_name")
    if not emp:
        frappe.throw(f"Employee {employee} not found")
    doc = frappe.get_doc({
        "doctype": "MTM Time Off Request",
        "employee": employee,
        "employee_name": emp,
        "date": date,
        "request_type": request_type,
        "reason": reason,
        "status": "Pending",
        "requested_by": frappe.session.user,
    })
    doc.insert(ignore_permissions=True)
    return {"name": doc.name, "status": doc.status}


@frappe.whitelist()
def approve_time_off(request_name):
    """Approve a pending time-off request."""
    doc = frappe.get_doc("MTM Time Off Request", request_name)
    if doc.status != "Pending":
        frappe.throw(f"Cannot approve — status is {doc.status}")
    doc.status = "Approved"
    doc.approved_by = frappe.session.user
    doc.approved_at = frappe.utils.now()
    doc.save(ignore_permissions=True)
    return {"name": doc.name, "status": "Approved"}


@frappe.whitelist()
def deny_time_off(request_name):
    """Deny a pending time-off request."""
    doc = frappe.get_doc("MTM Time Off Request", request_name)
    if doc.status != "Pending":
        frappe.throw(f"Cannot deny — status is {doc.status}")
    doc.status = "Denied"
    doc.approved_by = frappe.session.user
    doc.approved_at = frappe.utils.now()
    doc.save(ignore_permissions=True)
    return {"name": doc.name, "status": "Denied"}
```

- [ ] **Step 2: Verify syntax**

```bash
python -c "import ast; ast.parse(open('hcp_replacement/hcp_replacement/api/schedule_utils.py').read()); print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add hcp_replacement/hcp_replacement/api/schedule_utils.py
git commit -m "feat: add time-off CRUD endpoints"
```

---

## Task 7: Update HCP Sync for scheduled_end

**Files:**
- Modify: `hcp_replacement/hcp_replacement/core/hcp_sync.py:905-912`

- [ ] **Step 1: Update _upsert_hcp_job to extract scheduled_end**

In `hcp_sync.py`, find the `scheduled_start` extraction block (around lines 905-912). After the existing `scheduled_start` parsing, add `scheduled_end` extraction:

```python
    raw_date = job_data.get("scheduled_start") or job_data.get("schedule", {}).get("scheduled_start") or ""
    scheduled_start = None
    if raw_date:
        try:
            scheduled_start = raw_date.replace("T", " ").replace("Z", "").split("+")[0]
        except Exception:
            scheduled_start = None

    # Extract scheduled_end for time block end
    raw_end = job_data.get("scheduled_end") or job_data.get("schedule", {}).get("scheduled_end") or ""
    scheduled_end_time = None
    if raw_end:
        try:
            end_str = raw_end.replace("T", " ").replace("Z", "").split("+")[0]
            # Extract just the time portion (HH:MM:SS)
            scheduled_end_time = end_str.split(" ")[1] if " " in end_str else None
        except Exception:
            scheduled_end_time = None

    # Extract start time from scheduled_start
    scheduled_start_time = None
    if scheduled_start and " " in scheduled_start:
        try:
            scheduled_start_time = scheduled_start.split(" ")[1]
        except Exception:
            scheduled_start_time = None
```

Then in both the create and update paths where fields are set (around lines 948 and 969), add:

```python
    "scheduled_start_time": scheduled_start_time,
    "scheduled_end_time": scheduled_end_time,
```

- [ ] **Step 2: Verify syntax**

```bash
python -c "import ast; ast.parse(open('hcp_replacement/hcp_replacement/core/hcp_sync.py').read()); print('OK')"
```

- [ ] **Step 3: Commit**

```bash
git add hcp_replacement/hcp_replacement/core/hcp_sync.py
git commit -m "feat: extract scheduled_end from HCP sync payload"
```

---

## Task 8: Push Backend Changes and Verify

- [ ] **Step 1: Push all backend changes**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
git push origin main
```

- [ ] **Step 2: Wait for Frappe Cloud worker cache (~15 min), then verify get_schedule_board**

```bash
curl -s -X POST \
  -H "Authorization: token $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"week_start": "2026-04-27"}' \
  "https://manytalentsmore.v.frappe.cloud/api/method/hcp_replacement.hcp_replacement.api.schedule_utils.get_schedule_board" | python -m json.tool | head -30
```

Expected: JSON with `techs`, `jobs`, `time_off`, `unscheduled` arrays.

- [ ] **Step 3: Verify get_feature_flags includes scheduling**

```bash
curl -s -X POST \
  -H "Authorization: token $API_KEY" \
  "https://manytalentsmore.v.frappe.cloud/api/method/hcp_replacement.hcp_replacement.api.tech_utils.get_feature_flags" | python -m json.tool
```

Expected: response includes `"scheduling": false`.

- [ ] **Step 4: Commit verification notes to progress file**

---

## Task 9: Web — Feature Flag Wiring

**Files:**
- Modify: `C:/Dev/ManyTalentsMore/lib/features.ts`
- Modify: `C:/Dev/ManyTalentsMore/src/app/manager/components/NavBar.tsx`
- Modify: `C:/Dev/ManyTalentsMore/src/app/manager/admin/features/page.tsx`

- [ ] **Step 1: Add scheduling to FeatureFlags interface**

In `C:/Dev/ManyTalentsMore/lib/features.ts`, update the `FeatureFlags` interface (line 7-16):

```ts
export interface FeatureFlags {
  inventory: boolean;
  estimates: boolean;
  service_plans: boolean;
  invoicing: boolean;
  customers: boolean;
  team: boolean;
  pricebook: boolean;
  events: boolean;
  scheduling: boolean;
}
```

Update `ALL_OFF` (lines 18-22):

```ts
const ALL_OFF: FeatureFlags = {
  inventory: false, estimates: false, service_plans: false,
  invoicing: false, customers: false, team: false,
  pricebook: false, events: false, scheduling: false,
};
```

Add to `FLAG_TO_NAV` (lines 55-63):

```ts
export const FLAG_TO_NAV: Record<string, keyof FeatureFlags> = {
  "/manager/pricing": "pricebook",
  "/manager/invoices": "invoicing",
  "/manager/customers": "customers",
  "/manager/estimates": "estimates",
  "/manager/service-plans": "service_plans",
  "/manager/inventory": "inventory",
  "/manager/admin/techs": "team",
  "/manager/schedule": "scheduling",
};
```

- [ ] **Step 2: Add Schedule nav link and gear icon to NavBar**

In `C:/Dev/ManyTalentsMore/src/app/manager/components/NavBar.tsx`, add Schedule to `NAV_LINKS` (lines 11-21):

```ts
const NAV_LINKS = [
  { href: "/manager/dashboard", label: "Dashboard" },
  { href: "/manager/jobs", label: "All Jobs" },
  { href: "/manager/schedule", label: "Schedule" },
  { href: "/manager/pricing", label: "Pricing" },
  { href: "/manager/invoices", label: "Invoices" },
  { href: "/manager/customers", label: "Customers" },
  { href: "/manager/estimates", label: "Estimates" },
  { href: "/manager/service-plans", label: "Service Plans" },
  { href: "/manager/inventory", label: "Inventory" },
  { href: "/manager/admin/techs", label: "Team" },
] as const;
```

Add a gear icon link in the right-side section of the NavBar, next to Log Out. Find the JSX where Log Out is rendered and add before it:

```tsx
<Link
  href="/manager/admin/features"
  className="text-cream/60 hover:text-cream transition-opacity"
  title="Admin Settings"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
</Link>
```

- [ ] **Step 3: Add scheduling toggle to admin features page**

In `C:/Dev/ManyTalentsMore/src/app/manager/admin/features/page.tsx`, add to the `FLAG_LABELS` array (lines 14-23):

```ts
{ key: "scheduling", label: "Scheduling", description: "Schedule board — assign techs to jobs by day" },
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Dev/ManyTalentsMore"
git add lib/features.ts src/app/manager/components/NavBar.tsx src/app/manager/admin/features/page.tsx
git commit -m "feat: wire scheduling feature flag + admin gear icon"
```

---

## Task 10: Web — Schedule API Helpers

**Files:**
- Create: `C:/Dev/ManyTalentsMore/src/lib/schedule.ts`

- [ ] **Step 1: Create schedule.ts API helpers**

```ts
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

/** Get Monday of the week containing the given date */
export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

/** Format time string "08:00:00" → "8" or "08:30:00" → "8:30" */
export function formatTime(time: string | null): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hour = parseInt(h, 10);
  const min = parseInt(m, 10);
  if (hour > 12) {
    return min > 0 ? `${hour - 12}:${m}` : `${hour - 12}`;
  }
  return min > 0 ? `${hour}:${m}` : `${hour}`;
}

/** Format time range "08:00:00" + "12:00:00" → "8–12" */
export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  return `${formatTime(start)}–${formatTime(end)}`;
}

/** Get trade from job_type string */
export function getTrade(jobType: string | null): "plumbing" | "hvac" | "electrical" | "other" {
  if (!jobType) return "other";
  const lower = jobType.toLowerCase();
  if (lower.includes("hvac") || lower.includes("ac") || lower.includes("heat")) return "hvac";
  if (lower.includes("electric")) return "electrical";
  if (lower.includes("plumb")) return "plumbing";
  return "other";
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Dev/ManyTalentsMore"
git add src/lib/schedule.ts
git commit -m "feat: add schedule API helpers and types"
```

---

## Task 11: Web — Schedule Page + Grid

**Files:**
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/page.tsx`
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/ScheduleGrid.tsx`
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/Puck.tsx`

- [ ] **Step 1: Create the Puck component**

```tsx
"use client";

import { SchedulePuck, formatTimeRange, getTrade } from "@/lib/schedule";

const TRADE_COLORS = {
  plumbing: { border: "#3b82f6", icon: "💧" },
  hvac: { border: "#38bdf8", icon: "❄️" },
  electrical: { border: "#facc15", icon: "⚡" },
  other: { border: "#6b7280", icon: "🔧" },
} as const;

interface PuckProps {
  job: SchedulePuck;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
}

export default function Puck({ job, onClick, draggable = true, onDragStart }: PuckProps) {
  const trade = getTrade(job.job_type);
  const { border, icon } = TRADE_COLORS[trade];
  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })
    : "";
  const timeRange = formatTimeRange(job.scheduled_start_time, job.scheduled_end_time);
  const street = job.address?.split(",")[0] || job.address || "";

  return (
    <div
      className="bg-navy-bg border border-navy-border rounded-md px-2 py-1.5 mb-1 cursor-grab hover:border-gold hover:shadow-[0_0_8px_rgba(201,168,76,0.15)] hover:-translate-y-px transition-all active:cursor-grabbing active:opacity-80 grid grid-cols-[1fr_auto_1fr] items-center gap-x-2"
      style={{ borderLeftWidth: 3, borderLeftColor: border }}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
    >
      {/* Left: customer + address */}
      <div className="min-w-0">
        <div className="text-cream font-semibold text-xs leading-tight truncate">{job.customer_name}</div>
        <div className="text-navy-lighter text-[11px] leading-tight truncate">{street}</div>
      </div>
      {/* Center: date + time */}
      <div className="text-center">
        <div className="text-cream text-[11px] font-medium leading-tight">{dateStr}</div>
        <div className="text-gold-light text-[11px] font-bold leading-tight">{timeRange}</div>
      </div>
      {/* Right: trade icon + job # */}
      <div className="text-right">
        <span className="text-sm leading-none">{icon}</span>
        <span className="block text-[10px] text-navy-lighter font-medium">#{job.job_number}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the ScheduleGrid component**

```tsx
"use client";

import { useState, useCallback } from "react";
import { ScheduleBoardData, SchedulePuck, TimeOffEntry, updateJobSchedule, getWeekStart } from "@/lib/schedule";
import Puck from "./Puck";
import TimeOffPuck from "./TimeOffPuck";
import TimePickerPopover from "./TimePickerPopover";
import { useRouter } from "next/navigation";

interface ScheduleGridProps {
  data: ScheduleBoardData;
  weekStart: string;
  onRefresh: () => void;
  showSat: boolean;
  showSun: boolean;
}

function getDaysOfWeek(weekStart: string, showSat: boolean, showSun: boolean) {
  const days: { date: string; label: string; dayName: string }[] = [];
  const start = new Date(weekStart + "T00:00:00");
  const count = 5 + (showSat ? 1 : 0) + (showSun ? 1 : 0);
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 0; i < count; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    // Skip Sat/Sun if not enabled (they would be index 5 and 6)
    const dow = d.getDay();
    if (dow === 6 && !showSat) continue;
    if (dow === 0 && !showSun) continue;
    days.push({
      date: d.toISOString().split("T")[0],
      label: `${d.getMonth() + 1}/${d.getDate()}`,
      dayName: dayNames[dow],
    });
  }
  return days;
}

function isToday(dateStr: string) {
  return dateStr === new Date().toISOString().split("T")[0];
}

export default function ScheduleGrid({ data, weekStart, onRefresh, showSat, showSun }: ScheduleGridProps) {
  const router = useRouter();
  const days = getDaysOfWeek(weekStart, showSat, showSun);
  const [dragOverCell, setDragOverCell] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ jobName: string; techUser: string; date: string } | null>(null);

  const getJobsForCell = useCallback(
    (techUser: string, date: string) =>
      data.jobs.filter((j) => {
        const jobDate = (j.scheduled_date || "").split(" ")[0];
        return jobDate === date && j.assigned_techs.some((t) => t.tech_user === techUser);
      }),
    [data.jobs]
  );

  const getTimeOffForCell = useCallback(
    (employeeName: string, date: string) =>
      data.time_off.filter((t) => t.employee_name === employeeName && t.date === date),
    [data.time_off]
  );

  const handleDragStart = (e: React.DragEvent, job: SchedulePuck) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ jobName: job.name }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, cellId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverCell(cellId);
  };

  const handleDragLeave = () => setDragOverCell(null);

  const handleDrop = (e: React.DragEvent, techUser: string, date: string) => {
    e.preventDefault();
    setDragOverCell(null);
    try {
      const { jobName } = JSON.parse(e.dataTransfer.getData("application/json"));
      setPendingDrop({ jobName, techUser, date });
    } catch { /* ignore bad drag data */ }
  };

  const handleTimeSelected = async (startTime: string, endTime: string) => {
    if (!pendingDrop) return;
    try {
      await updateJobSchedule({
        job_name: pendingDrop.jobName,
        scheduled_date: pendingDrop.date,
        start_time: startTime,
        end_time: endTime,
        tech_user: pendingDrop.techUser,
      });
      onRefresh();
    } catch (err) {
      console.error("Failed to update schedule:", err);
    }
    setPendingDrop(null);
  };

  const colCount = days.length + 1; // +1 for truck label column

  return (
    <>
      <div
        className="grid border border-navy-border rounded-xl overflow-hidden bg-navy-surface"
        style={{ gridTemplateColumns: `140px repeat(${days.length}, 1fr)` }}
      >
        {/* Header row */}
        <div className="bg-navy-bg p-2.5 border-b-2 border-gold-dark border-r border-navy-border flex items-center justify-center">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gold">Trucks</span>
        </div>
        {days.map((day) => (
          <div
            key={day.date}
            className={`bg-navy-bg p-2.5 text-center border-b-2 border-gold-dark border-r border-navy-border last:border-r-0 ${
              isToday(day.date) ? "bg-gold/10" : ""
            }`}
          >
            <div className={`text-[11px] font-bold uppercase tracking-wide ${isToday(day.date) ? "text-gold-light" : "text-gold"}`}>
              {day.dayName}
            </div>
            <div className="text-[13px] font-semibold text-cream mt-0.5">{day.label}</div>
          </div>
        ))}

        {/* Tech rows */}
        {data.techs.map((tech, idx) => (
          <>
            {/* Truck label */}
            <div key={`label-${tech.user_id}`} className="bg-navy-bg px-3 py-3 border-b border-navy-border border-r border-navy-border flex flex-col justify-start">
              <span className="text-[10px] font-bold uppercase tracking-wide text-navy-lighter">
                Truck #{tech.truck_number}
              </span>
              <span className="text-[15px] font-bold text-cream font-serif">
                {tech.employee_name.split(" ")[0]}
              </span>
            </div>
            {/* Day cells */}
            {days.map((day) => {
              const cellId = `${tech.user_id}-${day.date}`;
              const cellJobs = getJobsForCell(tech.user_id, day.date);
              const cellTimeOff = getTimeOffForCell(tech.employee_name, day.date);
              return (
                <div
                  key={cellId}
                  className={`border-b border-navy-border border-r border-navy-border last:border-r-0 p-1.5 min-h-[160px] max-h-[160px] overflow-y-auto transition-colors relative ${
                    isToday(day.date) ? "bg-gold/[0.04]" : "bg-navy-surface"
                  } ${dragOverCell === cellId ? "bg-gold/[0.08] outline-2 outline-dashed outline-gold -outline-offset-2" : ""}`}
                  onDragOver={(e) => handleDragOver(e, cellId)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, tech.user_id, day.date)}
                  style={{ scrollbarWidth: "thin" }}
                >
                  {cellTimeOff.map((t) => (
                    <TimeOffPuck key={t.name} entry={t} onRefresh={onRefresh} />
                  ))}
                  {cellJobs.map((job) => (
                    <Puck
                      key={job.name}
                      job={job}
                      onClick={() => router.push(`/manager/jobs/${job.name}`)}
                      onDragStart={(e) => handleDragStart(e, job)}
                    />
                  ))}
                </div>
              );
            })}
          </>
        ))}
      </div>

      {/* Time picker popover */}
      {pendingDrop && (
        <TimePickerPopover
          onSelect={handleTimeSelected}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Create the schedule page**

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";
import { getAuth } from "@/lib/frappe";
import { fetchScheduleBoard, ScheduleBoardData, getWeekStart } from "@/lib/schedule";
import ScheduleGrid from "./components/ScheduleGrid";
import UnscheduledSidebar from "./components/UnscheduledSidebar";

export default function SchedulePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ScheduleBoardData | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [showSat, setShowSat] = useState(false);
  const [showSun, setShowSun] = useState(false);
  const [projection, setProjection] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchScheduleBoard(weekStart);
      setData(result);
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (!getAuth()) { router.replace("/manager"); return; }
    loadData();
  }, [loadData, router]);

  // Auto-refresh
  useEffect(() => {
    const interval = setInterval(loadData, projection ? 30000 : 60000);
    return () => clearInterval(interval);
  }, [loadData, projection]);

  const navigateWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split("T")[0]);
    setLoading(true);
  };

  const goThisWeek = () => {
    setWeekStart(getWeekStart(new Date()));
    setLoading(true);
  };

  const weekEnd = new Date(weekStart + "T00:00:00");
  weekEnd.setDate(weekEnd.getDate() + 4);
  const weekLabel = `${new Date(weekStart + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })} — ${weekEnd.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  if (projection && data) {
    return (
      <div className="fixed inset-0 bg-navy-bg z-50 overflow-auto p-4">
        <div className="flex justify-between items-center mb-3">
          <h1 className="font-serif text-2xl text-cream">Schedule Board</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-cream">{weekLabel}</span>
            <button onClick={() => setProjection(false)} className="text-sm text-cream/60 hover:text-cream border border-navy-border px-3 py-1.5 rounded-lg">
              Exit Projection
            </button>
          </div>
        </div>
        <ScheduleGrid data={data} weekStart={weekStart} onRefresh={loadData} showSat={showSat} showSun={showSun} />
      </div>
    );
  }

  return (
    <>
      <NavBar />
      <div className="flex h-[calc(100vh-105px)]">
        {/* Sidebar */}
        {data && (
          <UnscheduledSidebar jobs={data.unscheduled} onRefresh={loadData} />
        )}

        {/* Main grid area */}
        <div className="flex-1 overflow-auto p-4">
          {/* Header bar */}
          <div className="flex justify-between items-center mb-3">
            <h1 className="font-serif text-xl text-cream">Schedule Board</h1>
            <div className="flex items-center gap-2">
              <button onClick={goThisWeek} className="border border-gold text-gold px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gold/10">
                This Week
              </button>
              <button onClick={() => navigateWeek(-1)} className="bg-navy-surface border border-navy-border text-cream w-8 h-8 rounded-lg flex items-center justify-center hover:border-gold">
                ←
              </button>
              <div className="text-sm font-semibold text-cream min-w-[180px] text-center">{weekLabel}</div>
              <button onClick={() => navigateWeek(1)} className="bg-navy-surface border border-navy-border text-cream w-8 h-8 rounded-lg flex items-center justify-center hover:border-gold">
                →
              </button>
              <button onClick={() => setProjection(true)} className="border border-navy-border text-cream px-3 py-1.5 rounded-lg text-xs opacity-70 hover:opacity-100 hover:border-gold">
                Projection
              </button>
              <div className="flex items-center gap-2 ml-3">
                <label className="flex items-center gap-1 text-[11px] text-navy-lighter">
                  <input type="checkbox" checked={showSat} onChange={(e) => setShowSat(e.target.checked)} className="accent-gold w-3 h-3" /> Sat
                </label>
                <label className="flex items-center gap-1 text-[11px] text-navy-lighter">
                  <input type="checkbox" checked={showSun} onChange={(e) => setShowSun(e.target.checked)} className="accent-gold w-3 h-3" /> Sun
                </label>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
            </div>
          ) : data ? (
            <ScheduleGrid data={data} weekStart={weekStart} onRefresh={loadData} showSat={showSat} showSun={showSun} />
          ) : (
            <div className="text-center text-cream/60 mt-20">Failed to load schedule data.</div>
          )}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Dev/ManyTalentsMore"
git add src/app/manager/schedule/ src/lib/schedule.ts
git commit -m "feat: schedule board page with grid and puck components"
```

---

## Task 12: Web — Sidebar, TimeOff Puck, Time Picker, Time Off Modal

**Files:**
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/UnscheduledSidebar.tsx`
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/TimeOffPuck.tsx`
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/TimePickerPopover.tsx`
- Create: `C:/Dev/ManyTalentsMore/src/app/manager/schedule/components/TimeOffModal.tsx`

- [ ] **Step 1: Create UnscheduledSidebar**

```tsx
"use client";

import { useState } from "react";
import { SchedulePuck, getTrade } from "@/lib/schedule";
import Puck from "./Puck";

interface UnscheduledSidebarProps {
  jobs: SchedulePuck[];
  onRefresh: () => void;
}

const TRADES = ["all", "plumbing", "hvac", "electrical"] as const;

export default function UnscheduledSidebar({ jobs, onRefresh }: UnscheduledSidebarProps) {
  const [filter, setFilter] = useState<string>("all");

  const filtered = filter === "all" ? jobs : jobs.filter((j) => getTrade(j.job_type) === filter);

  const handleDragStart = (e: React.DragEvent, job: SchedulePuck) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ jobName: job.name }));
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="w-[260px] min-w-[260px] bg-navy-surface border-r border-navy-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-navy-border">
        <div className="text-[11px] font-bold uppercase tracking-widest text-gold mb-2">
          Unscheduled Jobs
        </div>
        <div className="flex gap-1">
          {TRADES.map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-2.5 py-1 rounded-xl text-[11px] border transition-all ${
                filter === t
                  ? "bg-gold text-navy-bg border-gold"
                  : "border-navy-border text-cream opacity-70 hover:opacity-100"
              }`}
            >
              {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {filtered.length === 0 ? (
          <div className="text-center text-cream/40 text-xs mt-8">No unscheduled jobs</div>
        ) : (
          filtered.map((job) => (
            <Puck
              key={job.name}
              job={job}
              onDragStart={(e) => handleDragStart(e, job)}
            />
          ))
        )}
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Create TimeOffPuck**

```tsx
"use client";

import { TimeOffEntry, approveTimeOff, denyTimeOff } from "@/lib/schedule";
import { useState } from "react";

interface TimeOffPuckProps {
  entry: TimeOffEntry;
  onRefresh: () => void;
}

export default function TimeOffPuck({ entry, onRefresh }: TimeOffPuckProps) {
  const [loading, setLoading] = useState(false);

  const statusStyles = {
    Approved: "bg-emerald-950 border-emerald-500 text-emerald-400",
    Denied: "bg-red-950 border-red-500 text-red-400 text-[10px]",
    Pending: "bg-yellow-950 border-yellow-500 text-yellow-400 text-[10px] cursor-pointer",
  };

  const labels = {
    Approved: "OFF",
    Denied: "OFF DENIED",
    Pending: "OFF (Pending)",
  };

  const handleClick = async () => {
    if (entry.status !== "Pending" || loading) return;
    const action = window.confirm(`Approve time off for ${entry.employee_name} on ${entry.date}?\n\nOK = Approve, Cancel = Deny`);
    setLoading(true);
    try {
      if (action) {
        await approveTimeOff(entry.name);
      } else {
        await denyTimeOff(entry.name);
      }
      onRefresh();
    } catch (err) {
      console.error("Failed to update time off:", err);
    }
    setLoading(false);
  };

  return (
    <div
      className={`rounded-md px-2.5 py-1.5 mb-1 text-[11px] font-bold text-center tracking-wide border ${statusStyles[entry.status]}`}
      onClick={handleClick}
    >
      {loading ? "..." : labels[entry.status]}
    </div>
  );
}
```

- [ ] **Step 3: Create TimePickerPopover**

```tsx
"use client";

import { useState } from "react";

interface TimePickerPopoverProps {
  onSelect: (startTime: string, endTime: string) => void;
  onCancel: () => void;
}

const QUICK_PICKS = [
  { label: "8–10", start: "08:00:00", end: "10:00:00" },
  { label: "10–12", start: "10:00:00", end: "12:00:00" },
  { label: "1–3", start: "13:00:00", end: "15:00:00" },
  { label: "3–5", start: "15:00:00", end: "17:00:00" },
];

export default function TimePickerPopover({ onSelect, onCancel }: TimePickerPopoverProps) {
  const [custom, setCustom] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("12:00");

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={onCancel}>
      <div className="bg-navy-surface border border-navy-border rounded-xl p-4 min-w-[280px]" onClick={(e) => e.stopPropagation()}>
        <div className="text-xs font-bold uppercase tracking-widest text-gold mb-3">Select Time Block</div>

        {!custom ? (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {QUICK_PICKS.map((pick) => (
                <button
                  key={pick.label}
                  onClick={() => onSelect(pick.start, pick.end)}
                  className="bg-navy-bg border border-navy-border rounded-lg px-3 py-2 text-cream text-sm font-semibold hover:border-gold transition-colors"
                >
                  {pick.label}
                </button>
              ))}
            </div>
            <button onClick={() => setCustom(true)} className="text-xs text-gold hover:text-gold-light w-full text-center">
              Custom time...
            </button>
          </>
        ) : (
          <div className="space-y-3">
            <div className="flex gap-3">
              <div>
                <label className="text-[10px] text-navy-lighter uppercase">Start</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="block w-full bg-navy-bg border border-navy-border rounded-lg px-2 py-1.5 text-cream text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-navy-lighter uppercase">End</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="block w-full bg-navy-bg border border-navy-border rounded-lg px-2 py-1.5 text-cream text-sm"
                />
              </div>
            </div>
            <button
              onClick={() => onSelect(startTime + ":00", endTime + ":00")}
              className="w-full bg-gold text-navy-bg font-semibold py-2 rounded-lg text-sm"
            >
              Set Time
            </button>
          </div>
        )}

        <button onClick={onCancel} className="mt-2 text-xs text-cream/40 hover:text-cream w-full text-center">
          Cancel
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Dev/ManyTalentsMore"
git add src/app/manager/schedule/components/
git commit -m "feat: sidebar, time-off puck, time picker, schedule components"
```

---

## Task 13: Web — Push and Verify

- [ ] **Step 1: Push web changes**

```bash
cd "C:/Dev/ManyTalentsMore"
git push origin master
```

- [ ] **Step 2: Wait for Cloudflare Pages deploy, verify the page loads**

Visit `manytalentsmore.com/manager/schedule`. If the `scheduling` flag is off, the nav link should be hidden. Go to `/manager/admin/features` and enable `Scheduling`, then confirm the Schedule link appears and the page loads.

- [ ] **Step 3: Verify drag and drop works end-to-end**

Drag an unscheduled job puck onto a tech+day cell, select a time block. Confirm the puck appears in the correct cell. Refresh and confirm it persists.

---

## Task 14: Mobile — Wire Schedule Entry Point

**Files:**
- Modify: `mobile/src/store/tabs.ts:26`
- Modify: `mobile/src/navigation/TabManager.tsx`
- Modify: `mobile/src/screens/HomeScreen.tsx:238`

- [ ] **Step 1: Add "schedule" to Tab type union**

In `mobile/src/store/tabs.ts`, update the `Tab` interface (line 26):

```ts
export interface Tab {
  id: string;
  label: string;
  type: "myjobs" | "list" | "job" | "scanner" | "queue" | "inventory" | "section" | "schedule";
  jobName?: string;
  preselectedJob?: string;
  section?: WorkflowSection;
  closable: boolean;
}
```

- [ ] **Step 2: Add openSchedule action to tabs store**

Add after the existing `openInventory` action in `tabs.ts`:

```ts
openSchedule: () => {
  const { tabs } = get();
  const existing = tabs.find((t) => t.type === "schedule");
  if (existing) {
    set({ activeTabId: existing.id });
    return;
  }
  const newTab: Tab = {
    id: "schedule",
    label: "Schedule",
    type: "schedule",
    closable: true,
  };
  set((s) => ({
    tabs: [...s.tabs, newTab],
    activeTabId: newTab.id,
  }));
},
```

- [ ] **Step 3: Add case "schedule" to TabManager**

In `mobile/src/navigation/TabManager.tsx`, add the import at the top:

```ts
import ScheduleScreen from "../screens/ScheduleScreen";
```

Add the case in `renderContent` switch (after `case "inventory"`):

```ts
case "schedule":
  return <ScheduleScreen />;
```

Also handle `initialTab === "schedule"` in the mount effect:

```ts
if (initialTab === "schedule") {
  useTabsStore.getState().openSchedule();
}
```

- [ ] **Step 4: Enable SCHEDULE block on HomeScreen**

In `mobile/src/screens/HomeScreen.tsx`, change the schedule block (line 238):

```ts
{ key: "schedule", label: "SCHEDULE", icon: "📅", color: "#1a73e8", enabled: true },
```

Change the color from grey (`#6c757d`) to blue (`#1a73e8`) to match the active style.

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
git add mobile/src/store/tabs.ts mobile/src/navigation/TabManager.tsx mobile/src/screens/HomeScreen.tsx
git commit -m "feat: wire schedule entry point in mobile app"
```

---

## Task 15: Mobile — ScheduleScreen + API

**Files:**
- Create: `mobile/src/screens/ScheduleScreen.tsx`
- Create: `mobile/src/api/schedule.ts`
- Create: `mobile/src/components/SchedulePuck.tsx`
- Create: `mobile/src/components/TimeOffRequestModal.tsx`

- [ ] **Step 1: Create mobile schedule API helpers**

```ts
// mobile/src/api/schedule.ts
import { callMethod } from "./client";

const API = "hcp_replacement.hcp_replacement.api.schedule_utils";

export interface MobileScheduleJob {
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

export interface MobileTimeOff {
  name: string;
  employee: string;
  employee_name: string;
  date: string;
  request_type: string;
  status: "Pending" | "Approved" | "Denied";
}

export interface MobileScheduleData {
  techs: { user_id: string; employee_name: string; truck_number: number }[];
  jobs: MobileScheduleJob[];
  time_off: MobileTimeOff[];
  unscheduled: MobileScheduleJob[];
}

export async function fetchScheduleBoard(weekStart: string): Promise<MobileScheduleData> {
  return callMethod(`${API}.get_schedule_board`, { week_start: weekStart });
}

export async function createTimeOff(employee: string, date: string, requestType = "Full Day", reason = "") {
  return callMethod(`${API}.create_time_off`, { employee, date, request_type: requestType, reason });
}

export function getWeekStart(date: Date): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function formatTimeRange(start: string | null, end: string | null): string {
  if (!start && !end) return "";
  const fmt = (t: string | null) => {
    if (!t) return "";
    const [h, m] = t.split(":");
    const hour = parseInt(h, 10);
    const min = parseInt(m, 10);
    const display = hour > 12 ? hour - 12 : hour;
    return min > 0 ? `${display}:${m}` : `${display}`;
  };
  return `${fmt(start)}–${fmt(end)}`;
}
```

- [ ] **Step 2: Create SchedulePuck component**

```tsx
// mobile/src/components/SchedulePuck.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MobileScheduleJob, formatTimeRange } from "../api/schedule";

const TRADE_COLORS: Record<string, { border: string; icon: string }> = {
  plumbing: { border: "#3b82f6", icon: "💧" },
  hvac: { border: "#38bdf8", icon: "❄️" },
  electrical: { border: "#facc15", icon: "⚡" },
  other: { border: "#6b7280", icon: "🔧" },
};

function getTrade(jobType: string | null): string {
  if (!jobType) return "other";
  const lower = jobType.toLowerCase();
  if (lower.includes("hvac") || lower.includes("ac") || lower.includes("heat")) return "hvac";
  if (lower.includes("electric")) return "electrical";
  if (lower.includes("plumb")) return "plumbing";
  return "other";
}

interface SchedulePuckProps {
  job: MobileScheduleJob;
  onPress: () => void;
}

export default function SchedulePuck({ job, onPress }: SchedulePuckProps) {
  const trade = getTrade(job.job_type);
  const { border, icon } = TRADE_COLORS[trade];
  const street = job.address?.split(",")[0] || job.address || "";
  const dateStr = job.scheduled_date
    ? new Date(job.scheduled_date).toLocaleDateString("en-US", { weekday: "short", month: "numeric", day: "numeric" })
    : "";
  const timeRange = formatTimeRange(job.scheduled_start_time, job.scheduled_end_time);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.puck, { borderLeftColor: border }]}>
      <View style={styles.left}>
        <Text style={styles.customer} numberOfLines={1}>{job.customer_name}</Text>
        <Text style={styles.address} numberOfLines={1}>{street}</Text>
      </View>
      <View style={styles.center}>
        <Text style={styles.date}>{dateStr}</Text>
        <Text style={styles.time}>{timeRange}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.jobNum}>#{job.job_number}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  puck: {
    backgroundColor: "#0f1729",
    borderWidth: 1,
    borderColor: "#2a3a4e",
    borderLeftWidth: 3,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  left: { flex: 1, marginRight: 8 },
  customer: { color: "#f5f0e8", fontWeight: "600", fontSize: 13 },
  address: { color: "#354a61", fontSize: 11 },
  center: { alignItems: "center", marginRight: 8 },
  date: { color: "#f5f0e8", fontSize: 11, fontWeight: "500" },
  time: { color: "#e0c878", fontSize: 11, fontWeight: "700" },
  right: { alignItems: "flex-end" },
  icon: { fontSize: 16 },
  jobNum: { color: "#354a61", fontSize: 10, fontWeight: "500" },
});
```

- [ ] **Step 3: Create TimeOffRequestModal**

```tsx
// mobile/src/components/TimeOffRequestModal.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, Modal, StyleSheet, Platform } from "react-native";

interface TimeOffRequestModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (date: string, reason: string) => void;
}

export default function TimeOffRequestModal({ visible, onClose, onSubmit }: TimeOffRequestModalProps) {
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = () => {
    if (!date) return;
    onSubmit(date, reason);
    setDate("");
    setReason("");
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.modal}>
          <Text style={styles.title}>Request Time Off</Text>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={date}
            onChangeText={setDate}
            placeholder="2026-05-01"
            placeholderTextColor="#354a61"
          />
          <Text style={styles.label}>Reason (optional)</Text>
          <TextInput
            style={[styles.input, { height: 60 }]}
            value={reason}
            onChangeText={setReason}
            placeholder="Personal day"
            placeholderTextColor="#354a61"
            multiline
          />
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitText}>Submit Request</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#1a2332", borderRadius: 16, padding: 24, width: "85%", borderWidth: 1, borderColor: "#2a3a4e" },
  title: { color: "#c9a84c", fontSize: 16, fontWeight: "700", marginBottom: 16, textAlign: "center" },
  label: { color: "#354a61", fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginBottom: 4, marginTop: 8 },
  input: { backgroundColor: "#0f1729", borderWidth: 1, borderColor: "#2a3a4e", borderRadius: 8, padding: 10, color: "#f5f0e8", fontSize: 14 },
  submitBtn: { backgroundColor: "#c9a84c", borderRadius: 8, paddingVertical: 12, marginTop: 16 },
  submitText: { color: "#0f1729", textAlign: "center", fontWeight: "700", fontSize: 14 },
  cancelText: { color: "#354a61", textAlign: "center", marginTop: 12, fontSize: 13 },
});
```

- [ ] **Step 4: Create ScheduleScreen**

```tsx
// mobile/src/screens/ScheduleScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { View, Text, SectionList, TouchableOpacity, StyleSheet, RefreshControl, ScrollView } from "react-native";
import { useJobsStore } from "../store/jobs";
import { useTabsStore } from "../store/tabs";
import { fetchScheduleBoard, MobileScheduleJob, MobileTimeOff, MobileScheduleData, getWeekStart, createTimeOff } from "../api/schedule";
import SchedulePuck from "../components/SchedulePuck";
import TimeOffRequestModal from "../components/TimeOffRequestModal";

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri"];

export default function ScheduleScreen() {
  const openJob = useTabsStore((s) => s.openJob);
  const currentUser = useJobsStore((s) => s.currentUser);
  const currentEmployee = useJobsStore((s) => s.currentEmployeeName);

  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [data, setData] = useState<MobileScheduleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [showTimeOff, setShowTimeOff] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const result = await fetchScheduleBoard(weekStart);
      setData(result);
    } catch (err) {
      console.error("Failed to load schedule:", err);
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => { loadData(); }, [loadData]);

  // Build week days
  const days = useMemo(() => {
    const result: { date: string; label: string; dayName: string }[] = [];
    const start = new Date(weekStart + "T00:00:00");
    for (let i = 0; i < 5; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      result.push({
        date: d.toISOString().split("T")[0],
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        dayName: DAY_NAMES[i],
      });
    }
    return result;
  }, [weekStart]);

  // Filter to current user's jobs
  const myJobs = useMemo(() => {
    if (!data || !currentUser) return [];
    return data.jobs.filter((j) => j.assigned_techs.some((t) => t.tech_user === currentUser));
  }, [data, currentUser]);

  // My time-off
  const myTimeOff = useMemo(() => {
    if (!data || !currentEmployee) return [];
    return data.time_off.filter((t) => t.employee_name === currentEmployee);
  }, [data, currentEmployee]);

  // Group jobs by day for SectionList
  const sections = useMemo(() => {
    const target = selectedDay ? [days.find((d) => d.date === selectedDay)!] : days;
    return target.filter(Boolean).map((day) => {
      const dayJobs = myJobs.filter((j) => (j.scheduled_date || "").split(" ")[0] === day.date);
      const dayOff = myTimeOff.filter((t) => t.date === day.date);
      return { title: `${day.dayName} ${day.label}`, data: dayJobs, timeOff: dayOff, date: day.date };
    });
  }, [days, myJobs, myTimeOff, selectedDay]);

  const navigateWeek = (dir: -1 | 1) => {
    const d = new Date(weekStart + "T00:00:00");
    d.setDate(d.getDate() + dir * 7);
    setWeekStart(d.toISOString().split("T")[0]);
    setSelectedDay(null);
    setLoading(true);
  };

  const handleTimeOffSubmit = async (date: string, reason: string) => {
    if (!currentEmployee) return;
    // Find employee name to look up employee ID
    const tech = data?.techs.find((t) => t.user_id === currentUser);
    if (!tech) return;
    try {
      // We need the Employee doctype name, not the user_id
      // The tech list gives us user_id — we pass it and let the backend resolve
      await createTimeOff(tech.user_id, date, "Full Day", reason);
      loadData();
    } catch (err) {
      console.error("Failed to create time off:", err);
    }
  };

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <View style={styles.container}>
      {/* Week navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={() => navigateWeek(-1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {days[0]?.label} — {days[4]?.label}
        </Text>
        <TouchableOpacity onPress={() => navigateWeek(1)} style={styles.navBtn}>
          <Text style={styles.navBtnText}>→</Text>
        </TouchableOpacity>
      </View>

      {/* Day strip */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayStrip}>
        {days.map((day) => {
          const hasOff = myTimeOff.some((t) => t.date === day.date);
          const isSelected = selectedDay === day.date;
          const isToday = day.date === todayStr;
          return (
            <TouchableOpacity
              key={day.date}
              onPress={() => setSelectedDay(isSelected ? null : day.date)}
              style={[styles.dayPill, isSelected && styles.dayPillActive, isToday && !isSelected && styles.dayPillToday]}
            >
              <Text style={[styles.dayName, isSelected && styles.dayNameActive]}>{day.dayName}</Text>
              <Text style={[styles.dayDate, isSelected && styles.dayDateActive]}>{day.label}</Text>
              {hasOff && <View style={[styles.offDot, { backgroundColor: myTimeOff.find((t) => t.date === day.date)?.status === "Approved" ? "#22c55e" : myTimeOff.find((t) => t.date === day.date)?.status === "Denied" ? "#ef4444" : "#eab308" }]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Request time off button */}
      <TouchableOpacity style={styles.timeOffBtn} onPress={() => setShowTimeOff(true)}>
        <Text style={styles.timeOffBtnText}>Request Time Off</Text>
      </TouchableOpacity>

      {/* Job list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.name}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {(section as any).timeOff?.map((t: MobileTimeOff) => (
              <View key={t.name} style={[styles.offBadge, { backgroundColor: t.status === "Approved" ? "#162e1e" : t.status === "Denied" ? "#2e1616" : "#2e2a16", borderColor: t.status === "Approved" ? "#22c55e" : t.status === "Denied" ? "#ef4444" : "#eab308" }]}>
                <Text style={{ color: t.status === "Approved" ? "#22c55e" : t.status === "Denied" ? "#ef4444" : "#eab308", fontSize: 10, fontWeight: "700" }}>
                  {t.status === "Approved" ? "OFF" : t.status === "Denied" ? "OFF DENIED" : "OFF (Pending)"}
                </Text>
              </View>
            ))}
          </View>
        )}
        renderItem={({ item }) => (
          <SchedulePuck job={item} onPress={() => openJob(item.name, item.address)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>{loading ? "Loading..." : "No jobs this week"}</Text>
        }
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#c9a84c" />}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }}
        stickySectionHeadersEnabled
      />

      <TimeOffRequestModal visible={showTimeOff} onClose={() => setShowTimeOff(false)} onSubmit={handleTimeOffSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1729" },
  weekNav: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 12, gap: 16 },
  navBtn: { backgroundColor: "#1a2332", borderWidth: 1, borderColor: "#2a3a4e", borderRadius: 8, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  navBtnText: { color: "#f5f0e8", fontSize: 16 },
  weekLabel: { color: "#f5f0e8", fontSize: 15, fontWeight: "600" },
  dayStrip: { paddingHorizontal: 12, maxHeight: 70 },
  dayPill: { backgroundColor: "#1a2332", borderWidth: 1, borderColor: "#2a3a4e", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, alignItems: "center" },
  dayPillActive: { backgroundColor: "#c9a84c", borderColor: "#c9a84c" },
  dayPillToday: { borderColor: "#c9a84c" },
  dayName: { color: "#c9a84c", fontSize: 11, fontWeight: "700", textTransform: "uppercase" },
  dayNameActive: { color: "#0f1729" },
  dayDate: { color: "#f5f0e8", fontSize: 14, fontWeight: "600", marginTop: 2 },
  dayDateActive: { color: "#0f1729" },
  offDot: { width: 6, height: 6, borderRadius: 3, marginTop: 3 },
  timeOffBtn: { marginHorizontal: 12, marginVertical: 8, borderWidth: 1, borderColor: "#c9a84c", borderRadius: 8, paddingVertical: 8, alignItems: "center" },
  timeOffBtnText: { color: "#c9a84c", fontSize: 12, fontWeight: "600" },
  sectionHeader: { backgroundColor: "#0f1729", paddingVertical: 8, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", gap: 8 },
  sectionTitle: { color: "#c9a84c", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 1 },
  offBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  empty: { color: "#354a61", textAlign: "center", marginTop: 40, fontSize: 14 },
});
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
git add mobile/src/screens/ScheduleScreen.tsx mobile/src/api/schedule.ts mobile/src/components/SchedulePuck.tsx mobile/src/components/TimeOffRequestModal.tsx
git commit -m "feat: mobile schedule screen with weekly view and time-off requests"
```

---

## Task 16: Final Push + Integration Test

- [ ] **Step 1: Fix the create_time_off endpoint for user_id lookup**

The mobile sends `user_id` (email) but `create_time_off` expects an Employee name. Update `create_time_off` in `schedule_utils.py` to accept either:

```python
@frappe.whitelist()
def create_time_off(employee, date, request_type="Full Day", reason=""):
    """Create a pending time-off request. Works for both tech self-request and manager entry.

    employee can be an Employee name (HR-EMP-00001) or a user_id (email).
    """
    # Resolve user_id → Employee name if needed
    if "@" in str(employee):
        emp_name = frappe.db.get_value("Employee", {"user_id": employee}, "name")
        if not emp_name:
            frappe.throw(f"No employee found for user {employee}")
        employee = emp_name

    emp_full_name = frappe.db.get_value("Employee", employee, "employee_name")
    if not emp_full_name:
        frappe.throw(f"Employee {employee} not found")

    doc = frappe.get_doc({
        "doctype": "MTM Time Off Request",
        "employee": employee,
        "employee_name": emp_full_name,
        "date": date,
        "request_type": request_type,
        "reason": reason,
        "status": "Pending",
        "requested_by": frappe.session.user,
    })
    doc.insert(ignore_permissions=True)
    return {"name": doc.name, "status": doc.status}
```

- [ ] **Step 2: Push backend**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
git add -A && git commit -m "fix: create_time_off accepts user_id or employee name"
git push origin main
```

- [ ] **Step 3: Push web**

```bash
cd "C:/Dev/ManyTalentsMore"
git push origin master
```

- [ ] **Step 4: Push mobile**

```bash
cd "C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement"
git push origin main
```

- [ ] **Step 5: Enable the scheduling flag**

Go to `manytalentsmore.com/manager/admin/features` → toggle Scheduling ON.

- [ ] **Step 6: End-to-end verification checklist**

1. Schedule nav link appears in web NavBar
2. Gear icon links to admin features page
3. Schedule board loads with tech rows and day columns
4. Unscheduled sidebar shows jobs without dates
5. Drag puck from sidebar to cell → time picker appears → puck lands in cell
6. Drag puck between cells → job schedule updates
7. Click puck → navigates to job detail
8. Time-off: click "+" in cell → create time-off → puck appears
9. Approve/deny time-off puck → status changes
10. Projection mode → full-screen, auto-refreshes
11. Weekend checkboxes → Sat/Sun columns appear
12. Mobile: SCHEDULE block on HomeScreen is active
13. Mobile: weekly view shows current tech's jobs grouped by day
14. Mobile: day strip → tap to filter
15. Mobile: Request Time Off → modal → submit → pending puck appears

- [ ] **Step 7: Update progress file**

Update `C:/Users/chris/OneDrive/Documentos/AllTecPro/hcp_replacement/progress.txt` with session summary.
