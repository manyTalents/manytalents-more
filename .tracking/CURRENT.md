# ManyTalentsMore — CURRENT

## Status
Web platform live at manytalentsmore.com. Pointing at self-hosted ERPNext (erp.manytalentsmore.com). FC decommissioned. Backend v2.1.0 deployed (2026-06-10).

## Deployed 2026-06-28 — office-parity-monday (commit ab0eb87) ● Ready
- **Labor description edit:** inline Edit/Save/Cancel card on job page — office can add/edit job_description on any job (prints on invoice). Guarded by useInvoicedEditGuard.
- **Completion checklist toggle:** each item is now a button; optimistic update + background refresh for checked_by/checked_at; per-item loading state.
- Vercel deployment: https://manytalents-more-a63iim7ia-manytalents-projects.vercel.app (Production)
- Merge commit: cf05aaa | Lint fix commit: ab0eb87

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
