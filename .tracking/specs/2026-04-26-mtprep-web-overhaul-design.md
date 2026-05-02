# MTM Prep Web Overhaul — Consolidated Design Spec

**Date:** 2026-04-26
**Owner:** 10T (orchestrator)
**Team:** Glass (Frontend), Kit/Helm (DevOps), Gauge (QA), Pixel (UI/UX)
**Source:** Glass design proposals (2026-04-26), Owner overhaul request (2026-04-26)
**App:** app.manytalentsmore.com (Expo/React Native web export, Vercel)
**Repo:** `C:\Users\chris\OneDrive\Documentos\test prep app ManyTalentsMore\app`

---

## Problem Statement

The MTM Prep web app is broken. Design changes were pushed without web testing, causing layout regressions on multiple pages. There is no CI/CD — deployment is manual `npx vercel --prod`. No preview URLs, no pre-deploy checks. The app feels like a mobile prototype on web, not a $50/mo premium product.

## Phases

### Phase 0 — Emergency Web Fix (immediate)

**Goal:** Make every page functional on web so Chris can study tonight.

**Owner:** Glass

No new features. Only fix what's broken:

1. **Request a Trade** (`app/request-trade.tsx`)
   - Center all content with `maxWidth: 720, alignSelf: "center", width: "100%"`
   - Fix text cutoff on left (likely missing padding or negative margin)
   - Remove the "this is a" chat bubble element (orphaned component or test artifact)
   - Make state buttons full-width on mobile, row-wrap on web

2. **Runner** (`app/runner.tsx`)
   - Remove the `flexDirection: "row"` that was added for ChartPanel — it broke vertical layout
   - Handle direct-URL navigation: if `questions.length === 0`, redirect to `/exam-config` instead of showing "No questions loaded" dead-end
   - Verify all content is vertically stacked and readable on web

3. **All pages** — add a web container wrapper:
   ```typescript
   const webContainer = Platform.OS === "web" ? {
     maxWidth: 800,
     width: "100%",
     alignSelf: "center" as const,
     paddingHorizontal: 24,
   } : {};
   ```
   Apply to the root `<View style={[styles.container, webContainer]}>` on every page.

4. **Test every page on web** before deploying:
   - `/` (home)
   - `/exam-config`
   - `/runner`
   - `/results`
   - `/review`
   - `/reference-library`
   - `/request-trade`
   - `/auth`

5. Deploy only after all pages verified working.

### Phase 1 — Foundation

**Goal:** Establish the infrastructure and token system that all future design work builds on.

#### 1A. CI/CD Auto-Deploy (Owner: Kit/Helm)

- Connect Vercel project to GitHub repo (`manyTalents/ManyTalentsPrep`) for auto-deploy on push to `master`
- Enable preview deployments for every commit/PR
- Add a `vercel-build` script in `package.json`: `npx expo export --platform web`
- Verify the Vercel project settings match: Framework Preset = Other, Build Command = `npx expo export --platform web`, Output Directory = `dist`
- Add a pre-deploy smoke test script (`scripts/web-check.sh`) that builds locally and checks for build errors before push

#### 1B. Color Token Unification (Owner: Glass)

Replace all hardcoded Tailwind hex values across every screen file with `colors.*` tokens from `src/theme/tokens.ts`:

| Hardcoded | Token |
|-----------|-------|
| `#050816`, `#020617` | `colors.bgDeep` |
| `#080c18` | `colors.bgDeep` (already correct) |
| `#0c1a2e` | `colors.bgSurface` |
| `#111827` | `colors.bgCard` |
| `#1a1f32` | `colors.border` (already correct) |
| `#1f2937` | `colors.border` |
| `#374151` | `colors.borderLight` |
| `#6b7280` | `colors.textMuted` |
| `#9ca3af` | `colors.textSecondary` |
| `#e5e7eb` | `colors.textPrimary` |
| `#f0ebe0` | `colors.textPrimary` (already correct) |

Add semantic color tokens to `tokens.ts`:
```typescript
success: "#22c55e",
warning: "#f97316",
danger: "#f87171",
info: "#3b82f6",
```

Add spacing intermediates:
```typescript
sm2: 10,
md2: 12,
md3: 20,
```

#### 1C. QA Checklist (Owner: Gauge)

Create `docs/qa/web-test-checklist.md` with:
- Every page URL + expected behavior
- Viewport sizes to test: 1440px, 1024px, 768px, 375px
- Key interactions per page (button clicks, navigation, form inputs)
- Visual regression items (text overflow, centering, spacing)
- Must pass before any deploy to production

### Phase 2 — Design Implementation

**Goal:** Implement Glass's design proposals in priority order. Each item is a separate commit, tested on web before merge.

**Owner:** Glass (implementation), Pixel (design review gate)

**Priority order (from Glass's impact/effort analysis):**

| # | Change | Screen | Effort |
|---|--------|--------|--------|
| 1 | A/B/C/D letter-labeled choice component | Runner, Review | Medium |
| 2 | Progress bar in runner header | Runner | Low |
| 3 | Circular score gauge with animation | Results | Medium |
| 4 | Topic bar redesign (height, color coding) | Results | Low |
| 5 | IBM Plex Sans typography via expo-google-fonts | All | Low |
| 6 | Animated rationale reveal | Runner | Low |
| 7 | Mode card grid | Exam Config | Medium |
| 8 | Trade card progress bars | Home | Medium |
| 9 | Reference Library search | Reference Library | Low-Medium |
| 10 | Micro-interactions (scale press, tab slide) | All | Low |
| 11 | Review screen accordion + structured choices | Review | Medium |
| 12 | Runner quick-access to library modal | Runner + Library | Medium |

**New components to extract:**
- `src/components/exam/ChoiceItem.tsx` — shared between runner and review
- `src/components/results/ScoreGauge.tsx` — circular SVG progress ring
- `src/components/config/ModeSelector.tsx` — 2x2 mode card grid
- `src/components/review/ReviewCard.tsx` — accordion question card
- `src/components/ui/SegmentedControl.tsx` — custom toggle replacing native Switch

**Design review gate:** Pixel reviews each PR/commit before it goes to production. No design changes deploy without Pixel sign-off.

**Dependencies:**
- `react-native-svg` — verify already in package.json (needed for ScoreGauge)
- `@expo-google-fonts/ibm-plex-sans` — new dependency for typography
- `expo-linear-gradient` — verify already available (needed for trade card gradients)

## Detailed Screen Specs

Full per-screen design specifications (token values, component layouts, color states, animation timings) are in the Glass design proposals document:
`C:\Users\chris\OneDrive\Documentos\PKA\Owner's Inbox\mtprep-design-proposals.md`

That document is the authoritative design reference for Phase 2 implementation. This spec covers the execution structure; Glass's doc covers the visual design.

## Success Criteria

1. Every page loads and functions correctly on web at 1440px, 1024px, 768px, and 375px
2. No hardcoded hex colors remain in any screen file
3. Git push to master auto-deploys to Vercel with preview URLs
4. QA checklist passes before every production deploy
5. Design feels like a $50/mo premium product, not a free utility
6. Chris can study on the web app without hitting broken layouts

## Constraints

- Expo/React Native with web export — no Next.js, no separate web codebase
- Must work on both mobile (Expo Go / standalone) and web (Vercel) from the same code
- Vercel domain: app.manytalentsmore.com
- No breaking changes to the question data model or exam store logic
