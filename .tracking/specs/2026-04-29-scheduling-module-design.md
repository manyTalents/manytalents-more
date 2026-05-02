# MTM Scheduling Module — Design Spec

**Date:** 2026-04-29
**Status:** Approved
**Owner:** Chris (AllTec)
**Delegated to:** Glass (web), Forge (backend), Swift (mobile)
**Mockup:** `docs/mockups/schedule-board-mockup.html`

---

## Overview

A digital schedule board for the MTM web dashboard that replicates AllTec's physical whiteboard. Techs are rows, days are columns, jobs are draggable "pucks" placed in the grid. Techs see their schedule on the mobile app. Time-off requests flow through the same system.

The schedule board is a **live view of the data** — assigning a tech + date/time from any view in MTM automatically places the puck. Dragging a puck updates the underlying job. One source of truth.

**HCP sync is one-way only:** HCP pushes jobs into MTM via webhook. MTM does NOT push schedule changes back to HCP.

---

## Data Model

### New Fields on HCP Job (created via Frappe Cloud API, no bench)

| Field | Type | Description |
|---|---|---|
| `scheduled_start_time` | Time | Start of work block (e.g. "08:00") |
| `scheduled_end_time` | Time | End of work block (e.g. "12:00") |

Existing `scheduled_date` (Datetime) remains as the date anchor. The new time fields provide the time block range shown on pucks (e.g. "8–12").

### New Doctype: MTM Time Off Request (created via API)

| Field | Type | Description |
|---|---|---|
| `employee` | Link → Employee | Required |
| `employee_name` | Data | Fetched from employee |
| `date` | Date | The day off |
| `request_type` | Select | Full Day / Half Day AM / Half Day PM |
| `reason` | Small Text | Optional |
| `status` | Select | Pending / Approved / Denied |
| `requested_by` | Link → User | Who created it (tech or manager) |
| `approved_by` | Link → User | Who approved/denied |
| `approved_at` | Datetime | When approved/denied |

### Feature Flag

Add `enable_scheduling` (Check, default 0) to the MTM Feature Flags singleton doctype. Add `"scheduling": bool(flags.enable_scheduling)` to `get_feature_flags()`.

---

## Web — Schedule Board

### Route

`manytalentsmore.com/manager/schedule`

### Layout

**Left sidebar — Unscheduled Jobs Queue:**
- Scrollable list of pucks for jobs with no scheduled date or no assigned tech
- Filterable by trade (All / Plumbing / HVAC / Electrical)
- Pucks are draggable onto the grid

**Main grid:**
- **Header row:** Mon through Fri with dates (e.g. "4/28 MON"). Discrete checkboxes toggle Sat/Sun columns.
- **Left column:** Truck rows — one per active tech (e.g. "TRUCK #1 Adam"). Order matches physical board.
- **Cells:** Each tech+day intersection. Pucks stack vertically. 3 pucks fill the cell; 4+ scroll with thin scrollbar.
- **Week navigation:** ← → arrows, week label ("Apr 28 — May 2, 2026"), "This Week" button to jump back.

### Puck Design (3-column grid layout)

```
┌─────────────────────────────────────────┐
│ Customer Name   │ Wed 4/30 │  ❄️ (HVAC) │
│ 16719 LA-151    │  8–12    │  #40857    │
└─────────────────────────────────────────┘
```

- **Left:** Customer name (bold), street address below (muted)
- **Center:** Date, time block below (gold, bold)
- **Right:** Trade icon (💧 plumbing/blue, ❄️ HVAC/blue, ⚡ electrical/yellow), job number below
- **Left border accent:** Colored by trade
- Click opens job detail (`/manager/jobs/[name]`)

### Time-Off Pucks

Appear in the cell like job pucks but with distinct styling:
- **Approved:** Green background, green border, text "OFF"
- **Denied:** Red background, red border, text "OFF DENIED"
- **Pending:** Yellow background, yellow border, text "OFF (Pending)" — click to approve/deny

### Projection Mode

- Toggle button in header: "Projection"
- Full-screen, read-only view — hides sidebar, NavBar, interactive controls
- Just the grid + pucks, sized to fill a projected screen
- Auto-refreshes every 30 seconds
- Designed to be readable from across the shop

### Interactive Mode

- Default mode with full drag-and-drop
- Auto-refreshes every 60 seconds

---

## Web — Interactions

### Drag and Drop

- **Sidebar → Cell:** Drop an unscheduled puck onto a tech+day cell. Popover appears with quick-pick time blocks (8–10, 10–12, 1–3, 3–5) and custom time entry. Selecting a time saves the job.
- **Cell → Cell:** Drag a puck between cells. Updates the job's assigned tech and/or scheduled date. Time stays the same unless manually changed.
- **Implementation:** HTML Drag and Drop API. Mouse-only (no touch on web). Projection mode is read-only.

### Quick-Pick Time Blocks

Standard blocks offered on schedule assignment:
- 8–10
- 10–12
- 1–3
- 3–5
- Custom (manual start/end time entry)

### Time-Off Management

- "+" button appears on cell hover → add time-off for that tech+day
- Manager can also bulk-add (e.g. "Adam off Mon–Fri")
- Click a pending time-off puck to approve/deny
- Both techs (via mobile) and managers (via web) can create time-off requests

### Admin Nav

Gear icon added to right side of NavBar, next to Log Out. Links to `/manager/admin/features`. Always visible, not behind a feature flag.

---

## Mobile App — Tech Schedule View

### Entry Point

SCHEDULE block on HomeScreen — already stubbed as disabled "COMING SOON". Enable it and wire to the new ScheduleScreen.

### Weekly View (default)

- Horizontal week strip at top: Mon–Fri with dates, swipeable to change weeks
- Below: vertical list of current tech's pucks for that week, grouped by day
- Same puck layout as web (customer, address, date/time, trade, job#) sized for mobile
- Tap a puck → opens job detail

### Daily View

- Tap a day in the week strip to drill into that day
- Shows just that day's pucks, larger, with more room

### Time-Off Requests

- "Request Time Off" button at top of schedule screen
- Date picker (or date range), optional reason, submit
- Pending/approved/denied status shows as colored dot on the relevant day in the week strip

### No Drag-and-Drop on Mobile

Techs view their schedule. They don't rearrange it. Scheduling is done by Katelyn/Zach/Adam on the web.

---

## Backend API

### New Module: `api/schedule_utils.py`

| Endpoint | Params | Description |
|---|---|---|
| `get_schedule_board` | `week_start` (date) | Returns all jobs + time-off for the week, grouped by tech. Powers the entire board in one call. |
| `update_job_schedule` | `job_name`, `scheduled_date`, `start_time`, `end_time`, `tech_user` | Called on drag-and-drop or manual edit. Updates job fields + assigned tech atomically. |
| `get_time_off_requests` | `week_start` (date) | Returns all time-off requests for the week. |
| `create_time_off` | `employee`, `date`, `request_type`, `reason` | Creates a Pending request. Works for both tech self-request and manager entry. |
| `approve_time_off` | `request_name` | Sets status to Approved, records approver + timestamp. |
| `deny_time_off` | `request_name` | Sets status to Denied, records approver + timestamp. |

### Modified Existing

- **`get_feature_flags()`** — add `"scheduling": bool(flags.enable_scheduling)` to the return dict and the fallback block.
- **HCP sync (`hcp_sync.py`)** — extract `scheduled_end` from HCP payload (currently ignored) and map to `scheduled_end_time` on the job. Continue extracting `scheduled_start` to `scheduled_date` as today.

### Doctype Creation

Both new fields on HCP Job and the MTM Time Off Request doctype are created via Frappe REST API (`custom=1`), consistent with "no bench on Frappe Cloud" rule.

---

## Feature Flag & Rollout

**Flag:** `enable_scheduling` — default off.

**When enabled:**
- "Schedule" link appears in web NavBar
- `/manager/schedule` page is accessible (page guard redirects if flag is off)
- SCHEDULE block enables on mobile HomeScreen

**Rollout:**
1. Build with flag off
2. Flip on for internal testing (Chris, Adam, Katelyn)
3. Leave on permanently once stable

---

## Out of Scope

- Route optimization / RouteIQ integration (separate feature, separate spec)
- Conflict detection / double-booking warnings (future enhancement)
- HCP write-back (MTM does not push schedule changes to HCP)
- Customer-facing arrival window notifications
- Recurring/template schedules
