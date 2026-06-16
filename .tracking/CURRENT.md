# ManyTalentsMore — CURRENT

## Status
Web platform live at manytalentsmore.com. Pointing at self-hosted ERPNext (erp.manytalentsmore.com). FC decommissioned. Backend v2.1.0 deployed (2026-06-10).

## Active Work
- **Web dashboard:** All Frappe API calls pointed at erp.manytalentsmore.com (commit 79eff7d). Vercel env var NEXT_PUBLIC_FRAPPE_SITE set.
- **Receipt comparison view:** Deployed 2026-05-28 — split-pane overlay with zoomable image + parsed items
- **Truck picker:** All 7 trucks in fly-out (deployed 2026-05-20)

## Deployed 2026-06-10 (v2.1.0 backend)
- Customer/tenant split: company = Customer, tenant parsed from description
- Lowe's receipt OCR: HTML junk stripped before parsing
- Job completion digest: 30-min cron email of finished jobs (configure in HCP Integration Settings)
- Magic link doctype migrated — login invites should work

## Deployed 2026-05-28
- Receipt thumbnail + comparison overlay (ReceiptImageViewer.tsx)
- All FC URLs replaced with erp.manytalentsmore.com (6 files)
- New API credentials (545927b1e8a90f1 / 26859396cebaed2) — old FC creds dead

## Next
1. Field invoice + payment system (spec complete, implementation next)
2. Scheduling module
3. MTM Prep web overhaul
