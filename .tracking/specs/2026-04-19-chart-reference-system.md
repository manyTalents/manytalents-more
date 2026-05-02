# Chart & Reference System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a trade-agnostic chart/reference system for ManyTalents Prep that lets users view NEC tables, circuit diagrams, and calculations — linked from exam questions and browsable in a Reference Library.

**Architecture:** Hybrid rendering (JSON data tables + SVG diagrams + step-by-step calcs), question-linked via `chart_refs` field, platform-adaptive display (bottom-sheet modal on mobile, side panel on web), standalone Reference Library screen.

**Tech Stack:** Expo SDK 54, React Native 0.81.5, TypeScript 5.9, Zod, Zustand, react-native-reanimated, react-native-gesture-handler

**Spec:** `docs/superpowers/specs/2026-04-19-chart-reference-system-design.md`

**Codebase root:** `C:\Users\chris\OneDrive\Documentos\test prep app ManyTalentsMore\app`

---

## File Map

### New Files

| File | Responsibility |
|------|----------------|
| `src/types/chart.ts` | Zod schemas + TS types for ChartDefinition, ChartRef, TableData, CalcData |
| `src/state/useChartStore.ts` | Zustand store for chart viewing state |
| `src/components/charts/ChartButton.tsx` | Gold "View Chart" button shown on questions with chart_refs |
| `src/components/charts/ChartViewer.tsx` | Universal renderer — delegates to Table/Diagram/Calc renderer |
| `src/components/charts/ChartModal.tsx` | Mobile bottom-sheet modal wrapper |
| `src/components/charts/ChartPanel.tsx` | Web side-panel wrapper |
| `src/components/charts/ChartTabs.tsx` | Tab bar for multi-chart questions |
| `src/components/charts/TableRenderer.tsx` | Styled data table with highlight, zoom, sticky headers |
| `src/components/charts/DiagramRenderer.tsx` | SVG viewer with zoom and highlight |
| `src/components/charts/CalcRenderer.tsx` | Step-by-step math/formula display |
| `src/components/charts/ChartNotes.tsx` | Notes/gotchas panel below chart |
| `src/components/library/ReferenceLibrary.tsx` | Browsable chart library (trade → category → chart) |
| `src/components/library/LibraryCategoryAccordion.tsx` | Mobile accordion sections |
| `src/components/library/LibraryCardGrid.tsx` | Web card grid with previews |
| `src/components/library/LibrarySearch.tsx` | Search bar for reference library |
| `src/screens/ReferenceLibraryScreen.tsx` | Full screen wrapper |
| `app/reference-library.tsx` | Expo Router route |
| `src/data/charts/registry.ts` | Master chart registry (lookup by ID, trade, category) |
| `src/data/charts/la-electrical/index.ts` | Electrical trade chart registry |
| `src/data/charts/la-electrical/nec-310-16.ts` | Table 310.16 data (ampacity) |
| `src/data/charts/la-electrical/nec-220-55.ts` | Table 220.55 data (range demand) |
| `src/data/charts/la-electrical/nec-430-52.ts` | Table 430.52 data (motor OCPD) |
| `src/data/charts/la-electrical/nec-220-12.ts` | Table 220.12 data (lighting loads) |
| `src/data/charts/la-electrical/nec-250-66.ts` | Table 250.66 data (GEC sizing) |
| `src/data/charts/la-electrical/nec-220-42.ts` | Table 220.42 data (lighting demand) |
| `src/data/charts/la-electrical/nec-250-122.ts` | Table 250.122 data (EGC sizing) |
| `src/data/charts/la-electrical/nec-ch9-t1.ts` | Ch9 Table 1 data (conduit fill %) |
| `src/data/charts/la-electrical/nec-430-250.ts` | Table 430.250 data (3-phase motor FLC) |
| `src/data/charts/la-electrical/nec-ch9-t4.ts` | Ch9 Table 4 data (conduit dimensions) |
| `src/data/charts/la-electrical/nec-ch9-t5.ts` | Ch9 Table 5 data (conductor dimensions) |
| `scripts/annotate-chart-refs.ts` | Script to auto-annotate questions with chart_refs |

### Modified Files

| File | Change |
|------|--------|
| `src/types/question.ts` | Add optional `chart_refs` field to QuestionSchema |
| `app/runner.tsx` | Add ChartButton between stem and choices, ChartModal/ChartPanel |
| `app/review.tsx` | Same ChartButton + modal/panel integration |
| `app/home.tsx` | Add Reference Library card |
| `src/data/electrical-questions.json` | Add `chart_refs` to annotated questions |

---

## Task 1: Chart Type Definitions

**Files:**
- Create: `src/types/chart.ts`
- Modify: `src/types/question.ts`
- Test: `src/types/__tests__/chart.test.ts`

- [ ] **Step 1: Write the failing test for chart types**

```typescript
// src/types/__tests__/chart.test.ts
import {
  ChartDefinitionSchema,
  ChartRefSchema,
  TableDataSchema,
  CalcDataSchema,
} from "../chart";

describe("Chart type schemas", () => {
  it("validates a table chart definition", () => {
    const chart = {
      id: "nec-310-16",
      tradeId: "la-electrical",
      type: "table",
      title: "NEC Table 310.16",
      subtitle: "Allowable Ampacities",
      category: "Conductor & Ampacity",
      source: "2023 NEC (NFPA 70)",
      questionCount: 26,
      tier: "1",
      searchable: true,
      data: {
        columns: [
          { key: "size", header: "AWG/kcmil", align: "left" },
          { key: "cu60", header: "60°C", subheader: "TW, UF" },
        ],
        rows: [
          { cells: ["14", 15] },
          { cells: ["12", 20] },
        ],
      },
    };
    expect(() => ChartDefinitionSchema.parse(chart)).not.toThrow();
  });

  it("validates a calculation chart definition", () => {
    const chart = {
      id: "calc-voltage-drop",
      tradeId: "la-electrical",
      type: "calculation",
      title: "Voltage Drop Calculation",
      category: "Calculations",
      source: "2023 NEC (NFPA 70)",
      questionCount: 5,
      tier: "2",
      data: {
        steps: [
          {
            label: "Step 1: Determine allowable VD",
            formula: "VD_max = V × 0.03",
            substitution: "VD_max = 120 × 0.03 = 3.6V",
            result: "3.6 volts",
          },
        ],
        finalAnswer: "8 AWG minimum",
      },
    };
    expect(() => ChartDefinitionSchema.parse(chart)).not.toThrow();
  });

  it("validates a diagram chart definition", () => {
    const chart = {
      id: "diagram-grounding-electrode",
      tradeId: "la-electrical",
      type: "diagram",
      title: "Grounding Electrode System",
      category: "Grounding & Bonding",
      source: "2023 NEC (NFPA 70)",
      questionCount: 8,
      tier: "1",
      data: "<svg>...</svg>",
    };
    expect(() => ChartDefinitionSchema.parse(chart)).not.toThrow();
  });

  it("validates a chart reference", () => {
    const ref = {
      chartId: "nec-310-16",
      highlightRows: [4],
      highlightCells: [[4, 2]],
      note: "See 75°C column for THWN-2",
    };
    expect(() => ChartRefSchema.parse(ref)).not.toThrow();
  });

  it("rejects invalid chart type", () => {
    const chart = {
      id: "test",
      tradeId: "test",
      type: "invalid",
      title: "Test",
      category: "Test",
      source: "Test",
      tier: "1",
      data: {},
    };
    expect(() => ChartDefinitionSchema.parse(chart)).toThrow();
  });

  it("validates table with footnotes and notes", () => {
    const data = {
      columns: [{ key: "size", header: "Size" }],
      rows: [{ cells: ["14"] }],
      footnotes: ["* Based on 30°C ambient"],
      notes: [
        {
          label: "NEC 240.4(D)",
          text: "14 AWG max 15A",
          severity: "critical",
        },
      ],
    };
    expect(() => TableDataSchema.parse(data)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app" && npx jest src/types/__tests__/chart.test.ts --no-cache`
Expected: FAIL — cannot find module `../chart`

- [ ] **Step 3: Write chart type definitions**

```typescript
// src/types/chart.ts
import { z } from "zod";

// ── Column definition for table charts ──
export const ColumnDefSchema = z.object({
  key: z.string(),
  header: z.string(),
  subheader: z.string().optional(),
  fullSubheader: z.string().optional(),
  align: z.enum(["left", "center", "right"]).default("right"),
  width: z.number().optional(),
  group: z.string().optional(),
});
export type ColumnDef = z.infer<typeof ColumnDefSchema>;

// ── Row data for table charts ──
export const RowDataSchema = z.object({
  cells: z.array(z.union([z.string(), z.number(), z.null()])),
  isSectionHeader: z.boolean().optional(),
});
export type RowData = z.infer<typeof RowDataSchema>;

// ── Table data payload ──
export const TableDataSchema = z.object({
  columnGroups: z
    .array(z.object({ label: z.string(), colSpan: z.number() }))
    .optional(),
  columns: z.array(ColumnDefSchema),
  rows: z.array(RowDataSchema),
  footnotes: z.array(z.string()).optional(),
  notes: z
    .array(
      z.object({
        label: z.string(),
        text: z.string(),
        severity: z.enum(["info", "warning", "critical"]).default("info"),
      })
    )
    .optional(),
});
export type TableData = z.infer<typeof TableDataSchema>;

// ── Calculation step ──
export const CalcStepSchema = z.object({
  label: z.string(),
  formula: z.string(),
  substitution: z.string().optional(),
  result: z.string().optional(),
  note: z.string().optional(),
});
export type CalcStep = z.infer<typeof CalcStepSchema>;

// ── Calculation data payload ──
export const CalcDataSchema = z.object({
  steps: z.array(CalcStepSchema),
  finalAnswer: z.string(),
  variables: z.record(z.string(), z.string()).optional(),
});
export type CalcData = z.infer<typeof CalcDataSchema>;

// ── Chart definition ──
export const ChartDefinitionSchema = z.object({
  id: z.string(),
  tradeId: z.string(),
  type: z.enum(["table", "diagram", "calculation"]),
  title: z.string(),
  subtitle: z.string().optional(),
  category: z.string(),
  source: z.string(),
  questionCount: z.number().default(0),
  tier: z.enum(["1", "2", "3"]),
  searchable: z.boolean().default(true),
  relatedCharts: z.array(z.string()).optional(),
  data: z.union([TableDataSchema, CalcDataSchema, z.string()]),
});
export type ChartDefinition = z.infer<typeof ChartDefinitionSchema>;

// ── Chart reference from a question ──
export const ChartRefSchema = z.object({
  chartId: z.string(),
  highlightRows: z.array(z.number()).optional(),
  highlightCells: z.array(z.tuple([z.number(), z.number()])).optional(),
  highlightAreas: z.array(z.string()).optional(),
  note: z.string().optional(),
});
export type ChartRef = z.infer<typeof ChartRefSchema>;
```

- [ ] **Step 4: Add chart_refs to QuestionSchema**

In `src/types/question.ts`, add the import and field:

```typescript
// src/types/question.ts
import { z } from "zod";
import { ChartRefSchema } from "./chart";

export const QuestionSchema = z.object({
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

export type Question = z.infer<typeof QuestionSchema>;
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app" && npx jest src/types/__tests__/chart.test.ts --no-cache`
Expected: All 6 tests PASS

- [ ] **Step 6: Verify existing question tests still pass**

Run: `cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app" && npx jest --no-cache`
Expected: All existing tests PASS (chart_refs is optional, backward compatible)

- [ ] **Step 7: Commit**

```bash
cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app"
git add src/types/chart.ts src/types/question.ts src/types/__tests__/chart.test.ts
git commit -m "feat: add chart type definitions and chart_refs to question schema"
```

---

## Task 2: Chart State Store

**Files:**
- Create: `src/state/useChartStore.ts`

- [ ] **Step 1: Write the chart store**

```typescript
// src/state/useChartStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChartRef } from "../types/chart";

interface ChartState {
  // Active chart viewing
  activeChartRefs: ChartRef[] | null;
  activeChartIndex: number;
  isChartVisible: boolean;

  // Reference library
  librarySearchQuery: string;
  libraryCategory: string | null;

  // Viewing state
  tableSearchQuery: string;

  // Pinned charts (persisted)
  pinnedChartIds: string[];

  // Actions
  openChart: (refs: ChartRef[]) => void;
  closeChart: () => void;
  setActiveChartIndex: (index: number) => void;
  setLibrarySearch: (query: string) => void;
  setLibraryCategory: (category: string | null) => void;
  setTableSearch: (query: string) => void;
  togglePinnedChart: (chartId: string) => void;
  resetChartView: () => void;
}

export const useChartStore = create<ChartState>()(
  persist(
    (set) => ({
      activeChartRefs: null,
      activeChartIndex: 0,
      isChartVisible: false,
      librarySearchQuery: "",
      libraryCategory: null,
      tableSearchQuery: "",
      pinnedChartIds: [],

      openChart: (refs) =>
        set({ activeChartRefs: refs, activeChartIndex: 0, isChartVisible: true, tableSearchQuery: "" }),

      closeChart: () =>
        set({ isChartVisible: false, tableSearchQuery: "" }),

      setActiveChartIndex: (index) =>
        set({ activeChartIndex: index, tableSearchQuery: "" }),

      setLibrarySearch: (query) =>
        set({ librarySearchQuery: query }),

      setLibraryCategory: (category) =>
        set({ libraryCategory: category }),

      setTableSearch: (query) =>
        set({ tableSearchQuery: query }),

      togglePinnedChart: (chartId) =>
        set((state) => ({
          pinnedChartIds: state.pinnedChartIds.includes(chartId)
            ? state.pinnedChartIds.filter((id) => id !== chartId)
            : [...state.pinnedChartIds, chartId],
        })),

      resetChartView: () =>
        set({
          activeChartRefs: null,
          activeChartIndex: 0,
          isChartVisible: false,
          tableSearchQuery: "",
        }),
    }),
    {
      name: "chart-store",
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist pinnedChartIds — all other state is ephemeral
      partialize: (state) => ({ pinnedChartIds: state.pinnedChartIds }),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add src/state/useChartStore.ts
git commit -m "feat: add chart state store with pinned charts persistence"
```

---

## Task 3: Chart Data — NEC Table 310.16

**Files:**
- Create: `src/data/charts/la-electrical/nec-310-16.ts`
- Create: `src/data/charts/la-electrical/index.ts`
- Create: `src/data/charts/registry.ts`

This is the most important table — 26 questions reference it. Ohm verified all values. Includes copper + aluminum, extends to 500 kcmil, includes 240.4(D) and 110.14(C) notes.

- [ ] **Step 1: Create NEC Table 310.16 data file**

```typescript
// src/data/charts/la-electrical/nec-310-16.ts
import { ChartDefinition } from "../../../types/chart";

export const nec310_16: ChartDefinition = {
  id: "nec-310-16",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 310.16",
  subtitle: "Allowable Ampacities of Insulated Conductors Rated Up to and Including 2000 Volts, Not More Than Three Current-Carrying Conductors in Raceway, Cable, or Earth",
  category: "Conductor & Ampacity",
  source: "2023 NEC (NFPA 70)",
  questionCount: 26,
  tier: "1",
  searchable: true,
  relatedCharts: ["nec-310-15c1", "nec-ch9-t1"],
  data: {
    columnGroups: [
      { label: "", colSpan: 1 },
      { label: "Copper", colSpan: 3 },
      { label: "Aluminum or Copper-Clad Aluminum", colSpan: 3 },
    ],
    columns: [
      { key: "size", header: "AWG/kcmil", align: "left", width: 1.2 },
      { key: "cu60", header: "60°C", subheader: "TW, UF" },
      { key: "cu75", header: "75°C", subheader: "THW, THWN, XHHW", fullSubheader: "RHW, THHW, THW, THWN, XHHW, USE, ZW" },
      { key: "cu90", header: "90°C", subheader: "THWN-2, XHHW-2", fullSubheader: "TBS, SA, SIS, FEP, FEPB, MI, RHH, RHW-2, THHN, THHW, THW-2, THWN-2, USE-2, XHH, XHHW, XHHW-2, ZW-2" },
      { key: "al60", header: "60°C", subheader: "TW, UF" },
      { key: "al75", header: "75°C", subheader: "THW, THWN, XHHW", fullSubheader: "RHW, THHW, THW, THWN, XHHW, USE" },
      { key: "al90", header: "90°C", subheader: "THWN-2, XHHW-2", fullSubheader: "TBS, SA, SIS, RHH, RHW-2, THHN, THHW, THW-2, THWN-2, USE-2, XHH, XHHW, XHHW-2, ZW-2" },
    ],
    rows: [
      // AWG sizes
      { cells: ["14",   15,  20,  25,  null, null, null] },
      { cells: ["12",   20,  25,  30,  15,   20,   25] },
      { cells: ["10",   30,  35,  40,  25,   30,   35] },
      { cells: ["8",    40,  50,  55,  35,   40,   45] },
      { cells: ["6",    55,  65,  75,  40,   50,   60] },
      { cells: ["4",    70,  85,  95,  55,   65,   75] },
      { cells: ["3",    85, 100, 115,  65,   75,   85] },
      { cells: ["2",    95, 115, 130,  75,   90,  100] },
      { cells: ["1",   110, 130, 145,  85,  100,  115] },
      { cells: ["1/0", 125, 150, 170, 100,  120,  135] },
      { cells: ["2/0", 145, 175, 195, 115,  135,  150] },
      { cells: ["3/0", 165, 200, 225, 130,  155,  175] },
      { cells: ["4/0", 195, 230, 260, 150,  180,  205] },
      // kcmil sizes
      { cells: ["kcmil", null, null, null, null, null, null], isSectionHeader: true },
      { cells: ["250",  215, 255, 290, 170,  205,  230] },
      { cells: ["300",  240, 285, 320, 195,  230,  260] },
      { cells: ["350",  260, 310, 350, 210,  250,  280] },
      { cells: ["400",  280, 335, 380, 225,  270,  305] },
      { cells: ["500",  320, 380, 430, 260,  310,  350] },
    ],
    footnotes: [
      "Based on ambient temperature of 30°C (86°F). For other ambient temperatures, see Table 310.15(C)(1).",
      "For more than three current-carrying conductors in a raceway or cable, see Table 310.15(C)(1).",
      "Aluminum conductors are not available in 14 AWG.",
    ],
    notes: [
      {
        label: "NEC 240.4(D) — Small Conductor Protection",
        text: "Regardless of ampacity column, overcurrent protection is limited to: 14 AWG = 15A max, 12 AWG = 20A max, 10 AWG = 30A max. This is one of the most frequently tested exam traps.",
        severity: "critical",
      },
      {
        label: "NEC 110.14(C) — Termination Temperature Limits",
        text: "Most equipment is rated 75°C. Use the 75°C column for circuit sizing even with 90°C rated conductors — unless derating for ambient temperature or conductor fill (in which case, start with 90°C and derate, but the final value cannot exceed the 75°C column).",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Create electrical trade chart registry**

```typescript
// src/data/charts/la-electrical/index.ts
import { ChartDefinition } from "../../../types/chart";
import { nec310_16 } from "./nec-310-16";

export const electricalCharts: ChartDefinition[] = [
  nec310_16,
  // More charts will be added in subsequent tasks
];
```

- [ ] **Step 3: Create master chart registry**

```typescript
// src/data/charts/registry.ts
import { ChartDefinition } from "../../types/chart";
import { electricalCharts } from "./la-electrical";

const ALL_CHARTS: ChartDefinition[] = [
  ...electricalCharts,
];

const chartMap = new Map<string, ChartDefinition>();
ALL_CHARTS.forEach((c) => chartMap.set(c.id, c));

export function getChart(chartId: string): ChartDefinition | undefined {
  return chartMap.get(chartId);
}

export function getChartsForTrade(tradeId: string): ChartDefinition[] {
  return ALL_CHARTS.filter((c) => c.tradeId === tradeId);
}

export function getChartsByCategory(
  tradeId: string
): Record<string, ChartDefinition[]> {
  const charts = getChartsForTrade(tradeId);
  const grouped: Record<string, ChartDefinition[]> = {};
  charts.forEach((c) => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });
  return grouped;
}

export function getAllCharts(): ChartDefinition[] {
  return ALL_CHARTS;
}
```

- [ ] **Step 4: Commit**

```bash
git add src/data/charts/
git commit -m "feat: add NEC Table 310.16 data and chart registry"
```

---

## Task 4: Remaining Tier 1 Table Data

**Files:**
- Create: 10 more table data files in `src/data/charts/la-electrical/`
- Modify: `src/data/charts/la-electrical/index.ts`

Each table follows the same `ChartDefinition` pattern as nec-310-16. Ohm must verify all values against the 2023 NEC before this task is marked complete.

- [ ] **Step 1: Create all Tier 1 table data files**

Create each of these files using the `ChartDefinition` schema. Each file exports a single `const` of type `ChartDefinition`. The data (columns, rows, footnotes, notes) must be populated with accurate 2023 NEC values.

Files to create (one at a time):
1. `src/data/charts/la-electrical/nec-220-55.ts` — Table 220.55 (ranges/ovens demand). Columns: Number of Appliances, Column A (≤12kW), Column B (12-27kW), Column C (>12-27kW). 25 rows (1-25 appliances).
2. `src/data/charts/la-electrical/nec-430-52.ts` — Table 430.52 (motor OCPD). Columns: Motor Type, Non-Time Delay Fuse, Dual Element Fuse, Instantaneous Breaker, Inverse-Time Breaker.
3. `src/data/charts/la-electrical/nec-220-12.ts` — Table 220.12 (general lighting). Columns: Occupancy Type, VA per sq ft.
4. `src/data/charts/la-electrical/nec-250-66.ts` — Table 250.66 (GEC sizing). Columns: Largest Service-Entrance Conductor (Cu), Largest Service-Entrance Conductor (Al), GEC Size (Cu), GEC Size (Al).
5. `src/data/charts/la-electrical/nec-220-42.ts` — Table 220.42 (lighting demand factors). Columns: Portion of Lighting Load, Demand Factor %.
6. `src/data/charts/la-electrical/nec-250-122.ts` — Table 250.122 (EGC sizing). Columns: OCPD Rating, Cu EGC Size, Al EGC Size.
7. `src/data/charts/la-electrical/nec-ch9-t1.ts` — Ch9 Table 1 (conduit fill). Columns: Number of Conductors, % Fill Allowed.
8. `src/data/charts/la-electrical/nec-430-250.ts` — Table 430.250 (3-phase motor FLC). Columns: HP, 208V, 230V, 460V, 575V.
9. `src/data/charts/la-electrical/nec-ch9-t4.ts` — Ch9 Table 4 (conduit dimensions). Columns: Trade Size, Internal Diameter, Total Area (100%), fill areas by conductor count.
10. `src/data/charts/la-electrical/nec-ch9-t5.ts` — Ch9 Table 5 (conductor dimensions). Columns: Conductor Size, Type (THHN, THWN, XHHW, etc.), Area (sq in).

**CRITICAL:** All numeric values must be verified against the 2023 NEC. Route each completed file through Ohm for verification before committing.

- [ ] **Step 2: Update electrical trade registry**

```typescript
// src/data/charts/la-electrical/index.ts
import { ChartDefinition } from "../../../types/chart";
import { nec310_16 } from "./nec-310-16";
import { nec220_55 } from "./nec-220-55";
import { nec430_52 } from "./nec-430-52";
import { nec220_12 } from "./nec-220-12";
import { nec250_66 } from "./nec-250-66";
import { nec220_42 } from "./nec-220-42";
import { nec250_122 } from "./nec-250-122";
import { necCh9T1 } from "./nec-ch9-t1";
import { nec430_250 } from "./nec-430-250";
import { necCh9T4 } from "./nec-ch9-t4";
import { necCh9T5 } from "./nec-ch9-t5";

export const electricalCharts: ChartDefinition[] = [
  nec310_16,
  nec220_55,
  nec430_52,
  nec220_12,
  nec250_66,
  nec220_42,
  nec250_122,
  necCh9T1,
  nec430_250,
  necCh9T4,
  necCh9T5,
];
```

- [ ] **Step 3: Commit**

```bash
git add src/data/charts/la-electrical/
git commit -m "feat: add all Tier 1 NEC table data (11 tables)"
```

---

## Task 5: ChartNotes Component

**Files:**
- Create: `src/components/charts/ChartNotes.tsx`

- [ ] **Step 1: Build the ChartNotes component**

```typescript
// src/components/charts/ChartNotes.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radii, fontSize, fontWeight } from "../../theme/tokens";

type NoteSeverity = "info" | "warning" | "critical";

interface ChartNote {
  label: string;
  text: string;
  severity: NoteSeverity;
}

interface ChartNotesProps {
  notes?: ChartNote[];
  footnotes?: string[];
}

const SEVERITY_COLORS: Record<NoteSeverity, string> = {
  info: "#38bdf8",
  warning: "#f59e0b",
  critical: "#f87171",
};

export function ChartNotes({ notes, footnotes }: ChartNotesProps) {
  if (!notes?.length && !footnotes?.length) return null;

  return (
    <View style={styles.container}>
      {notes?.map((note, i) => (
        <View
          key={i}
          style={[styles.noteCard, { borderLeftColor: SEVERITY_COLORS[note.severity] }]}
        >
          <Text style={[styles.noteLabel, { color: SEVERITY_COLORS[note.severity] }]}>
            {note.label}
          </Text>
          <Text style={styles.noteText}>{note.text}</Text>
        </View>
      ))}
      {footnotes && footnotes.length > 0 && (
        <View style={styles.footnoteSection}>
          {footnotes.map((fn, i) => (
            <Text key={i} style={styles.footnoteText}>
              {i + 1}. {fn}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  noteCard: {
    backgroundColor: colors.bgCard,
    borderLeftWidth: 3,
    borderRadius: radii.sm,
    padding: spacing.md,
  },
  noteLabel: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  footnoteSection: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  footnoteText: {
    fontSize: fontSize.xs,
    color: colors.textMuted,
    lineHeight: 16,
    marginBottom: 2,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/charts/ChartNotes.tsx
git commit -m "feat: add ChartNotes component for table footnotes and gotchas"
```

---

## Task 6: TableRenderer Component

**Files:**
- Create: `src/components/charts/TableRenderer.tsx`

This is the most complex component — handles column groups, sticky headers, row/cell highlighting, alternating rows, and search.

- [ ] **Step 1: Build the TableRenderer**

```typescript
// src/components/charts/TableRenderer.tsx
import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Platform, TextInput } from "react-native";
import { colors, spacing, radii, fontSize, fontWeight, fontFamily } from "../../theme/tokens";
import { TableData, ChartRef } from "../../types/chart";
import { ChartNotes } from "./ChartNotes";

interface TableRendererProps {
  data: TableData;
  highlights?: ChartRef;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
}

export function TableRenderer({ data, highlights, searchQuery, onSearchChange }: TableRendererProps) {
  const { columns, rows, columnGroups, footnotes, notes } = data;

  const highlightRowSet = useMemo(
    () => new Set(highlights?.highlightRows ?? []),
    [highlights?.highlightRows]
  );

  const highlightCellSet = useMemo(() => {
    const set = new Set<string>();
    highlights?.highlightCells?.forEach(([r, c]) => set.add(`${r}-${c}`));
    return set;
  }, [highlights?.highlightCells]);

  // Filter rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery?.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((row) =>
      row.cells.some(
        (cell) => cell !== null && String(cell).toLowerCase().includes(q)
      )
    );
  }, [rows, searchQuery]);

  // Map filtered rows back to original indices for highlighting
  const originalIndices = useMemo(() => {
    if (!searchQuery?.trim()) return rows.map((_, i) => i);
    return rows.reduce<number[]>((acc, row, i) => {
      const q = searchQuery!.toLowerCase();
      if (row.cells.some((cell) => cell !== null && String(cell).toLowerCase().includes(q))) {
        acc.push(i);
      }
      return acc;
    }, []);
  }, [rows, searchQuery]);

  return (
    <View style={styles.wrapper}>
      {/* Search — web only for initial release */}
      {Platform.OS === "web" && onSearchChange && (
        <TextInput
          style={styles.searchInput}
          placeholder="Search table (e.g., 6 AWG)"
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={Platform.OS === "web"}>
        <View>
          {/* Column group headers */}
          {columnGroups && (
            <View style={styles.headerRow}>
              {columnGroups.map((group, gi) => (
                <View
                  key={gi}
                  style={[
                    styles.groupHeader,
                    { width: group.colSpan * 80 },
                    gi === 0 && styles.stickyFirstCol,
                  ]}
                >
                  <Text style={styles.groupHeaderText}>{group.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Column headers */}
          <View style={[styles.headerRow, styles.columnHeaderRow]}>
            {columns.map((col, ci) => (
              <View
                key={col.key}
                style={[
                  styles.headerCell,
                  ci === 0 && styles.stickyFirstCol,
                  col.width ? { width: col.width * 80 } : { width: 80 },
                ]}
              >
                <Text style={styles.headerText}>{col.header}</Text>
                {col.subheader && (
                  <Text style={styles.subheaderText}>{col.subheader}</Text>
                )}
              </View>
            ))}
          </View>

          {/* Data rows */}
          {filteredRows.map((row, fi) => {
            const originalIdx = originalIndices[fi];
            const isHighlighted = highlightRowSet.has(originalIdx);
            const isOdd = fi % 2 === 1;
            const isSectionHeader = row.isSectionHeader;

            return (
              <View
                key={fi}
                style={[
                  styles.dataRow,
                  isOdd && styles.dataRowAlt,
                  isHighlighted && styles.dataRowHighlighted,
                  isSectionHeader && styles.sectionHeaderRow,
                ]}
              >
                {row.cells.map((cell, ci) => {
                  const isCellHighlighted = highlightCellSet.has(`${originalIdx}-${ci}`);
                  const col = columns[ci];

                  return (
                    <View
                      key={ci}
                      style={[
                        styles.dataCell,
                        ci === 0 && styles.stickyFirstCol,
                        col?.width ? { width: col.width * 80 } : { width: 80 },
                        isCellHighlighted && styles.dataCellHighlighted,
                      ]}
                    >
                      <Text
                        style={[
                          styles.cellText,
                          ci === 0 && styles.cellTextLabel,
                          isSectionHeader && styles.sectionHeaderText,
                          cell === null && styles.cellTextNull,
                        ]}
                      >
                        {cell === null ? "—" : String(cell)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Highlight note */}
      {highlights?.note && (
        <View style={styles.highlightNote}>
          <Text style={styles.highlightNoteText}>{highlights.note}</Text>
        </View>
      )}

      {/* Notes and footnotes */}
      <ChartNotes notes={notes} footnotes={footnotes} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1 },
  searchInput: {
    backgroundColor: colors.bgInput,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
  },
  headerRow: {
    flexDirection: "row",
  },
  columnHeaderRow: {
    backgroundColor: colors.bgCardHover,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  groupHeader: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  groupHeaderText: {
    color: colors.gold,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  headerCell: {
    paddingVertical: spacing.sm,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  stickyFirstCol: {
    backgroundColor: colors.bgSurface,
    ...(Platform.OS === "web" ? { position: "sticky" as any, left: 0, zIndex: 1 } : {}),
  },
  headerText: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    textAlign: "center",
  },
  subheaderText: {
    color: colors.textMuted,
    fontSize: 9,
    textAlign: "center",
    marginTop: 2,
  },
  dataRow: {
    flexDirection: "row",
    backgroundColor: colors.bgCard,
  },
  dataRowAlt: {
    backgroundColor: colors.bgSurface,
  },
  dataRowHighlighted: {
    backgroundColor: "rgba(201, 168, 76, 0.12)",
  },
  sectionHeaderRow: {
    backgroundColor: colors.bgCardHover,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dataCell: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  dataCellHighlighted: {
    backgroundColor: "rgba(201, 168, 76, 0.25)",
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 2,
  },
  cellText: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontFamily: fontFamily?.mono,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  cellTextLabel: {
    textAlign: "left",
    fontWeight: fontWeight.medium,
  },
  cellTextNull: {
    color: colors.textMuted,
  },
  sectionHeaderText: {
    fontWeight: fontWeight.bold,
    color: colors.gold,
    textAlign: "left",
  },
  highlightNote: {
    backgroundColor: colors.goldSubtle,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  highlightNoteText: {
    color: colors.goldLight,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add src/components/charts/TableRenderer.tsx
git commit -m "feat: add TableRenderer with column groups, highlights, search"
```

---

## Task 7: ChartViewer, ChartButton, DiagramRenderer, CalcRenderer

**Files:**
- Create: `src/components/charts/ChartViewer.tsx`
- Create: `src/components/charts/ChartButton.tsx`
- Create: `src/components/charts/DiagramRenderer.tsx`
- Create: `src/components/charts/CalcRenderer.tsx`
- Create: `src/components/charts/ChartTabs.tsx`

- [ ] **Step 1: Build ChartButton**

```typescript
// src/components/charts/ChartButton.tsx
import React from "react";
import { Pressable, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, fontSize, fontWeight } from "../../theme/tokens";
import { ChartRef } from "../../types/chart";

interface ChartButtonProps {
  chartRefs: ChartRef[];
  onPress: () => void;
}

export function ChartButton({ chartRefs, onPress }: ChartButtonProps) {
  if (!chartRefs || chartRefs.length === 0) return null;

  const label =
    chartRefs.length === 1
      ? "View Chart"
      : `View Charts (${chartRefs.length})`;

  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Ionicons name="reader-outline" size={18} color={colors.gold} />
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.goldSubtle,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    paddingVertical: 12,
    marginVertical: spacing.sm,
  },
  text: {
    color: colors.gold,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
});
```

- [ ] **Step 2: Build CalcRenderer**

```typescript
// src/components/charts/CalcRenderer.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, spacing, radii, fontSize, fontWeight, fontFamily } from "../../theme/tokens";
import { CalcData } from "../../types/chart";

interface CalcRendererProps {
  data: CalcData;
}

export function CalcRenderer({ data }: CalcRendererProps) {
  return (
    <View style={styles.container}>
      {data.steps.map((step, i) => (
        <View key={i} style={styles.step}>
          <Text style={styles.stepLabel}>{step.label}</Text>
          <View style={styles.formulaBox}>
            <Text style={styles.formulaText}>{step.formula}</Text>
          </View>
          {step.substitution && (
            <View style={styles.substitutionRow}>
              <Text style={styles.arrow}>→</Text>
              <Text style={styles.substitutionText}>{step.substitution}</Text>
            </View>
          )}
          {step.result && (
            <Text style={styles.resultText}>= {step.result}</Text>
          )}
          {step.note && (
            <Text style={styles.noteText}>{step.note}</Text>
          )}
        </View>
      ))}

      <View style={styles.finalAnswer}>
        <Text style={styles.finalAnswerLabel}>Answer</Text>
        <Text style={styles.finalAnswerText}>{data.finalAnswer}</Text>
      </View>

      {data.variables && Object.keys(data.variables).length > 0 && (
        <View style={styles.variables}>
          <Text style={styles.variablesTitle}>Variables</Text>
          {Object.entries(data.variables).map(([key, val]) => (
            <Text key={key} style={styles.variableRow}>
              <Text style={styles.variableKey}>{key}</Text> = {val}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  step: { gap: spacing.xs },
  stepLabel: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
  },
  formulaBox: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.sm,
    padding: spacing.sm,
    alignItems: "center",
  },
  formulaText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontFamily: fontFamily?.mono,
  },
  substitutionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: spacing.md,
    gap: spacing.sm,
  },
  arrow: { color: colors.gold, fontSize: fontSize.lg },
  substitutionText: {
    color: colors.goldLight,
    fontSize: fontSize.sm,
    fontFamily: fontFamily?.mono,
  },
  resultText: {
    color: colors.green,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    paddingLeft: spacing.md,
  },
  noteText: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontStyle: "italic",
    paddingLeft: spacing.md,
  },
  finalAnswer: {
    backgroundColor: colors.bgCard,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
  },
  finalAnswerLabel: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  finalAnswerText: {
    color: colors.gold,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    marginTop: spacing.xs,
  },
  variables: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
  },
  variablesTitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  variableRow: { color: colors.textSecondary, fontSize: fontSize.xs },
  variableKey: { fontFamily: fontFamily?.mono, color: colors.textPrimary },
});
```

- [ ] **Step 3: Build DiagramRenderer (placeholder — SVG support)**

```typescript
// src/components/charts/DiagramRenderer.tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet, Platform } from "react-native";
import { colors, spacing, fontSize } from "../../theme/tokens";
import { ChartRef } from "../../types/chart";

interface DiagramRendererProps {
  svg: string | React.ComponentType<any>;
  highlights?: ChartRef;
}

export function DiagramRenderer({ svg, highlights }: DiagramRendererProps) {
  // For string SVG content (web), render via dangerouslySetInnerHTML
  // For React components (mobile), render directly
  if (typeof svg === "string" && Platform.OS === "web") {
    return (
      <ScrollView
        style={styles.container}
        maximumZoomScale={3}
        minimumZoomScale={0.5}
      >
        <View
          style={styles.svgContainer}
          // @ts-ignore — web only
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </ScrollView>
    );
  }

  const SvgComponent = svg as React.ComponentType<any>;
  if (typeof svg === "function" || (typeof svg === "object" && svg !== null)) {
    return (
      <ScrollView
        style={styles.container}
        maximumZoomScale={3}
        minimumZoomScale={0.5}
      >
        <SvgComponent highlightAreas={highlights?.highlightAreas} />
      </ScrollView>
    );
  }

  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>Diagram loading...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  svgContainer: { alignItems: "center", padding: spacing.md },
  placeholder: {
    padding: spacing.xl,
    alignItems: "center",
  },
  placeholderText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
  },
});
```

- [ ] **Step 4: Build ChartTabs**

```typescript
// src/components/charts/ChartTabs.tsx
import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { colors, spacing, radii, fontSize, fontWeight } from "../../theme/tokens";
import { getChart } from "../../data/charts/registry";
import { ChartRef } from "../../types/chart";

interface ChartTabsProps {
  chartRefs: ChartRef[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export function ChartTabs({ chartRefs, activeIndex, onChange }: ChartTabsProps) {
  if (chartRefs.length <= 1) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
    >
      {chartRefs.map((ref, i) => {
        const chart = getChart(ref.chartId);
        const isActive = i === activeIndex;
        return (
          <Pressable
            key={ref.chartId}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onChange(i)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {chart?.title ?? ref.chartId}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.gold,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  tabTextActive: {
    color: colors.gold,
  },
});
```

- [ ] **Step 5: Build ChartViewer**

```typescript
// src/components/charts/ChartViewer.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { ChartDefinition, ChartRef, TableData, CalcData } from "../../types/chart";
import { TableRenderer } from "./TableRenderer";
import { DiagramRenderer } from "./DiagramRenderer";
import { CalcRenderer } from "./CalcRenderer";
import { colors, spacing, fontSize, fontWeight } from "../../theme/tokens";

interface ChartViewerProps {
  chart: ChartDefinition;
  chartRef?: ChartRef;
  tableSearchQuery?: string;
  onTableSearchChange?: (query: string) => void;
}

export function ChartViewer({
  chart,
  chartRef,
  tableSearchQuery,
  onTableSearchChange,
}: ChartViewerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{chart.title}</Text>
      {chart.subtitle && (
        <Text style={styles.subtitle}>{chart.subtitle}</Text>
      )}

      {chart.type === "table" && (
        <TableRenderer
          data={chart.data as TableData}
          highlights={chartRef}
          searchQuery={tableSearchQuery}
          onSearchChange={onTableSearchChange}
        />
      )}

      {chart.type === "diagram" && (
        <DiagramRenderer
          svg={chart.data as string}
          highlights={chartRef}
        />
      )}

      {chart.type === "calculation" && (
        <CalcRenderer data={chart.data as CalcData} />
      )}

      <Text style={styles.source}>{chart.source}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: fontSize.xs,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  source: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: spacing.md,
    textAlign: "right",
  },
});
```

- [ ] **Step 6: Commit**

```bash
git add src/components/charts/
git commit -m "feat: add ChartButton, ChartViewer, TableRenderer, CalcRenderer, DiagramRenderer, ChartTabs"
```

---

## Task 8: ChartModal (Mobile) and ChartPanel (Web)

**Files:**
- Create: `src/components/charts/ChartModal.tsx`
- Create: `src/components/charts/ChartPanel.tsx`

- [ ] **Step 1: Build ChartModal (mobile bottom-sheet)**

```typescript
// src/components/charts/ChartModal.tsx
import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, fontSize } from "../../theme/tokens";
import { ChartRef } from "../../types/chart";
import { getChart } from "../../data/charts/registry";
import { ChartViewer } from "./ChartViewer";
import { ChartTabs } from "./ChartTabs";
import { useChartStore } from "../../state/useChartStore";

interface ChartModalProps {
  visible: boolean;
  chartRefs: ChartRef[];
  onClose: () => void;
}

export function ChartModal({ visible, chartRefs, onClose }: ChartModalProps) {
  const activeIndex = useChartStore((s) => s.activeChartIndex);
  const setActiveIndex = useChartStore((s) => s.setActiveChartIndex);
  const tableSearch = useChartStore((s) => s.tableSearchQuery);
  const setTableSearch = useChartStore((s) => s.setTableSearch);

  if (!chartRefs || chartRefs.length === 0) return null;

  const activeRef = chartRefs[activeIndex] ?? chartRefs[0];
  const chart = getChart(activeRef.chartId);

  if (!chart) return null;

  const screenHeight = Dimensions.get("window").height;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { maxHeight: screenHeight * 0.80 }]}>
        {/* Drag handle */}
        <View style={styles.dragHandleRow}>
          <View style={styles.dragHandle} />
        </View>

        {/* Close button */}
        <Pressable style={styles.closeButton} onPress={onClose} hitSlop={8}>
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>

        {/* Tabs (if multiple charts) */}
        <ChartTabs
          chartRefs={chartRefs}
          activeIndex={activeIndex}
          onChange={setActiveIndex}
        />

        {/* Chart content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator
          maximumZoomScale={Platform.OS !== "web" ? 3 : 1}
        >
          <ChartViewer
            chart={chart}
            chartRef={activeRef}
            tableSearchQuery={tableSearch}
            onTableSearchChange={setTableSearch}
          />
        </ScrollView>

        {/* Zoom hint — mobile only */}
        {Platform.OS !== "web" && (
          <Text style={styles.zoomHint}>Pinch to zoom • Scroll to explore</Text>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bgSurface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: 34, // safe area
  },
  dragHandleRow: {
    alignItems: "center",
    paddingVertical: spacing.sm,
  },
  dragHandle: {
    width: 36,
    height: 4,
    backgroundColor: colors.textMuted,
    borderRadius: 2,
  },
  closeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.md,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  contentInner: {
    paddingBottom: spacing.lg,
  },
  zoomHint: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    textAlign: "center",
    paddingVertical: spacing.xs,
  },
});
```

- [ ] **Step 2: Build ChartPanel (web side-panel)**

```typescript
// src/components/charts/ChartPanel.tsx
import React from "react";
import { View, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii } from "../../theme/tokens";
import { ChartRef } from "../../types/chart";
import { getChart } from "../../data/charts/registry";
import { ChartViewer } from "./ChartViewer";
import { ChartTabs } from "./ChartTabs";
import { useChartStore } from "../../state/useChartStore";

interface ChartPanelProps {
  chartRefs: ChartRef[];
  visible: boolean;
}

export function ChartPanel({ chartRefs, visible }: ChartPanelProps) {
  const activeIndex = useChartStore((s) => s.activeChartIndex);
  const setActiveIndex = useChartStore((s) => s.setActiveChartIndex);
  const closeChart = useChartStore((s) => s.closeChart);
  const tableSearch = useChartStore((s) => s.tableSearchQuery);
  const setTableSearch = useChartStore((s) => s.setTableSearch);

  if (!visible || !chartRefs || chartRefs.length === 0) return null;
  if (Platform.OS !== "web") return null; // Side panel is web-only

  const activeRef = chartRefs[activeIndex] ?? chartRefs[0];
  const chart = getChart(activeRef.chartId);

  if (!chart) return null;

  return (
    <View style={styles.panel}>
      {/* Close button */}
      <Pressable style={styles.closeButton} onPress={closeChart} hitSlop={8}>
        <Ionicons name="close" size={22} color={colors.textSecondary} />
      </Pressable>

      {/* Tabs */}
      <ChartTabs
        chartRefs={chartRefs}
        activeIndex={activeIndex}
        onChange={setActiveIndex}
      />

      {/* Chart content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
      >
        <ChartViewer
          chart={chart}
          chartRef={activeRef}
          tableSearchQuery={tableSearch}
          onTableSearchChange={setTableSearch}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    width: "42%",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.bgSurface,
    ...(Platform.OS === "web"
      ? { height: "100vh" as any, position: "sticky" as any, top: 0 }
      : {}),
  },
  closeButton: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    zIndex: 10,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  contentInner: {
    paddingBottom: spacing.xl,
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/ChartModal.tsx src/components/charts/ChartPanel.tsx
git commit -m "feat: add ChartModal (mobile bottom-sheet) and ChartPanel (web side-panel)"
```

---

## Task 9: Wire ChartButton into Runner Screen

**Files:**
- Modify: `app/runner.tsx`

- [ ] **Step 1: Add imports to runner.tsx**

Add these imports at the top of `app/runner.tsx`:

```typescript
import { Platform } from "react-native";
import { ChartButton } from "../src/components/charts/ChartButton";
import { ChartModal } from "../src/components/charts/ChartModal";
import { ChartPanel } from "../src/components/charts/ChartPanel";
import { useChartStore } from "../src/state/useChartStore";
```

- [ ] **Step 2: Add chart state hooks inside RunnerRoute**

After the existing state declarations (around line 53-58), add:

```typescript
const chartRefs = (question as any)?.chart_refs ?? [];
const hasCharts = chartRefs.length > 0;
const openChart = useChartStore((s) => s.openChart);
const closeChart = useChartStore((s) => s.closeChart);
const isChartVisible = useChartStore((s) => s.isChartVisible);
const activeChartRefs = useChartStore((s) => s.activeChartRefs);
```

- [ ] **Step 3: Add ChartButton between stem and choices**

In the render, after the `questionText` Text component (around line 361) and before `safeOptions.map(...)` (around line 363), insert:

```tsx
{hasCharts && (
  <ChartButton
    chartRefs={chartRefs}
    onPress={() => openChart(chartRefs)}
  />
)}
```

- [ ] **Step 4: Add ChartModal at the end of the component (before closing View)**

Just before the final `</View>` of the component return, add:

```tsx
{/* Chart Modal (mobile) */}
{Platform.OS !== "web" && (
  <ChartModal
    visible={isChartVisible}
    chartRefs={activeChartRefs ?? []}
    onClose={closeChart}
  />
)}
```

- [ ] **Step 5: Wrap runner content in flex layout for web side panel**

For web, wrap the existing `ScrollView` and footer in a flex row, and add `ChartPanel`:

Wrap the `<ScrollView style={styles.content}>...</ScrollView>` and footer `<View>` together in:

```tsx
<View style={Platform.OS === "web" && isChartVisible ? styles.splitLayout : styles.fullLayout}>
  <View style={Platform.OS === "web" && isChartVisible ? styles.questionSide : { flex: 1 }}>
    {/* existing ScrollView + footer here */}
  </View>
  {Platform.OS === "web" && (
    <ChartPanel
      chartRefs={activeChartRefs ?? []}
      visible={isChartVisible}
    />
  )}
</View>
```

Add to the StyleSheet:

```typescript
splitLayout: {
  flex: 1,
  flexDirection: "row",
},
fullLayout: {
  flex: 1,
},
questionSide: {
  flex: 1,
  width: "58%",
},
```

- [ ] **Step 6: Test manually**

Run: `cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app" && npx expo start --web`
- Load the app, start an exam
- Verify questions WITHOUT chart_refs show no ChartButton
- (ChartButton won't appear yet since no questions have chart_refs annotated — this is expected)

- [ ] **Step 7: Commit**

```bash
git add app/runner.tsx
git commit -m "feat: wire ChartButton, ChartModal, ChartPanel into runner screen"
```

---

## Task 10: Wire ChartButton into Review Screen

**Files:**
- Modify: `app/review.tsx`

Same pattern as Task 9 but for the review screen. Add imports, ChartButton after each question stem, ChartModal/ChartPanel.

- [ ] **Step 1: Add imports and chart integration to review.tsx**

Follow the same pattern as runner.tsx — import ChartButton, ChartModal, ChartPanel, useChartStore. For each question in the review list, render `<ChartButton>` if `q.chart_refs` exists.

- [ ] **Step 2: Commit**

```bash
git add app/review.tsx
git commit -m "feat: wire ChartButton into review screen"
```

---

## Task 11: Reference Library Screen

**Files:**
- Create: `src/components/library/ReferenceLibrary.tsx`
- Create: `src/screens/ReferenceLibraryScreen.tsx`
- Create: `app/reference-library.tsx`
- Modify: `app/home.tsx`

- [ ] **Step 1: Build ReferenceLibrary component**

```typescript
// src/components/library/ReferenceLibrary.tsx
import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, spacing, radii, fontSize, fontWeight, elevation } from "../../theme/tokens";
import { useTradeStore } from "../../state/useTradeStore";
import { useChartStore } from "../../state/useChartStore";
import { getChartsByCategory } from "../../data/charts/registry";
import { ChartDefinition } from "../../types/chart";
import { ChartModal } from "../charts/ChartModal";

export function ReferenceLibrary() {
  const activeTrade = useTradeStore((s) => s.getActiveTrade());
  const tradeId = useTradeStore((s) => s.selectedTradeId);
  const openChart = useChartStore((s) => s.openChart);
  const isChartVisible = useChartStore((s) => s.isChartVisible);
  const activeChartRefs = useChartStore((s) => s.activeChartRefs);
  const closeChart = useChartStore((s) => s.closeChart);

  const [expandedCategory, setExpandedCategory] = useState<string | null>(
    "Conductor & Ampacity"
  );

  const categories = tradeId ? getChartsByCategory(tradeId) : {};

  const toggleCategory = (cat: string) => {
    setExpandedCategory((prev) => (prev === cat ? null : cat));
  };

  const handleChartPress = (chart: ChartDefinition) => {
    openChart([{ chartId: chart.id }]);
  };

  const getCountColor = (count: number) => {
    if (count >= 20) return "#f87171";
    if (count >= 10) return "#f59e0b";
    return colors.textMuted;
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Reference Library</Text>
        {activeTrade && (
          <Text style={styles.tradeName}>{activeTrade.displayName}</Text>
        )}

        {Object.entries(categories).map(([category, charts]) => (
          <View key={category} style={styles.categorySection}>
            <Pressable
              style={styles.categoryHeader}
              onPress={() => toggleCategory(category)}
            >
              <Text style={styles.categoryTitle}>{category}</Text>
              <View style={styles.categoryRight}>
                <Text style={styles.categoryCount}>{charts.length}</Text>
                <Ionicons
                  name={expandedCategory === category ? "chevron-up" : "chevron-down"}
                  size={18}
                  color={colors.textMuted}
                />
              </View>
            </Pressable>

            {expandedCategory === category &&
              charts
                .sort((a, b) => b.questionCount - a.questionCount)
                .map((chart) => (
                  <Pressable
                    key={chart.id}
                    style={styles.chartCard}
                    onPress={() => handleChartPress(chart)}
                  >
                    <View style={styles.chartInfo}>
                      <Text style={styles.chartTitle}>{chart.title}</Text>
                      {chart.subtitle && (
                        <Text style={styles.chartSubtitle} numberOfLines={1}>
                          {chart.subtitle}
                        </Text>
                      )}
                    </View>
                    <View
                      style={[
                        styles.countBadge,
                        { backgroundColor: getCountColor(chart.questionCount) + "20" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.countBadgeText,
                          { color: getCountColor(chart.questionCount) },
                        ]}
                      >
                        {chart.questionCount}q
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={colors.textMuted}
                    />
                  </Pressable>
                ))}
          </View>
        ))}

        {Object.keys(categories).length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>
              No reference charts available for this trade yet.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Chart Modal for viewing */}
      {Platform.OS !== "web" && (
        <ChartModal
          visible={isChartVisible}
          chartRefs={activeChartRefs ?? []}
          onClose={closeChart}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgDeep },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  title: {
    color: colors.textPrimary,
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
  },
  tradeName: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
    marginBottom: spacing.lg,
  },
  categorySection: {
    marginBottom: spacing.sm,
  },
  categoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: colors.bgCard,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  categoryTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: fontWeight.semibold,
  },
  categoryRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  categoryCount: { color: colors.textMuted, fontSize: fontSize.sm },
  chartCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bgSurface,
    borderRadius: radii.sm,
    padding: spacing.md,
    marginTop: spacing.xs,
    marginLeft: spacing.md,
  },
  chartInfo: { flex: 1 },
  chartTitle: {
    color: colors.textPrimary,
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
  },
  chartSubtitle: {
    color: colors.textMuted,
    fontSize: fontSize.xs,
    marginTop: 2,
  },
  countBadge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    marginRight: spacing.sm,
  },
  countBadgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
  },
  emptyState: { alignItems: "center", padding: spacing.xxl, gap: spacing.md },
  emptyText: { color: colors.textMuted, fontSize: fontSize.sm, textAlign: "center" },
});
```

- [ ] **Step 2: Create screen wrapper and route**

```typescript
// src/screens/ReferenceLibraryScreen.tsx
import React from "react";
import { ReferenceLibrary } from "../components/library/ReferenceLibrary";
export default function ReferenceLibraryScreen() {
  return <ReferenceLibrary />;
}
```

```typescript
// app/reference-library.tsx
import ReferenceLibraryScreen from "../src/screens/ReferenceLibraryScreen";
export default ReferenceLibraryScreen;
```

- [ ] **Step 3: Add Reference Library card to Home screen**

In `app/home.tsx`, after the existing "Don't see your exam?" card section, add:

```tsx
{/* Reference Library card */}
{tradeId && (
  <Pressable
    style={[styles.tradeCard, { borderColor: colors.gold }]}
    onPress={() => router.push("/reference-library")}
  >
    <View style={styles.tradeCardHeader}>
      <View style={[styles.tradeIconWrap, { backgroundColor: colors.goldSubtle }]}>
        <Ionicons name="book-outline" size={24} color={colors.gold} />
      </View>
      <View style={styles.tradeCardInfo}>
        <Text style={styles.tradeCardTitle}>Reference Library</Text>
        <Text style={styles.tradeCardSlogan}>
          Tables, diagrams & formulas
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </View>
  </Pressable>
)}
```

(Uses existing `styles.tradeCard`, `tradeCardHeader`, `tradeIconWrap`, `tradeCardInfo`, `tradeCardTitle`, `tradeCardSlogan` styles that are already defined in home.tsx)

- [ ] **Step 4: Test manually**

Run: `npx expo start --web`
- Navigate to home → verify Reference Library card appears
- Tap it → verify reference-library route loads
- Verify the Conductor & Ampacity category is expanded with Table 310.16
- Tap Table 310.16 → verify ChartModal opens with the full table

- [ ] **Step 5: Commit**

```bash
git add src/components/library/ src/screens/ReferenceLibraryScreen.tsx app/reference-library.tsx app/home.tsx
git commit -m "feat: add Reference Library screen with category accordion and home card"
```

---

## Task 12: Question Annotation Script

**Files:**
- Create: `scripts/annotate-chart-refs.ts`
- Modify: `src/data/electrical-questions.json`

- [ ] **Step 1: Write the annotation script**

```typescript
// scripts/annotate-chart-refs.ts
// Run with: npx ts-node scripts/annotate-chart-refs.ts
// Or: node -e "require('tsx/cjs'); require('./scripts/annotate-chart-refs.ts')"

import * as fs from "fs";
import * as path from "path";

const QUESTIONS_PATH = path.join(__dirname, "../src/data/electrical-questions.json");

// Map NEC table references to chart IDs
const TABLE_MAPPINGS: Record<string, string> = {
  "310.16": "nec-310-16",
  "220.55": "nec-220-55",
  "430.52": "nec-430-52",
  "220.12": "nec-220-12",
  "250.66": "nec-250-66",
  "220.42": "nec-220-42",
  "250.122": "nec-250-122",
  "430.250": "nec-430-250",
};

// Conductor size to row index mapping for Table 310.16
const CONDUCTOR_ROW_MAP: Record<string, number> = {
  "14": 0, "12": 1, "10": 2, "8": 3, "6": 4,
  "4": 5, "3": 6, "2": 7, "1": 8,
  "1/0": 9, "2/0": 10, "3/0": 11, "4/0": 12,
  "250": 14, "300": 15, "350": 16, "400": 17, "500": 18,
};

interface ChartRef {
  chartId: string;
  highlightRows?: number[];
  highlightCells?: [number, number][];
  note?: string;
}

function findChartRefs(question: any): ChartRef[] {
  const refs: ChartRef[] = [];
  const stem = (question.stem || "").toLowerCase();
  const codeSection = question.code_ref?.section || "";

  for (const [tableNum, chartId] of Object.entries(TABLE_MAPPINGS)) {
    if (
      codeSection.includes(tableNum) ||
      stem.includes(`table ${tableNum}`) ||
      stem.includes(`table${tableNum}`)
    ) {
      const ref: ChartRef = { chartId };

      // For Table 310.16, try to find conductor size and column
      if (chartId === "nec-310-16") {
        for (const [size, rowIdx] of Object.entries(CONDUCTOR_ROW_MAP)) {
          const sizePattern = new RegExp(`\\b${size.replace("/", "/")}\\s*(awg|kcmil)?\\b`, "i");
          if (sizePattern.test(stem)) {
            ref.highlightRows = [rowIdx];
            break;
          }
        }
      }

      refs.push(ref);
    }
  }

  return refs;
}

// Main
const raw = fs.readFileSync(QUESTIONS_PATH, "utf-8");
const questions = JSON.parse(raw);

let annotated = 0;
for (const q of questions) {
  const refs = findChartRefs(q);
  if (refs.length > 0) {
    q.chart_refs = refs;
    annotated++;
  }
}

fs.writeFileSync(QUESTIONS_PATH, JSON.stringify(questions, null, 2), "utf-8");
console.log(`Annotated ${annotated} of ${questions.length} questions with chart_refs`);
```

- [ ] **Step 2: Run the annotation script**

Run: `cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app" && npx tsx scripts/annotate-chart-refs.ts`
Expected: `Annotated ~200+ of 981 questions with chart_refs`

- [ ] **Step 3: Verify a few annotated questions**

Spot-check 5-10 questions to verify chart_refs look correct. Route through Ohm for full verification.

- [ ] **Step 4: Commit**

```bash
git add scripts/annotate-chart-refs.ts src/data/electrical-questions.json
git commit -m "feat: annotate electrical questions with chart_refs (auto + Ohm review)"
```

---

## Task 13: End-to-End Verification

- [ ] **Step 1: Run all tests**

Run: `cd "C:/Users/chris/OneDrive/Documentos/test prep app ManyTalentsMore/app" && npx jest --no-cache`
Expected: All tests PASS

- [ ] **Step 2: Test on web**

Run: `npx expo start --web`
- Start an electrical exam (Study mode)
- Navigate through questions until finding one with a ChartButton
- Tap "View Chart" — verify the chart opens in the side panel (web)
- Verify the table renders correctly with highlighted rows
- Verify notes (240.4(D), 110.14(C)) appear below the table
- Navigate to Home → Reference Library → verify all categories load
- Tap a chart in the library → verify it opens

- [ ] **Step 3: Test on mobile (optional — requires APK build)**

Run: `npx expo start` (with Expo Go on phone)
- Same flow as web but verify:
  - ChartModal slides up from bottom
  - Pinch-to-zoom works on tables
  - Modal closes on backdrop tap

- [ ] **Step 4: Commit final state**

```bash
git add -A
git commit -m "feat: chart reference system — complete Phase 1-3 (Tier 1 tables, components, annotations)"
```

---

## Future Tasks (Phases 4-5 — separate plan)

These are NOT part of this plan but documented for the next implementation cycle:

- **Tier 2 tables** (8 more: 110.26, 300.5, 450.3(B), 310.15(C)(1), 314.16(B), 220.54, 220.56, 430.248)
- **Tier 3 tables** (7 more)
- **Tier 1 diagrams** (grounding electrode, service entrance, motor branch circuit, OCPD flowchart)
- **Bookmark/Pin feature** in Reference Library
- **Charts for other trades** (plumber IPC tables, dietitian nutrition tables, etc.)
- **LibraryCardGrid** (web grid view with mini chart previews)
- **LibrarySearch** (search bar for reference library)
