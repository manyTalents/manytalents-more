# ManyTalents More

The unified web hub for the ManyTalents product suite. Single repo, single deploy, single domain.

**Domain:** `manytalentsmore.com`

## Routes

| Path | Description | Type |
|------|-------------|------|
| `/` | Landing page — hero + 3 product cards | React page |
| `/prep` | ManyTalents Prep marketing page | Static HTML (served from `public/prep/`) |
| `/manager` | Office dashboard login | React page (auth required) |
| `/manager/dashboard` | Office Pipeline — 5 workflow cards | React page |
| `/manager/section/*` | Filtered job lists per workflow stage | React page |

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Tailwind CSS** (MT brand: navy + gold)
- **Frappe API** — shares backend with MTM mobile app (`manytalentsmore.v.frappe.cloud`)
- **Deploy:** Cloudflare Pages → `manytalentsmore.com`

## Development

```bash
cd ManyTalentsMore
npm install
npm run dev
# Open http://localhost:3000
```

Log in to `/manager` with your Frappe API key + secret (same credentials used in the MTM mobile app).

## Deploy

1. Push to GitHub
2. Cloudflare Pages → Create Project → Connect Git → select `manytalents-more`
3. Framework preset: **Next.js**
4. Build command: `npm run build`
5. Output directory: `.next`
6. Custom domain: `manytalentsmore.com`

## Environment Variables

- `NEXT_PUBLIC_FRAPPE_SITE` — Frappe site URL (default: `https://manytalentsmore.v.frappe.cloud`)

## Project Structure

```
ManyTalentsMore/
├── src/
│   ├── app/
│   │   ├── page.tsx              → / (landing hub)
│   │   ├── manager/
│   │   │   ├── page.tsx          → /manager (login)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx      → /manager/dashboard (pipeline cards)
│   │   │   └── section/[section]/
│   │   │       └── page.tsx      → /manager/section/* (filtered lists)
│   │   ├── layout.tsx
│   │   └── globals.css
│   └── lib/
│       └── frappe.ts             → API client + auth
├── public/
│   ├── mtm-logo.png              → brand logo
│   └── prep/
│       └── index.html            → /prep (static marketing page)
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.ts
└── postcss.config.mjs
```

## Brand

- **Colors:** Dark navy `#080c18` + warm gold `#c9a84c → #e2c873`
- **Fonts:** Playfair Display (headings) + Inter (body)
- **Logo:** `/mtm-logo.png` — circle crop with gold glow
- **Tagline:** "Multiply what's been entrusted to you" (Matthew 25)

## Coming Next

- Job detail page `/manager/jobs/[name]` with workflow action buttons
- Schedule / calendar view
- Customer pages
- Inventory views (warehouses, stock, limbo)
- Reports
- Bulk operations
- ManyTalents Money landing + app
