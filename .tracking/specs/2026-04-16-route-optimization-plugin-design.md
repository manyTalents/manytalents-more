# Route Optimization Plugin — Design Spec

**Working Title:** RouteIQ
**Date:** 2026-04-16
**Prepared by:** 10T (Brainstorming session with Owner)
**Status:** Approved by Owner

---

## 1. Product Vision

A standalone web app for field service route optimization — the first module of a future AI-driven dispatch engine. Works independently for any field service business. Offers a paid integration tier for MTM/ERPNext customers.

### Target Market
- Field service businesses (plumbing, HVAC, electrical, landscaping, pest control, etc.)
- Sweet spot: 3-15 techs in metro areas where routing inefficiency costs real money
- Not custom to AllTec — built for broad market appeal

### Future Direction
Route optimization is the wedge. The long-term vision is a full AI-driven dispatch system that auto-schedules the entire day based on job priority, tech capabilities, urgency, customer history, and learned patterns.

---

## 2. Pricing Model

| Tier | Cost | What You Get |
|------|------|-------------|
| **Free Trial** | $0 for trial period | Full standalone features, limited time |
| **Standalone** | Per-tech/month | Route optimization, tech check-in/out, dispatch board |
| **MTM Add-on** | +$X/month flat (no per-tech charge) | Auto-sync jobs/techs from ERPNext, push routes back, smart constraints from historical data, learning loop |

- 3 or fewer techs: lower per-tech cost to encourage adoption
- More than 3 techs: cost scales per tech
- MTM subscribers get the add-on as a flat monthly fee on top of their MTM subscription — no additional per-tech charges

---

## 3. Architecture

```
┌─────────────────────────────────────┐
│  Next.js Frontend (Vercel)          │
│  - Dispatch board                   │
│  - Map view (Mapbox GL JS)          │
│  - Tech/job management              │
│  - Tech route sharing (unique URLs) │
└──────────────┬──────────────────────┘
               │ API calls
               ▼
┌─────────────────────────────────────┐
│  Supabase                           │
│  - PostgreSQL (multi-tenant via RLS)│
│  - Auth (sign-up, login, roles)     │
│  - Real-time subscriptions          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  Serverless Python Solver           │
│  (Google Cloud Function)            │
│  - Google OR-Tools (VRP engine)     │
│  - Stateless: receives jobs/techs/  │
│    constraints, returns routes      │
│  - Pay-per-invocation (~$0 at low   │
│    usage)                           │
└─────────────────────────────────────┘

        ┌──── PAID ADD-ON ────┐
        │  MTM/ERPNext Bridge │
        │  - Syncs jobs/techs │
        │  - Syncs availability│
        │  - Pushes routes    │
        │    back to ERPNext  │
        │  - Learning loop    │
        └─────────────────────┘
```

### Key Architecture Decisions
- **Multi-tenant from day one** — Row-Level Security in Supabase isolates every customer's data
- **Solver is stateless** — receives inputs, returns optimized routes, no state to manage
- **MTM integration is a separate module** — clean boundary, enable/disable per customer
- **Data model supports future AI dispatch** — stores enough context (job duration history, tech performance) for a learning layer later
- **Standalone repo** — separate from MTM codebase

---

## 4. Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) | Same stack as MTM web, free Vercel deploys |
| UI | Tailwind + shadcn/ui | Fast to build, clean, consistent with MTM |
| Maps | Mapbox GL JS | Free tier: 50k map loads/month, superior styling |
| Auth | Supabase Auth | Free tier, handles sign-up/login, RLS |
| Database | Supabase PostgreSQL | Multi-tenant, real-time subscriptions |
| Solver | Google OR-Tools (Python) | Gold standard VRP solver, free, open source |
| Solver Hosting | Google Cloud Function | Pay-per-invocation, ~$0 at low usage, 2-3s cold start |
| Geocoding | Google Maps Geocoding API | $5/1000 addresses, cached for repeat lookups |
| Tech Routes | Unique URL per tech per day | No app install, works on any phone browser |
| MTM Bridge | Frappe API client | Talks to ERPNext REST API |

### Cost Profile
- **At zero customers:** ~$0/month
- **At 100 customers:** ~$20-50/month (mostly geocoding API + Mapbox loads)

---

## 5. Data Model

### Users & Tenants
- `organization` — the company (multi-tenant isolation key)
- `user` — login, role (admin/dispatcher/viewer), org membership
- `subscription` — plan tier, tech count, MTM add-on flag

### Techs
- `technician` — name, home address, lat/lng, default start time, default quit time, skills (tags)
- `tech_availability` — per-day record:
  - working: yes/no
  - quit time override (for early days)
  - unavailable blocks: JSON array of time ranges (haircut at 2, lunch from 12-1, etc.)

### Jobs
- `job` — address, lat/lng, customer name, estimated duration, time window (earliest/latest), required skills, priority, status (unassigned/assigned/in_progress/completed/cancelled)
- `job_source` — origin: manual, CSV, or MTM sync (with ERPNext reference ID)

### Routes
- `route_plan` — a single optimization run: timestamp, parameters used, solver stats
- `route_assignment` — tech + ordered list of jobs for that plan, with estimated drive times and arrival windows
- `route_history` — archived plans for analytics and future AI learning loop

### MTM Bridge (integration tier only)
- `erpnext_sync_config` — connection URL, API keys, sync frequency
- `erpnext_mapping` — maps local tech/job IDs to ERPNext doctypes
- `sync_log` — audit trail of every sync event

### Geocoding
- `geocode_cache` — address → lat/lng cache to avoid redundant API calls

---

## 6. Core Features (MVP)

### For All Users (Standalone)

1. **Job Entry** — Add jobs manually, paste a list, or CSV import. Fields: address, time window (optional), estimated duration (optional), required skills (optional), priority
2. **Tech Management** — Add techs with: name, home/start address, skills (optional), working hours, default quit time
3. **Tech Availability** — Per-day toggle: working/off. Quit time override for early days. Unavailable time blocks for mid-day gaps.
4. **One-Click Optimize** — Hit the button, get optimized routes in 2-5 seconds via Google OR-Tools VRP solver
5. **Route View — List** — Ordered job sequence per tech with drive times between stops, total drive time, estimated arrival windows
6. **Route View — Map** — Color-coded routes per tech on interactive Mapbox map
7. **Manual Overrides** — Pin specific jobs to specific techs. Optimizer respects pinned assignments and optimizes everything else around them. Drag-and-drop or dropdown assignment.
8. **Re-optimize Mid-Day** — Job cancelled? Emergency added? Re-optimize with changes. Completed jobs lock in place — only unstarted jobs get reshuffled.
9. **Tech Check-In/Check-Out** — Techs access their route via unique URL (no login needed). Check in when arriving at a job, check out when leaving. Gives dispatcher real-time status.
10. **Share Routes** — Send a tech their daily route via link (text/email). No app install required.

### For MTM Subscribers (Paid Add-On)

11. **Auto-Pull Jobs & Techs** — Jobs and tech availability sync from ERPNext automatically each morning (or on-demand)
12. **Auto-Sync Availability** — Clock-in status from ERPNext determines who's working. Vacation/PTO from HR module automatically excludes techs. No manual toggling needed.
13. **Push Routes Back** — Optimized routes push to ERPNext, updating the dispatch board and tech's mobile app (AllTec Pro)
14. **Smart Constraints** — Pulls tech skills, customer history, job duration averages from ERPNext data for better routing decisions
15. **Learning Loop** — Tracks actual vs. estimated job durations over time, improves future estimates

### NOT in MVP
- AI auto-dispatch (future — data model supports it)
- Multi-day planning
- Real-time traffic adjustments
- Customer notifications
- Invoicing/payments

---

## 7. User Experience Flow

### Dispatcher Morning Flow
```
1. OPEN APP
   ├── Standalone: See today's job list (entered yesterday or imported)
   └── MTM: Jobs auto-pulled from ERPNext overnight

2. CHECK TECHS
   ├── Standalone: Toggle who's working, set quit times, unavailable blocks
   └── MTM: Auto-populated from clock-ins. Adjust if needed.

3. PIN JOBS (optional)
   └── "This job MUST go to Billy" → pin it. Optimizer works around it.

4. HIT "OPTIMIZE"
   └── 2-5 seconds → routes appear

5. REVIEW
   ├── List view: scan each tech's sequence, check drive times
   ├── Map view: see the routes visually, spot anything weird
   └── Drag to override: move a job, re-optimize the rest

6. DISPATCH
   ├── Standalone: Share route links to techs (text/email)
   └── MTM: Push to ERPNext → shows on tech's mobile app

7. MID-DAY CHANGES
   └── Add/remove jobs, hit optimize again.
       Completed jobs stay locked. Only pending jobs reshuffled.
```

### Tech View (Standalone)
- Access route via unique URL on phone browser
- See ordered job list for the day
- Check in when arriving at a job
- Check out when leaving
- No editing, no dispatching — view and check-in only

### Tech View (MTM)
- Same functionality but inside the AllTec Pro mobile app
- Check-in/out syncs to ERPNext timesheets automatically

---

## 8. Solver Details

### The Math
- **Problem type:** Vehicle Routing Problem with Time Windows (VRPTW)
- **Solver:** Google OR-Tools — free, open source, used by Google internally
- **NP-hard problem** — no perfect solution exists, solver uses heuristics and approximation algorithms to find very good solutions quickly

### Constraints the Solver Respects
1. **Travel time/distance** between all job locations (via distance matrix)
2. **Tech availability** — only working techs get assigned
3. **Quit times** — no jobs scheduled past a tech's quit time
4. **Unavailable blocks** — routes around mid-day gaps
5. **Time windows** — customer appointment promises ("between 1-3 PM")
6. **Job duration** — a 30-min service call vs. 4-hour install
7. **Required skills** — HVAC job can't go to a plumber-only tech
8. **Pinned assignments** — manually assigned jobs are hard constraints
9. **Completed jobs** — locked in place during re-optimization
10. **Tech start/end locations** — usually home address

### Performance Target
- Optimize 50 jobs across 10 techs in under 5 seconds
- Cold start (first run of the day): add 2-3 seconds for serverless warm-up

---

## 9. Competitive Positioning

### Why This Wins
- **HCP has no route optimization** — they market it but reviews confirm it's just a map view with manual dispatching
- **ServiceTitan is overkill** — enterprise pricing, complex setup, targets 20+ truck operations
- **Jobber added optimization in 2025** — but it's locked into their platform
- **Standalone tools (OptimoRoute, Beeline)** — separate subscription, no integration with your FSM software

### RouteIQ's Angle
- **Actually solves the VRP** — algorithmic optimization, not a map with drag-and-drop
- **Works standalone** — no platform lock-in, any business can use it
- **Seamless MTM integration** — for MTM customers, it's a native feature, not a bolt-on
- **Free trial, fair pricing** — per-tech scaling, no enterprise minimums
- **Built for 3-15 tech sweet spot** — where manual dispatch breaks down and ServiceTitan is overkill
