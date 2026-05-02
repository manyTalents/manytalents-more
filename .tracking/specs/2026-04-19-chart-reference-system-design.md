# ManyTalents Prep — Chart & Reference System Design Spec

**Author:** 10T (on behalf of the Owner)
**Date:** 2026-04-19
**Reviewed by:** Ohm (Electrical Code & Standards Specialist)
**Assignees:** Glass (web), Swift (mobile)
**Status:** Approved for implementation

---

## Goal

Build a trade-agnostic chart and reference system that lets users view NEC tables, circuit diagrams, and calculation references — both contextually (linked to exam questions) and independently (via a browsable Reference Library). The system must be offline-first, extensible to all five current trades and any future trades, and must render accurately on both mobile (React Native) and web (Expo Web).

---

## Architecture Overview

```
Question Runner / Review Screen
  └── ChartButton ("View Chart")
        ├── [Mobile] → ChartModal (bottom-sheet) → ChartViewer
        └── [Web]    → ChartPanel (side panel)   → ChartViewer

ChartViewer (universal renderer)
  ├── type: "table"       → TableRenderer
  ├── type: "diagram"     → DiagramRenderer
  └── type: "calculation" → CalcRenderer

Reference Library (standalone screen)
  ├── [Mobile] → accordion sections (trade → category → chart)
  └── [Web]    → searchable card grid with mini previews

Data Layer
  └── app/src/data/charts/{tradeId}/
        ├── index.ts          (chart registry for this trade)
        ├── nec-310-16.ts     (individual chart data file)
        ├── nec-220-55.ts
        └── ...
```

---

## Data Schema

### Chart Definition

```typescript
// app/src/types/chart.ts

import { z } from "zod";

// ── Column definition for table charts ──
export const ColumnDefSchema = z.object({
  key: z.string(),                    // unique column identifier
  header: z.string(),                 // display text (e.g., "60°C")
  subheader: z.string().optional(),   // insulation types (e.g., "TW, UF")
  fullSubheader: z.string().optional(), // full NEC insulation list (expandable)
  align: z.enum(["left", "center", "right"]).default("right"),
  width: z.number().optional(),       // proportional width hint
  group: z.string().optional(),       // column group header (e.g., "Copper", "Aluminum")
});
export type ColumnDef = z.infer<typeof ColumnDefSchema>;

// ── Row data for table charts ──
export const RowDataSchema = z.object({
  cells: z.array(z.union([z.string(), z.number(), z.null()])),
  isSectionHeader: z.boolean().optional(), // for grouped rows (e.g., kcmil section)
});
export type RowData = z.infer<typeof RowDataSchema>;

// ── Table data payload ──
export const TableDataSchema = z.object({
  columnGroups: z.array(z.object({
    label: z.string(),               // e.g., "Copper"
    colSpan: z.number(),             // number of columns in this group
  })).optional(),
  columns: z.array(ColumnDefSchema),
  rows: z.array(RowDataSchema),
  footnotes: z.array(z.string()).optional(),
  notes: z.array(z.object({
    label: z.string(),               // e.g., "NEC 240.4(D)"
    text: z.string(),                // e.g., "14 AWG max 15A, 12 AWG max 20A..."
    severity: z.enum(["info", "warning", "critical"]).default("info"),
  })).optional(),
});
export type TableData = z.infer<typeof TableDataSchema>;

// ── Calculation step ──
export const CalcStepSchema = z.object({
  label: z.string(),                 // e.g., "Step 1: Determine base ampacity"
  formula: z.string(),               // e.g., "I_base = Table 310.16 @ 90°C"
  substitution: z.string().optional(), // e.g., "I_base = 75A"
  result: z.string().optional(),     // e.g., "75 amperes"
  note: z.string().optional(),       // e.g., "THWN-2 is rated for 90°C"
});
export type CalcStep = z.infer<typeof CalcStepSchema>;

// ── Calculation data payload ──
export const CalcDataSchema = z.object({
  steps: z.array(CalcStepSchema),
  finalAnswer: z.string(),
  variables: z.record(z.string(), z.string()).optional(), // variable legend
});
export type CalcData = z.infer<typeof CalcDataSchema>;

// ── Chart definition (the core entity) ──
export const ChartDefinitionSchema = z.object({
  id: z.string(),                    // e.g., "nec-310-16"
  tradeId: z.string(),               // e.g., "la-electrical"
  type: z.enum(["table", "diagram", "calculation"]),
  title: z.string(),                 // e.g., "NEC Table 310.16"
  subtitle: z.string().optional(),   // e.g., "Allowable Ampacities of Insulated Conductors..."
  category: z.string(),              // e.g., "Conductor & Ampacity"
  source: z.string(),                // e.g., "2023 NEC (NFPA 70)"
  questionCount: z.number().default(0), // computed: how many questions reference this chart
  tier: z.enum(["1", "2", "3"]),     // priority tier per Ohm's review
  searchable: z.boolean().default(true),
  relatedCharts: z.array(z.string()).optional(), // IDs of related charts (e.g., 310.15(C)(1))
  data: z.union([TableDataSchema, CalcDataSchema, z.string()]),
    // TableData for type="table", CalcData for type="calculation", SVG string for type="diagram"
});
export type ChartDefinition = z.infer<typeof ChartDefinitionSchema>;

// ── Chart reference from a question ──
export const ChartRefSchema = z.object({
  chartId: z.string(),               // references ChartDefinition.id
  highlightRows: z.array(z.number()).optional(),    // row indices to highlight
  highlightCells: z.array(z.tuple([z.number(), z.number()])).optional(), // [row, col] pairs
  highlightAreas: z.array(z.string()).optional(),   // SVG element IDs for diagrams
  note: z.string().optional(),       // e.g., "See 75°C column for THWN-2"
});
export type ChartRef = z.infer<typeof ChartRefSchema>;
```

### Question Schema Update

Add `chart_refs` to the existing `QuestionSchema`:

```typescript
// Updated app/src/types/question.ts — add this field to QuestionSchema
export const QuestionSchema = z.object({
  // ... all existing fields unchanged ...
  id: z.string().min(1),
  trade_id: z.string().min(1),
  stem: z.string().min(5),
  choices: z.array(z.string()).length(4),
  answer_index: z.number().int().min(0).max(3),
  topics: z.array(z.string()).nonempty(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  rationale: z.string().min(5),
  code_ref: z.object({
    title: z.string().min(2),
    section: z.string().min(1),
  }),
  media_urls: z.array(z.string()).optional(),
  code_version: z.string().min(1),
  tags: z.array(z.string()).optional(),
  status: z.enum(["active", "retired"]).default("active"),
  type: z.enum(["standard", "scenario"]).default("standard").optional(),
  scenario_context: z.string().optional(),

  // NEW — chart references
  chart_refs: z.array(ChartRefSchema).optional(),
});
```

**Backward compatibility:** `chart_refs` is optional. All 5,307 existing questions remain valid with no changes. Charts are added incrementally by annotating questions that benefit from them.

---

## File Structure

```
app/src/
├── types/
│   ├── question.ts              # MODIFY — add chart_refs field
│   └── chart.ts                 # NEW — all chart type definitions
│
├── data/
│   └── charts/
│       ├── registry.ts          # NEW — master chart registry (imports per-trade registries)
│       ├── la-electrical/
│       │   ├── index.ts         # trade chart registry — exports array of ChartDefinition
│       │   ├── nec-310-16.ts    # Table 310.16 (ampacity, copper + aluminum)
│       │   ├── nec-220-55.ts    # Table 220.55 (range demand factors)
│       │   ├── nec-430-52.ts    # Table 430.52 (motor OCPD)
│       │   ├── nec-220-12.ts    # Table 220.12 (general lighting loads)
│       │   ├── nec-250-66.ts    # Table 250.66 (GEC sizing)
│       │   ├── nec-220-42.ts    # Table 220.42 (lighting demand factors)
│       │   ├── nec-250-122.ts   # Table 250.122 (EGC sizing)
│       │   ├── nec-ch9-t1.ts    # Chapter 9, Table 1 (conduit fill %)
│       │   ├── nec-430-250.ts   # Table 430.250 (3-phase motor FLC)
│       │   ├── nec-110-26.ts    # Table 110.26(A)(1) (working space)
│       │   ├── nec-300-5.ts     # Table 300.5 (minimum cover)
│       │   ├── nec-450-3b.ts    # Table 450.3(B) (transformer OCPD)
│       │   ├── nec-310-15c1.ts  # Table 310.15(C)(1) (ambient temp correction)
│       │   ├── nec-314-16b.ts   # Table 314.16(B) (box fill volume)
│       │   ├── nec-220-54.ts    # Table 220.54 (dryer demand factors)
│       │   ├── nec-220-56.ts    # Table 220.56 (kitchen equipment demand)
│       │   ├── nec-430-248.ts   # Table 430.248 (single-phase motor FLC)
│       │   ├── nec-ch9-t4.ts    # Chapter 9, Table 4 (conduit dimensions)
│       │   ├── nec-ch9-t5.ts    # Chapter 9, Table 5 (conductor dimensions)
│       │   ├── nec-210-21b3.ts  # Table 210.21(B)(3) (receptacle ratings)
│       │   ├── nec-ch9-t8.ts    # Chapter 9, Table 8 (conductor properties)
│       │   ├── nec-430-7b.ts    # Table 430.7(B) (locked-rotor code letters)
│       │   └── diagrams/
│       │       ├── grounding-electrode-system.tsx   # SVG component
│       │       ├── service-entrance-layout.tsx
│       │       ├── motor-branch-circuit.tsx
│       │       ├── ocpd-sizing-flowchart.tsx
│       │       ├── gfci-afci-zones.tsx
│       │       ├── conduit-fill-flowchart.tsx
│       │       └── demand-factor-worksheet.tsx
│       ├── la-plumber/
│       │   ├── index.ts         # (future — IPC tables)
│       │   └── ...
│       ├── cdr-dietitian/
│       │   ├── index.ts         # (future — nutrition reference tables)
│       │   └── ...
│       ├── lihtc-tax-credit/
│       │   ├── index.ts         # (future — IRC Sec. 42 tables)
│       │   └── ...
│       └── la-onsite-wastewater/
│           ├── index.ts         # (future — LAC Title 51 tables)
│           └── ...
│
├── components/
│   ├── charts/
│   │   ├── ChartViewer.tsx      # NEW — universal chart renderer (delegates to sub-renderers)
│   │   ├── ChartModal.tsx       # NEW — mobile bottom-sheet wrapper
│   │   ├── ChartPanel.tsx       # NEW — web side-panel wrapper
│   │   ├── ChartButton.tsx      # NEW — "View Chart" button for runner/review
│   │   ├── ChartTabs.tsx        # NEW — tab bar for multi-chart questions (web panel)
│   │   ├── TableRenderer.tsx    # NEW — styled data table with search, zoom, highlight
│   │   ├── DiagramRenderer.tsx  # NEW — SVG viewer with zoom and highlight
│   │   ├── CalcRenderer.tsx     # NEW — step-by-step math display
│   │   └── ChartNotes.tsx       # NEW — notes/gotchas panel below chart
│   └── library/
│       ├── ReferenceLibrary.tsx  # NEW — browsable chart library (main component)
│       ├── LibraryCategoryAccordion.tsx  # NEW — mobile accordion sections
│       ├── LibraryCardGrid.tsx   # NEW — web card grid with mini previews
│       └── LibrarySearch.tsx     # NEW — search bar for reference library
│
├── state/
│   └── useChartStore.ts         # NEW — chart state (active chart, zoom, search)
│
└── screens/
    └── ReferenceLibraryScreen.tsx  # NEW — full screen wrapper

app/app/
└── reference-library.tsx        # NEW — Expo Router route
```

---

## Components Spec

### 1. ChartButton

**Location:** `app/src/components/charts/ChartButton.tsx`
**Purpose:** Gold button that appears on questions with `chart_refs`.

```
Placement: Between the question stem and the choices
Visibility: Only rendered when question.chart_refs exists and has length > 0
```

| Prop | Type | Description |
|------|------|-------------|
| `chartRefs` | `ChartRef[]` | The question's chart references |
| `onPress` | `() => void` | Opens ChartModal (mobile) or ChartPanel (web) |

**Visual spec:**
- Gold background (`#c9a84c` at 12% opacity), gold border, gold text
- Icon: book/table icon (Ionicons `reader-outline`)
- Text: "View Chart" (single ref) or "View Charts (2)" (multiple)
- Height: 44px, full width, rounded corners (`radius-md`)
- Matches existing app design tokens from `app/src/theme/tokens.ts`

### 2. ChartModal (Mobile)

**Location:** `app/src/components/charts/ChartModal.tsx`
**Purpose:** Bottom-sheet modal for mobile chart viewing.

| Prop | Type | Description |
|------|------|-------------|
| `visible` | `boolean` | Show/hide |
| `chartRefs` | `ChartRef[]` | Charts to display |
| `onClose` | `() => void` | Close handler |

**Behavior:**
- Slides up from bottom, covering approximately 75% of screen height
- Drag handle at top for dismiss gesture
- Question text remains partially visible behind the modal (semi-transparent backdrop)
- If multiple `chartRefs`, render `ChartTabs` at top of modal
- Supports pinch-to-zoom on table and diagram content
- Close on backdrop tap or drag down

**Implementation:** Use `react-native-reanimated` + a custom bottom sheet (or `@gorhom/bottom-sheet` if already installed). Keep dependencies minimal.

### 3. ChartPanel (Web)

**Location:** `app/src/components/charts/ChartPanel.tsx`
**Purpose:** Side panel for web chart viewing.

| Prop | Type | Description |
|------|------|-------------|
| `chartRefs` | `ChartRef[]` | Charts to display |
| `visible` | `boolean` | Show/hide panel |

**Behavior:**
- Splits the runner/review screen: question 58% left, chart panel 42% right
- Panel slides in from right with a smooth transition
- Close button (X) in top-right corner
- `ChartTabs` at top if multiple chart refs
- Scroll-independent from question content
- Resizable divider (optional, low priority)

**Layout integration:** The `Runner.tsx` and `Review.tsx` screens must detect `Platform.OS === 'web'` and conditionally render the side-panel layout vs. the standard full-width layout.

### 4. ChartTabs

**Location:** `app/src/components/charts/ChartTabs.tsx`
**Purpose:** Tab bar for switching between multiple charts on one question.

| Prop | Type | Description |
|------|------|-------------|
| `chartRefs` | `ChartRef[]` | Available charts |
| `activeIndex` | `number` | Currently selected tab |
| `onChange` | `(index: number) => void` | Tab switch handler |

**Visual spec:**
- Horizontal scrollable tabs (matches existing `view-tab` style from mockup)
- Active tab: gold underline + gold text
- Inactive tab: muted text
- Tab label: chart title (e.g., "Table 310.16")
- Supports 2-4 tabs per question (Ohm recommends 2-3 minimum)

### 5. ChartViewer

**Location:** `app/src/components/charts/ChartViewer.tsx`
**Purpose:** Universal renderer that delegates to the correct sub-renderer.

| Prop | Type | Description |
|------|------|-------------|
| `chart` | `ChartDefinition` | The chart to render |
| `chartRef` | `ChartRef` (optional) | Highlight instructions from the question |

**Logic:**
```
switch (chart.type) {
  case "table":       → <TableRenderer data={chart.data} highlights={chartRef} />
  case "diagram":     → <DiagramRenderer svg={chart.data} highlights={chartRef} />
  case "calculation": → <CalcRenderer steps={chart.data} />
}
```

Always renders `<ChartNotes />` below the chart content if `chart.data.notes` exists.

### 6. TableRenderer

**Location:** `app/src/components/charts/TableRenderer.tsx`
**Purpose:** Styled, interactive data table.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `TableData` | Columns, rows, footnotes, notes |
| `highlights` | `ChartRef` (optional) | Rows/cells to highlight |
| `searchable` | `boolean` | Enable in-table search |

**Features:**
- **Column group headers** — spans multiple columns (e.g., "Copper" spanning 3 temp columns, "Aluminum" spanning 3)
- **Row highlighting** — gold background glow on highlighted rows (from `chartRef.highlightRows`)
- **Cell highlighting** — brighter gold emphasis on specific cells (from `chartRef.highlightCells`)
- **Search** — text input that filters rows by any cell value. Typing "6 AWG" jumps to that row. Web only for initial release; mobile can scroll.
- **Pinch-to-zoom** — mobile: wrap in `ReactNativeZoomableView` or `ScrollView` with `maximumZoomScale`
- **Sticky first column** — the conductor size column stays pinned on horizontal scroll (critical for wide tables like full 310.16 with aluminum)
- **Sticky header row** — column headers stay pinned on vertical scroll
- **Footnotes** — rendered below table in smaller text with a top border separator
- **Notes/Gotchas** — rendered via `ChartNotes` component with severity-based styling (info=blue, warning=amber, critical=red)

**Typography:**
- Monospace numbers for data cells (`font-variant-numeric: tabular-nums` or a mono font)
- Sans-serif for headers and labels
- Cell padding: 8px vertical, 12px horizontal

**Colors (dark theme):**
- Table background: `#111627` (bg-card)
- Header row: `#161c30` (bg-card-hover)
- Alternating rows: `#111627` / `#0d1120` (subtle stripe)
- Highlighted row: `rgba(201, 168, 76, 0.12)` background
- Highlighted cell: `rgba(201, 168, 76, 0.25)` background + `#c9a84c` border
- Text: `#f0ebe0` (primary) for data, `#a09a8e` (secondary) for headers

### 7. DiagramRenderer

**Location:** `app/src/components/charts/DiagramRenderer.tsx`
**Purpose:** SVG diagram viewer with zoom and highlight.

| Prop | Type | Description |
|------|------|-------------|
| `svg` | `string` or React component | SVG content |
| `highlights` | `ChartRef` (optional) | SVG element IDs to highlight |

**Features:**
- Renders SVG using `react-native-svg` (mobile) or native `<svg>` (web)
- Pinch-to-zoom on mobile, scroll-wheel zoom on web
- Pan/drag navigation
- Highlighted areas get a gold glow effect (CSS filter or animated stroke)
- "Reset zoom" button in corner

**Diagram format:** Each diagram is a `.tsx` file exporting a React component that returns SVG markup. This allows dynamic highlighting via props (pass `highlightAreas` to toggle gold stroke/fill on specific `<g>` or `<path>` elements).

### 8. CalcRenderer

**Location:** `app/src/components/charts/CalcRenderer.tsx`
**Purpose:** Step-by-step math/formula display.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `CalcData` | Steps, final answer, variables |

**Features:**
- Numbered steps with clear visual separation
- Formula display: centered, slightly larger text, monospace
- Variable substitution: show formula, then substituted values below with an arrow
- Final answer: highlighted box with gold border
- Variable legend: collapsible section showing all variables and their definitions

### 9. ChartNotes

**Location:** `app/src/components/charts/ChartNotes.tsx`
**Purpose:** Notes, gotchas, and NEC footnotes below any chart.

| Prop | Type | Description |
|------|------|-------------|
| `notes` | `Array<{ label, text, severity }>` | Notes to display |
| `footnotes` | `string[]` (optional) | Table footnotes |

**Visual spec:**
- Each note is a card with a left border color based on severity:
  - `info`: blue (`#38bdf8`)
  - `warning`: amber (`#f59e0b`)
  - `critical`: red (`#f87171`)
- Label in bold (e.g., "NEC 240.4(D)")
- Text in regular weight
- Footnotes rendered as numbered list in smaller, muted text
- Notes are always visible (not collapsed), per Ohm's directive that "the notes ARE the table"

### 10. ReferenceLibrary

**Location:** `app/src/components/library/ReferenceLibrary.tsx` + screen wrapper
**Purpose:** Standalone browsable chart library.

**Mobile layout:**
- Trade selector at top (if user has multiple trades)
- Accordion sections by category (e.g., "Conductor & Ampacity", "Load Calculation")
- Each section expands to show chart cards
- Each card shows: title, subtitle, question count badge, tier indicator
- Tap card to open ChartModal with full chart (no highlights)

**Web layout:**
- Trade selector + search bar at top
- Card grid (3 columns) with mini chart previews
- Each card shows: title, subtitle, question count badge, category tag, tier color
- Cards sorted by tier (1 first) then by question count (highest first)
- Click card to navigate to full chart view or open in side panel

**Question count badges:**
- Shows number of questions that reference this chart (e.g., "26 questions")
- Computed at build time from the chart registry + question bank
- Color-coded by frequency: red (20+), amber (10-19), gray (<10)

**Bookmark/Pin feature (Tier 2 enhancement):**
- Star icon on each card to pin to a quick-access bar
- Pinned charts appear at top of library in a horizontal scroll section
- Persisted in AsyncStorage

---

## State Management

### useChartStore

**Location:** `app/src/state/useChartStore.ts`

```typescript
import { create } from "zustand";
import { ChartDefinition, ChartRef } from "../types/chart";

interface ChartState {
  // Active chart viewing
  activeChartRefs: ChartRef[] | null;   // from current question
  activeChartIndex: number;              // which tab is selected
  isChartVisible: boolean;               // modal/panel open state

  // Reference library
  librarySearchQuery: string;
  libraryCategory: string | null;        // active category filter

  // Viewing state
  zoomLevel: number;
  tableSearchQuery: string;              // in-table search

  // Pinned charts
  pinnedChartIds: string[];

  // Actions
  openChart: (refs: ChartRef[]) => void;
  closeChart: () => void;
  setActiveChartIndex: (index: number) => void;
  setLibrarySearch: (query: string) => void;
  setLibraryCategory: (category: string | null) => void;
  setZoomLevel: (level: number) => void;
  setTableSearch: (query: string) => void;
  togglePinnedChart: (chartId: string) => void;
  resetChartView: () => void;
}
```

**Persistence:** Only `pinnedChartIds` should be persisted via AsyncStorage. All other state is ephemeral.

---

## Chart Data Registry

### Master Registry

**Location:** `app/src/data/charts/registry.ts`

```typescript
import { ChartDefinition } from "../../types/chart";
import { electricalCharts } from "./la-electrical";
// import { plumberCharts } from "./la-plumber";   // future
// import { dietitianCharts } from "./cdr-dietitian"; // future

const ALL_CHARTS: ChartDefinition[] = [
  ...electricalCharts,
  // ...plumberCharts,
  // ...dietitianCharts,
];

// Lookup by ID (O(1) after initialization)
const chartMap = new Map<string, ChartDefinition>();
ALL_CHARTS.forEach(c => chartMap.set(c.id, c));

export function getChart(chartId: string): ChartDefinition | undefined {
  return chartMap.get(chartId);
}

export function getChartsForTrade(tradeId: string): ChartDefinition[] {
  return ALL_CHARTS.filter(c => c.tradeId === tradeId);
}

export function getChartsByCategory(tradeId: string): Record<string, ChartDefinition[]> {
  const charts = getChartsForTrade(tradeId);
  const grouped: Record<string, ChartDefinition[]> = {};
  charts.forEach(c => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });
  return grouped;
}
```

### Per-Trade Registry

**Location:** `app/src/data/charts/la-electrical/index.ts`

```typescript
import { ChartDefinition } from "../../../types/chart";
import { nec310_16 } from "./nec-310-16";
import { nec220_55 } from "./nec-220-55";
// ... more imports

export const electricalCharts: ChartDefinition[] = [
  nec310_16,
  nec220_55,
  // ...
];
```

This mirrors the existing `TRADE_REGISTRY` pattern — add charts by adding a file and an import. No UI code changes required.

---

## Chart Priority Tiers (from Ohm's Review)

### Tier 1 — Must Have at Launch

All Tier 1 charts must be complete and verified before the chart system ships. These tables cover 80%+ of table-based exam questions.

| # | Chart ID | Title | Type | Category | Question Count |
|---|----------|-------|------|----------|----------------|
| 1 | `nec-220-55` | Table 220.55 — Demand Factors for Ranges/Ovens/Cooking | table | Demand Factor | 45 |
| 2 | `nec-430-52` | Table 430.52 — Motor Branch-Circuit OCPD | table | Motor | 32 |
| 3 | `nec-310-16` | Table 310.16 — Allowable Ampacities | table | Conductor & Ampacity | 26 |
| 4 | `nec-220-12` | Table 220.12 — General Lighting Loads by Occupancy | table | Load Calculation | 22 |
| 5 | `nec-250-66` | Table 250.66 — Grounding Electrode Conductor Sizing | table | Grounding & Bonding | 20 |
| 6 | `nec-220-42` | Table 220.42 — Lighting Load Demand Factors | table | Demand Factor | 20 |
| 7 | `nec-250-122` | Table 250.122 — Equipment Grounding Conductor Sizing | table | Grounding & Bonding | 14 |
| 8 | `nec-ch9-t1` | Chapter 9, Table 1 — Conduit Fill Percentages | table | Conduit & Box Fill | 14 |
| 9 | `nec-430-250` | Table 430.250 — FLC, Three-Phase AC Motors | table | Motor | 14 |
| 10 | `nec-ch9-t4` | Chapter 9, Table 4 — Conduit Dimensions & Fill Area | table | Conduit & Box Fill | * |
| 11 | `nec-ch9-t5` | Chapter 9, Table 5 — Conductor Dimensions | table | Conduit & Box Fill | * |

\* Ch9 Tables 4 and 5 are essential companions to Ch9 Table 1. Conduit fill questions (14 questions) require all three tables together. These are Tier 1 by dependency even if not directly referenced alone.

### Tier 1 Diagrams

| # | Chart ID | Title | Type | Category |
|---|----------|-------|------|----------|
| D1 | `diagram-grounding-electrode` | Grounding Electrode System | diagram | Grounding & Bonding |
| D2 | `diagram-service-entrance` | Service Entrance Single-Line | diagram | Services |
| D3 | `diagram-motor-branch` | Motor Branch Circuit | diagram | Motor |
| D4 | `diagram-ocpd-flowchart` | Branch Circuit OCPD Sizing Flowchart | diagram (flowchart) | Calculations |

### Tier 2 — Add Soon

| # | Chart ID | Title | Type | Category | Question Count |
|---|----------|-------|------|----------|----------------|
| 12 | `nec-110-26` | Table 110.26(A)(1) — Working Space | table | General | 10 |
| 13 | `nec-300-5` | Table 300.5 — Minimum Cover Requirements | table | Wiring Methods | 10 |
| 14 | `nec-450-3b` | Table 450.3(B) — Transformer OCPD | table | Equipment | 10 |
| 15 | `nec-310-15c1` | Table 310.15(C)(1) — Ambient Temp Correction | table | Conductor & Ampacity | 9 |
| 16 | `nec-314-16b` | Table 314.16(B) — Box Fill Volume | table | Conduit & Box Fill | 7 |
| 17 | `nec-220-54` | Table 220.54 — Dryer Demand Factors | table | Demand Factor | 7 |
| 18 | `nec-220-56` | Table 220.56 — Kitchen Equipment Demand Factors | table | Demand Factor | 7 |
| 19 | `nec-430-248` | Table 430.248 — FLC, Single-Phase Motors | table | Motor | * |

\* Ohm notes: single-phase motor questions are "extremely common" on the LA exam. This table should be high Tier 2 or could be promoted to Tier 1.

### Tier 2 Diagrams

| # | Chart ID | Title | Type | Category |
|---|----------|-------|------|----------|
| D5 | `diagram-gfci-afci-zones` | GFCI/AFCI Protection Zones | diagram | Wiring & Protection |
| D6 | `diagram-conduit-fill-flow` | Conduit Fill Calculation Flowchart | diagram (flowchart) | Conduit & Box Fill |
| D7 | `diagram-demand-factor-worksheet` | Demand Factor Calculation Worksheet | diagram (flowchart) | Load Calculation |

### Tier 3 — Nice to Have

| # | Chart ID | Title | Type | Category |
|---|----------|-------|------|----------|
| 20 | `nec-430-247` | Table 430.247 — FLC, DC Motors | table | Motor |
| 21 | `nec-ch9-t8` | Chapter 9, Table 8 — Conductor Properties | table | Conductor & Ampacity |
| 22 | `nec-210-21b3` | Table 210.21(B)(3) — Receptacle Ratings | table | Wiring & Protection |
| 23 | `nec-210-24` | Table 210.24 — Branch-Circuit Requirements | table | Services |
| 24 | `nec-430-7b` | Table 430.7(B) — Locked-Rotor Code Letters | table | Motor |
| 25 | `nec-250-102c1` | Table 250.102(C)(1) — Bonding Jumper Sizing | table | Grounding & Bonding |
| 26 | `nec-430-72b` | Table 430.72(B) — Motor Controller Protection | table | Motor |

### Tier 3 Diagrams

| # | Chart ID | Title | Type | Category |
|---|----------|-------|------|----------|
| D8 | `diagram-3way-4way-switch` | 3-Way/4-Way Switch Wiring | diagram | Wiring Methods |
| D9 | `diagram-delta-wye` | Delta-Wye Transformer Connections | diagram | Equipment |
| D10 | `diagram-parallel-conductors` | Parallel Conductor Installation | diagram | Wiring Methods |

---

## Table 310.16 Corrections (Ohm's Critical Findings)

The existing mockup data is accurate for copper conductors 14 AWG through 4/0 AWG. The following must be addressed in the final `nec-310-16.ts` data file:

### 1. Add Aluminum/Copper-Clad Aluminum Columns

The full NEC Table 310.16 has six data columns. The chart must include all six:

| | Copper | | | Aluminum | | |
|---|---|---|---|---|---|---|
| Size | 60°C | 75°C | 90°C | 60°C | 75°C | 90°C |

Use `columnGroups` to render the "Copper" and "Aluminum or Copper-Clad Aluminum" group headers spanning three sub-columns each.

### 2. Extend to 500 kcmil Minimum

Add rows for: 250, 300, 350, 400, 500 kcmil. Ohm recommends at least 500 kcmil; 750 kcmil is ideal. These sizes are tested for commercial feeder and service entrance calculations.

### 3. Add NEC 240.4(D) Notes (Critical)

Add to the chart's `notes` array with `severity: "critical"`:

```
{
  label: "NEC 240.4(D) — Small Conductor Protection",
  text: "Regardless of ampacity column, overcurrent protection is limited to: 14 AWG = 15A max, 12 AWG = 20A max, 10 AWG = 30A max. This is one of the most frequently tested exam traps.",
  severity: "critical"
}
```

### 4. Add NEC 110.14(C) Note

```
{
  label: "NEC 110.14(C) — Termination Temperature Limits",
  text: "Most equipment is rated 75°C. Use the 75°C column for circuit sizing even with 90°C rated conductors — unless derating for ambient temperature or conductor fill (in which case, start with 90°C and derate, but the final value cannot exceed 75°C column).",
  severity: "warning"
}
```

### 5. Full Insulation Type Listings

Use `subheader` for abbreviated insulation types (visible by default) and `fullSubheader` for the complete NEC list (accessible via tap/expand):

- 60°C subheader: `"TW, UF"` / fullSubheader: `"TW, UF"`
- 75°C subheader: `"THW, THWN, XHHW"` / fullSubheader: `"RHW, THHW, THW, THWN, XHHW, USE, ZW"`
- 90°C subheader: `"THWN-2, XHHW-2"` / fullSubheader: `"TBS, SA, SIS, FEP, FEPB, MI, RHH, RHW-2, THHN, THHW, THW-2, THWN-2, USE-2, XHH, XHHW, XHHW-2, ZW-2"`

### 6. Related Charts

```typescript
relatedCharts: ["nec-310-15c1", "nec-ch9-t1"]
```

This enables "Related Tables" links per Ohm's recommendation.

---

## UX Integration Points

### Runner Screen (`app/src/screens/Runner.tsx`)

**Changes required:**

1. Import `ChartButton`, `ChartModal` (mobile), `ChartPanel` (web)
2. Check `currentQuestion.chart_refs` on each question
3. If `chart_refs` exists:
   - Render `<ChartButton>` between the stem and the choices
   - On press: call `useChartStore.openChart(question.chart_refs)`
4. Platform-specific rendering:
   - Mobile: render `<ChartModal>` as an overlay
   - Web: wrap the runner content in a flex layout with `<ChartPanel>` on the right

**Web layout change (runner):**
```
Without chart:
┌──────────────────────────────────┐
│          Question + Choices      │
│              (100%)              │
└──────────────────────────────────┘

With chart open:
┌──────────────────┬───────────────┐
│   Question +     │  Chart Panel  │
│   Choices (58%)  │    (42%)      │
└──────────────────┴───────────────┘
```

### Review Screen (`app/src/screens/Review.tsx`)

Same integration as Runner. The `ChartButton` and modal/panel work identically during review.

### Home Screen (`app/src/screens/Home.tsx`)

Add a "Reference Library" card/button below the existing exam modes section. Uses the trade's icon and color.

```
┌─────────────────────────────────┐
│  📖  Reference Library          │
│  Tables, diagrams & formulas    │
│  for [Trade Name]               │
└─────────────────────────────────┘
```

Tapping navigates to `app/reference-library.tsx`.

---

## Reference Library Categories

For the LA Electrical trade, charts are organized into these categories (matching NEC structure and electrician mental models, per Ohm):

| Category | Charts |
|----------|--------|
| Conductor & Ampacity | 310.16, 310.15(C)(1), Ch9 T8 |
| Load Calculation | 220.12 |
| Demand Factor | 220.42, 220.54, 220.55, 220.56 |
| Motor | 430.52, 430.248, 430.250, 430.247, 430.7(B), 430.72(B) |
| Grounding & Bonding | 250.66, 250.122, 250.102(C)(1) |
| Conduit & Box Fill | Ch9 T1, Ch9 T4, Ch9 T5, 314.16(B) |
| Services & Feeders | 110.26(A)(1), 300.5 |
| Wiring & Protection | 210.21(B)(3), 210.24 |
| Equipment | 450.3(B) |
| Circuit Diagrams | All diagram-type charts |

Categories for other trades will be defined when those trades' charts are built.

---

## Adding Charts for Other Trades

The chart system is trade-agnostic by design. To add charts for a new trade:

### Step 1: Create the trade's chart directory

```
app/src/data/charts/{tradeId}/
├── index.ts
└── {chart-files}.ts
```

### Step 2: Define charts using the same `ChartDefinition` schema

For the plumber trade (IPC):
- Table 604.4 — Fixture unit values
- Table 710.1 — DFU values for drainage
- Pipe sizing tables
- Venting distance tables

For the dietitian trade (CDR):
- Nutrition reference tables (lab values, DRI tables)
- Calculation worksheets (tube feeding, BMI, Harris-Benedict)
- Medical nutrition therapy decision trees

For the LIHTC trade:
- Income limit tables
- Rent limit calculation worksheets
- Compliance timeline diagrams

### Step 3: Register in master registry

Add one import line to `app/src/data/charts/registry.ts`:

```typescript
import { plumberCharts } from "./la-plumber";
// Then add ...plumberCharts to ALL_CHARTS
```

### Step 4: Annotate questions with `chart_refs`

Add `chart_refs` to relevant questions in the trade's question JSON files.

No UI code changes, no new components, no new routes. The same ChartViewer, ChartModal, ChartPanel, and ReferenceLibrary components render any trade's charts.

---

## Migration Plan

### Phase 1: Schema + Components (no data yet)

1. Create `app/src/types/chart.ts` with all type definitions
2. Add `chart_refs` to `QuestionSchema` in `app/src/types/question.ts` (optional field, backward compatible)
3. Build all 10 components (ChartButton through ReferenceLibrary)
4. Create `useChartStore`
5. Add `app/app/reference-library.tsx` route
6. Wire ChartButton into Runner and Review screens
7. Add Reference Library card to Home screen

**Questions with no `chart_refs` behave exactly as before.** No ChartButton appears. No layout changes. Zero regressions.

### Phase 2: Tier 1 Table Data (Electrical)

1. Create `app/src/data/charts/la-electrical/` directory
2. Build all 11 Tier 1 table data files (verified against NEC 2023 by Ohm)
3. Build 4 Tier 1 diagram components
4. Create `la-electrical/index.ts` trade chart registry
5. Register in master `registry.ts`

### Phase 3: Question Annotation

1. Write a script (`scripts/annotate-chart-refs.ts`) that:
   - Scans all electrical questions
   - Matches questions by `code_ref.section` to chart IDs
   - Proposes `chart_refs` with appropriate highlight data
   - Outputs annotated question JSON for review
2. Manual review of annotations (Ohm verifies highlight accuracy)
3. Replace question JSON files with annotated versions

**Annotation matching rules:**
- `code_ref.section` contains "310.16" → `chartId: "nec-310-16"`
- `code_ref.section` contains "220.55" → `chartId: "nec-220-55"`
- Question stem mentions specific conductor sizes → `highlightRows` for those sizes
- Question stem mentions specific temperature column → `highlightCells` for that column intersection

### Phase 4: Tier 2 + 3 Tables

1. Add remaining table data files
2. Annotate more questions
3. Add bookmark/pin feature
4. Add diagram components for Tier 2/3

### Phase 5: Other Trades

1. Plumber trade charts (IPC tables)
2. Dietitian trade charts (nutrition reference)
3. LIHTC trade charts (compliance tables)
4. OSWW trade charts (LAC Title 51 tables)

---

## Ohm's UX Recommendations — Implementation Priority

| # | Recommendation | Priority | Phase |
|---|----------------|----------|-------|
| 1 | Fix THWN-2 sample question stem | CRITICAL | Before launch |
| 2 | Aluminum columns in Table 310.16 | CRITICAL | Phase 2 |
| 3 | Extend table to 500 kcmil | CRITICAL | Phase 2 |
| 4 | NEC 240.4(D) footnote on 14/12/10 AWG | CRITICAL | Phase 2 |
| 5 | Correct Table 310.15(C) description | MEDIUM | Phase 2 |
| 6 | Notes/Gotchas panel below each table | MEDIUM | Phase 1 (component) |
| 7 | In-table search (web) | MEDIUM | Phase 1 |
| 8 | Related Tables links | MEDIUM | Phase 1 |
| 9 | Landscape mode hint (mobile) | LOW | Phase 4 |
| 10 | Bookmark/Pin feature | LOW | Phase 4 |
| 11 | Frequency color coding on badges | LOW | Phase 1 |
| 12 | Full-screen table mode (mobile) | LOW | Phase 4 |

---

## New App Route

### `app/app/reference-library.tsx`

```typescript
// Expo Router file-based route
import { ReferenceLibraryScreen } from "../src/screens/ReferenceLibraryScreen";
export default ReferenceLibraryScreen;
```

This brings the total app routes from 14 to 15.

---

## Dependencies

### Required (likely already installed)

| Package | Purpose | Status |
|---------|---------|--------|
| `react-native-reanimated` | Bottom sheet animations | Installed (Sprint 11) |
| `react-native-gesture-handler` | Swipe/pinch gestures | Installed |
| `zod` | Schema validation | Installed |
| `zustand` | State management | Installed |

### Potentially Needed

| Package | Purpose | Notes |
|---------|---------|-------|
| `@gorhom/bottom-sheet` | Production-quality bottom sheet | Evaluate vs. custom implementation |
| `react-native-svg` | SVG diagram rendering (mobile) | Check if already installed for icons |
| `react-native-zoom-toolkit` or `react-native-zoomable` | Pinch-to-zoom for tables/diagrams | Evaluate options |

### No New Dependencies Preferred

Where possible, build with existing packages. The bottom sheet can be implemented with `react-native-reanimated` + `PanGestureHandler` directly. SVG on web is native. Pinch-to-zoom can use `ScrollView` with `maximumZoomScale` on mobile.

---

## Testing Strategy

### Unit Tests

| Test File | What It Tests |
|-----------|---------------|
| `chart.test.ts` | Zod schema validation for all chart types |
| `registry.test.ts` | Chart lookup by ID, by trade, by category |
| `ChartButton.test.tsx` | Renders only when chart_refs present; hidden otherwise |
| `TableRenderer.test.tsx` | Row/cell highlighting, column group headers, search filtering |
| `ChartViewer.test.tsx` | Delegates to correct renderer based on chart type |

### Data Validation Tests

| Test | What It Validates |
|------|-------------------|
| `nec-310-16.test.ts` | All ampacity values match NEC 2023 (Ohm's verified dataset) |
| `nec-220-55.test.ts` | All demand factor values match NEC 2023 |
| `chart-refs.test.ts` | Every `chartId` in question `chart_refs` resolves to a real chart |
| `schema-compat.test.ts` | All existing questions pass validation with new optional `chart_refs` field |

### Integration Tests

| Test | What It Validates |
|------|-------------------|
| Question with chart_refs → ChartButton appears | End-to-end rendering |
| Question without chart_refs → no ChartButton | Backward compatibility |
| ChartButton press → modal/panel opens with correct chart | UX flow |
| Multi-chart question → tabs render and switch | Tab behavior |
| Reference Library → loads all charts for active trade | Library rendering |

### Manual QA Checklist

- [ ] Table 310.16 renders correctly on mobile (portrait + landscape)
- [ ] Table 310.16 renders correctly on web (side panel)
- [ ] Pinch-to-zoom works on mobile tables
- [ ] Row highlighting matches question context
- [ ] Notes/Gotchas display below every table
- [ ] Reference Library shows all categories for electrical trade
- [ ] Question count badges are accurate
- [ ] Existing questions without chart_refs show no ChartButton
- [ ] All 5,307 existing questions pass Zod validation unchanged
- [ ] OTA update deploys successfully with chart data bundled

---

## Estimated Scope

### New Files

| Category | Count | Details |
|----------|-------|---------|
| Type definitions | 1 | `chart.ts` |
| Components | 13 | 9 chart components + 4 library components |
| State store | 1 | `useChartStore.ts` |
| Route | 1 | `reference-library.tsx` |
| Screen | 1 | `ReferenceLibraryScreen.tsx` |
| Chart data (Tier 1 tables) | 11 | NEC table data files |
| Chart data (Tier 1 diagrams) | 4 | SVG diagram components |
| Chart data (Tier 2 tables) | 8 | NEC table data files |
| Chart data (Tier 3 tables) | 7 | NEC table data files |
| Chart registry files | 2 | Master registry + electrical trade registry |
| Scripts | 1 | `annotate-chart-refs.ts` |
| Tests | 8+ | Unit + data validation + integration |
| **Total new files** | **~58** | |

### Modified Files

| File | Change |
|------|--------|
| `app/src/types/question.ts` | Add optional `chart_refs` field |
| `app/src/screens/Runner.tsx` | ChartButton + modal/panel integration |
| `app/src/screens/Review.tsx` | ChartButton + modal/panel integration |
| `app/src/screens/Home.tsx` | Reference Library card |
| `app/app/_layout.tsx` | (if needed for reference-library route) |
| `app/src/data/electrical-questions.json` | Add `chart_refs` to annotated questions |
| **Total modified files** | **~6** |

### Effort Estimate

| Phase | Scope | Estimate |
|-------|-------|----------|
| Phase 1: Schema + Components | Types, 13 components, store, route, screen | 2-3 sessions |
| Phase 2: Tier 1 Data | 11 tables + 4 diagrams, all verified | 2 sessions |
| Phase 3: Question Annotation | Script + manual review | 1 session |
| Phase 4: Tier 2/3 + Polish | 15 more tables, bookmarks, diagrams | 2 sessions |
| Testing | Unit + data + integration | 1 session |
| **Total** | | **8-10 sessions** |

---

## Offline Support

All chart data is bundled with the app as static TypeScript imports (same pattern as question JSON files). No network requests required. Charts are available offline from install.

OTA updates via `expo-updates` can add new charts or modify existing ones without an APK rebuild — chart data files are JavaScript, not native code.

---

## Future Considerations

1. **Remote chart loading** — When the app moves to Supabase-backed question loading, charts could also be fetched remotely. But bundled-first is correct for launch.

2. **User-contributed annotations** — Power users could submit "this question should reference Table X" suggestions. Low priority but valuable long-term.

3. **Dark/light mode** — The current dark theme is the only theme. If a light mode is added later, all chart components must respect the theme tokens. Build with theme tokens from the start (use `tokens.ts` values, not hardcoded colors).

4. **Print/export** — Students may want to print tables for physical study. A "Print" button on web could render a clean print stylesheet. Low priority.

5. **Accessibility** — Tables must have proper `accessibilityRole="grid"` and cell labels for screen readers. Diagrams need `accessibilityLabel` descriptions.

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| Modal vs. inline for mobile? | Bottom-sheet modal (Owner approved) |
| Modal vs. panel for web? | Side panel, 58/42 split (Owner approved) |
| Image-based vs. data-based tables? | Hybrid: JSON data for tables, SVG for diagrams, step-layout for calcs (Owner approved) |
| Where to store chart data? | Bundled as TypeScript files in `src/data/charts/` (Owner approved) |
| How to link charts to questions? | `chart_refs` optional field on Question schema (Owner approved) |

---

*This spec is ready for implementation. Glass handles web components (ChartPanel, LibraryCardGrid, web-specific layouts). Swift handles mobile components (ChartModal, gestures, pinch-to-zoom). Both share the core renderers (TableRenderer, DiagramRenderer, CalcRenderer, ChartViewer) and data layer.*
