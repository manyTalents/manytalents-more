# ManyTalentsMore — DECISIONS

> 8 decisions logged | Last: 2026-05-02

---

### 2026-04-12 — Auth: password token, not Frappe SSO
**Context:** Money dashboard needed access control for a single-user private view.
**Decision:** Simple password → shared DASHBOARD_TOKEN exchange. No Frappe SSO.
**Rationale:** Dashboard is single-user only. Frappe SSO adds complexity with no benefit here.
**Members:** Kit

---

### 2026-04-12 — Architecture: direct browser to API (no Next.js proxy)
**Context:** Money dashboard needs real-time data and WebSocket support from the droplet.
**Decision:** Direct browser → Nginx → API calls. Next.js does not proxy these requests.
**Rationale:** Speed improvement and native WebSocket support. Proxying through Next.js would break WebSocket connections.
**Members:** Kit

---

### 2026-04-12 — Charts: lightweight-charts v5 + recharts
**Context:** Need charting for equity curves, drawdown gauges, and signal displays.
**Decision:** Use lightweight-charts v5 (with `addSeries()` API) for time-series and recharts for supporting charts.
**Rationale:** lightweight-charts is purpose-built for financial time-series; recharts fills in for non-time-series needs.
**Members:** Kit

---

### 2026-04-12 — Infrastructure: Caddy reverse proxy (not Nginx)
**Context:** Originally planned Nginx on the droplet. Switched during deployment.
**Decision:** Caddy reverse proxy with automatic Let's Encrypt SSL on the droplet.
**Rationale:** Caddy handles SSL automatically without certbot ceremony; simpler config for this use case.
**Members:** Kit, Helm

---

### 2026-04-12 — DNS: money-api subdomain to droplet IP
**Context:** Frontend on Vercel needs to reach the API on the DigitalOcean droplet.
**Decision:** A record `money-api.manytalentsmore.com` → `104.131.176.130` via Vercel DNS.
**Rationale:** Clean subdomain separation between frontend (Vercel) and API (droplet). Avoids CORS complications from arbitrary IP usage.
**Members:** Helm, Kit

---

### 2026-04-12 — CORS fix: OPTIONS passthrough in VEOE auth middleware
**Context:** VEOE AuthMiddleware was returning 401 on CORS preflight OPTIONS requests, blocking all browser requests.
**Decision:** Added OPTIONS method passthrough before token check in middleware.
**Rationale:** OPTIONS is a browser preflight — it never carries auth credentials. Blocking it breaks CORS for all authenticated requests.
**Members:** Kit

---

### 2026-04-12 — SSR fix: dynamic import for lightweight-charts
**Context:** lightweight-charts accesses `window` at import time, causing Next.js SSR crashes.
**Decision:** Moved to dynamic `import()` inside `useEffect` instead of top-level import.
**Rationale:** Defers execution to client-side only. Standard pattern for browser-only libraries in Next.js.
**Members:** Kit

---

### 2026-04-12 — Password env var: use printf, not shell pipe
**Context:** DASHBOARD_TOKEN password `Christ'ssteward` contains an apostrophe that was mangled by shell pipe expansion.
**Decision:** Set env var using `printf` to avoid shell interpolation of special characters.
**Rationale:** Shell pipes expand single quotes. `printf` passes the string literally without interpolation.
**Members:** Kit, Helm

---
