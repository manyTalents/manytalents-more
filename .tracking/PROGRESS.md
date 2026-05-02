# ManyTalents Money — Dashboard Hub

## Project Description
Connect VEOE (options trading) and Crypto Bot dashboards to manytalentsmore.com as a unified "Money" product. Frontend in the Next.js monorepo, APIs on DigitalOcean droplet behind Nginx reverse proxy.

## Current Status
**ALL PHASES COMPLETE** — Frontend deployed to Vercel, infrastructure live on droplet.

## Session Log — 2026-04-12

### Completed
- **Plan approved** — Architecture: direct API calls from Next.js to droplet via Nginx + SSL + CORS
- **Task #1** — Installed `lightweight-charts` + `recharts` (chart dependencies)
- **Task #2** — Created `money-auth.ts`, `money-api.ts`, `money-types.ts` (auth helpers, typed API client, interfaces)
- **Task #3** — Created `/api/money/verify/route.ts` (password → token exchange endpoint)
- **Task #4** — Created `/money/layout.tsx` + `/money/page.tsx` (Money layout + login page)
- **Task #5** — Created 9 shared components: MoneyNav, AuthGate, MetricCard, EquityChart, TradeTable, SignalCard, StatusBadge, DrawdownGauge, StrategyCard
- **Task #6** — Created `/money/hub/page.tsx` (combined portfolio overview — both bots, dual equity curves)
- **Task #7** — Created `/money/veoe/page.tsx` (VEOE detail — summary cards, equity curve, open trades, signals, alpha benchmark, config)
- **Task #8** — Created `/money/crypto/page.tsx` (Crypto detail — live WebSocket balance, equity curve, positions, strategies, signals, risk, pair learner, operator/investor toggle)
- **Task #9** — Updated landing page card #03 from "Coming Soon" → "Open Money" with active link
- **Task #10** — Prepared Nginx config + deployment instructions for Helm

### Decisions Made
- Auth: Simple password → shared DASHBOARD_TOKEN (not Frappe). Single-user dashboard.
- Charts: lightweight-charts v5 (AreaSeries via `addSeries()`) + recharts
- Architecture: Direct browser → Nginx → API calls (not proxied through Next.js for speed/WebSocket)
- Both bots already on droplet — no migration needed

### Post-Deploy Fixes
- **CORS preflight fix** — VEOE AuthMiddleware was blocking OPTIONS requests (returned 401). Added `if request.method == "OPTIONS": pass through` to middleware. Pushed via SCP + container restart.
- **SSR crash fix** — `lightweight-charts` accesses `window` at import time. Moved to dynamic `import()` inside `useEffect` to prevent server-side crash.
- **API response format fix** — VEOE API wraps arrays in objects (`{points: [...]}`, `{trades: [...]}`, `{signals: [...]}`). Updated `money-api.ts` to unwrap. Also fixed equity field name (`value` not `equity`).
- **Password env var fix** — Apostrophe in `Christ'ssteward` was mangled by shell pipe. Removed and re-added via `printf`.
- **Manager type error** — `useRef()` needs initial value in React 19 strict mode. Fixed `useRef<...>()` → `useRef<...>(undefined)`.

### TypeScript Verification
- `npx tsc --noEmit` passes clean (0 errors)

### Infrastructure Deployed
- DNS: `money-api.manytalentsmore.com` → `104.131.176.130` (A record via Vercel DNS)
- Caddy reverse proxy with auto-SSL (Let's Encrypt) running on droplet
- `/veoe/*` → port 8501, `/crypto/*` → port 8080, WebSocket proxied
- UFW opened: ports 80, 443, 8080
- VEOE: CORS + Bearer token auth added to dashboard.py
- Crypto: CORSMiddleware activated in dashboard_api.py
- Both containers aligned on shared DASHBOARD_TOKEN
- Vercel env vars set: `MONEY_PASSWORD`, `MONEY_API_TOKEN`, `NEXT_PUBLIC_MONEY_API`
- Frontend pushed to master, Vercel auto-deployed (commit b631113)

## Resume Point
**Live at:** https://manytalentsmore.com/money
**Password:** Christ'ssteward

**If something needs fixing:**
1. **Phase 1 (Infrastructure):** Helm needs to execute droplet deployment:
   - DNS: A record `money-api.manytalentsmore.com` → `104.131.176.130`
   - Install Nginx on droplet, deploy `nginx-money-api.conf`
   - SSL via certbot
   - Align DASHBOARD_TOKEN across both bot containers
2. **Kit** needs to add CORS middleware to both backends:
   - VEOE: Add Bearer token auth + CORSMiddleware
   - Crypto: Activate existing CORSMiddleware import
3. **Vercel env vars:** Set `MONEY_PASSWORD`, `MONEY_API_TOKEN`, `NEXT_PUBLIC_MONEY_API`
4. Push to master → Vercel auto-deploys
5. End-to-end smoke test

All infrastructure instructions are in `Team Inbox/money-api-infra/`.
