# Chart Reference System Phase 2 — Full Table & Diagram Expansion

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the chart reference system by adding all Tier 2/3 NEC tables, verifying flagged Tier 1 data, building all 10 diagram components, and annotating remaining questions with chart_refs.

**Architecture:** Data files follow the existing `ChartDefinition` pattern in `app/src/data/charts/la-electrical/`. Each table is a standalone `.ts` file exporting a typed object. Diagrams are React components returning SVG markup in a new `diagrams/` subdirectory. The trade index and master registry are updated to include all new charts. Questions are annotated with `chart_refs` matching the existing 101-question pattern.

**Tech Stack:** TypeScript, Zod schemas, React Native SVG (diagrams), Expo Router

**Working Directory:** `C:\Users\chris\OneDrive\Documentos\test prep app ManyTalentsMore`

**Branch:** `feat/chart-reference-system` (already merged to master — work on a new branch `feat/chart-expansion`)

**Standard #23 Enforcement:** Every table data file MUST have values verified against the official 2023 NEC before merge. Ohm signs off on each file.

---

## File Map

### New Files — Tier 2 Tables (8 files)

| File | Responsibility |
|------|---------------|
| `app/src/data/charts/la-electrical/nec-110-26.ts` | Table 110.26(A)(1) — Working Space Requirements |
| `app/src/data/charts/la-electrical/nec-300-5.ts` | Table 300.5 — Minimum Cover Requirements |
| `app/src/data/charts/la-electrical/nec-450-3b.ts` | Table 450.3(B) — Transformer OCPD |
| `app/src/data/charts/la-electrical/nec-310-15c1.ts` | Table 310.15(C)(1) — Ambient Temp Correction Factors |
| `app/src/data/charts/la-electrical/nec-314-16b.ts` | Table 314.16(B) — Box Fill Volume per Conductor |
| `app/src/data/charts/la-electrical/nec-220-54.ts` | Table 220.54 — Dryer Demand Factors |
| `app/src/data/charts/la-electrical/nec-220-56.ts` | Table 220.56 — Kitchen Equipment Demand Factors |
| `app/src/data/charts/la-electrical/nec-430-248.ts` | Table 430.248 — FLC, Single-Phase Motors |

### New Files — Tier 3 Tables (7 files)

| File | Responsibility |
|------|---------------|
| `app/src/data/charts/la-electrical/nec-430-247.ts` | Table 430.247 — FLC, DC Motors |
| `app/src/data/charts/la-electrical/nec-ch9-t8.ts` | Chapter 9, Table 8 — Conductor Properties |
| `app/src/data/charts/la-electrical/nec-210-21b3.ts` | Table 210.21(B)(3) — Receptacle Ratings |
| `app/src/data/charts/la-electrical/nec-210-24.ts` | Table 210.24 — Branch-Circuit Requirements |
| `app/src/data/charts/la-electrical/nec-430-7b.ts` | Table 430.7(B) — Locked-Rotor Code Letters |
| `app/src/data/charts/la-electrical/nec-250-102c1.ts` | Table 250.102(C)(1) — Bonding Jumper Sizing |
| `app/src/data/charts/la-electrical/nec-430-72b.ts` | Table 430.72(B) — Motor Controller OCPD |

### New Files — Tier 1 Diagrams (4 files)

| File | Responsibility |
|------|---------------|
| `app/src/data/charts/la-electrical/diagrams/grounding-electrode-system.tsx` | SVG: Complete grounding electrode system per NEC 250.50 |
| `app/src/data/charts/la-electrical/diagrams/service-entrance-layout.tsx` | SVG: Service entrance single-line diagram |
| `app/src/data/charts/la-electrical/diagrams/motor-branch-circuit.tsx` | SVG: Motor branch circuit with all NEC 430 components |
| `app/src/data/charts/la-electrical/diagrams/ocpd-sizing-flowchart.tsx` | SVG: Branch circuit OCPD sizing decision tree |

### New Files — Tier 2 Diagrams (3 files)

| File | Responsibility |
|------|---------------|
| `app/src/data/charts/la-electrical/diagrams/gfci-afci-zones.tsx` | SVG: GFCI/AFCI protection location diagram |
| `app/src/data/charts/la-electrical/diagrams/conduit-fill-flowchart.tsx` | SVG: Step-by-step conduit fill calculation flow |
| `app/src/data/charts/la-electrical/diagrams/demand-factor-worksheet.tsx` | SVG: Residential demand factor calculation visual |

### New Files — Tier 3 Diagrams (3 files)

| File | Responsibility |
|------|---------------|
| `app/src/data/charts/la-electrical/diagrams/three-way-four-way-switch.tsx` | SVG: 3-way/4-way switch wiring |
| `app/src/data/charts/la-electrical/diagrams/delta-wye-transformer.tsx` | SVG: Delta-wye transformer connections |
| `app/src/data/charts/la-electrical/diagrams/parallel-conductors.tsx` | SVG: Parallel conductor installation |

### Modified Files

| File | Change |
|------|--------|
| `app/src/data/charts/la-electrical/index.ts` | Add imports + exports for all 15 new tables and 10 diagrams |
| `app/src/data/electrical-questions.json` | Add chart_refs to questions referencing new tables |
| `app/src/data/charts/la-electrical/nec-430-250.ts` | Fix any values Ohm flags during verification |
| `app/src/data/charts/la-electrical/nec-ch9-t4.ts` | Fix any values Ohm flags during verification |
| `app/src/data/charts/la-electrical/nec-ch9-t5.ts` | Fix any values Ohm flags during verification |

### New Files — Diagram Specs (Ohm creates these)

| File | Responsibility |
|------|---------------|
| `PKA/Team Inbox/ohm-diagram-specs.md` | Ohm's detailed specifications for all 10 diagrams |

---

## Task 1: Create Feature Branch

**Files:**
- None (git operation)

- [ ] **Step 1: Create and switch to the new feature branch**

```bash
cd "C:\Users\chris\OneDrive\Documentos\test prep app ManyTalentsMore"
git checkout master
git checkout -b feat/chart-expansion
```

- [ ] **Step 2: Verify branch**

Run: `git branch --show-current`
Expected: `feat/chart-expansion`

---

## Task 2: Ohm Verifies Flagged Tier 1 Tables (430.250, Ch9-T4, Ch9-T5)

**Files:**
- Modify: `app/src/data/charts/la-electrical/nec-430-250.ts`
- Modify: `app/src/data/charts/la-electrical/nec-ch9-t4.ts`
- Modify: `app/src/data/charts/la-electrical/nec-ch9-t5.ts`
- Output: `PKA/Team Inbox/ohm-tier1-verification.md`

**Context:** These 3 files have "VERIFY" footnotes and Ohm flagged concerns in his review. Ohm must cross-reference every value against the official 2023 NEC.

- [ ] **Step 1: Ohm reads all 3 data files**

Read the full contents of:
- `app/src/data/charts/la-electrical/nec-430-250.ts`
- `app/src/data/charts/la-electrical/nec-ch9-t4.ts`
- `app/src/data/charts/la-electrical/nec-ch9-t5.ts`

- [ ] **Step 2: Ohm creates verification report**

Ohm must verify EVERY value in each file against the 2023 NEC and produce a report at `PKA/Team Inbox/ohm-tier1-verification.md` with this format for each table:

```markdown
## Table [ID] Verification

| Row | Column | Current Value | NEC 2023 Value | Status |
|-----|--------|---------------|----------------|--------|
| ... | ...    | ...           | ...            | PASS/FAIL |

**Result:** X values checked, Y corrections needed.
**Corrections:** [list exact changes needed]
```

- [ ] **Step 3: Apply any corrections Ohm identifies**

For each FAIL in the verification report, update the corresponding data file with the correct NEC 2023 value. Remove the "VERIFY" and "IMPORTANT" footnotes from all three files once verified.

- [ ] **Step 4: Remove verification-pending footnotes**

In `nec-430-250.ts`, remove the footnote:
```
"IMPORTANT: Values in this table represent NEC standard reference values. Verify against the official 2023 NEC Table 430.250 before use in production exam prep content."
```

In `nec-ch9-t4.ts`, remove the footnote:
```
"VERIFY: All EMT internal diameter and area values should be confirmed against the official 2023 NEC Chapter 9 Table 4 before use in production."
```

In `nec-ch9-t5.ts`, remove the footnote:
```
"IMPORTANT: These values should be verified against official 2023 NEC Chapter 9 Table 5 before use in production exam prep content. Some values for larger sizes and less-common types may differ from the NEC table."
```

Also in `nec-430-250.ts`, remove the "Data Verification Notice" note:
```typescript
{
  label: "Data Verification Notice",
  text: "The 200V and 208V column values for larger HP ratings in this table are calculated from NEC formulas and should be verified against the official printed 2023 NEC Table 430.250.",
  severity: "info",
},
```

- [ ] **Step 5: Build to verify no TypeScript errors**

Run: `cd app && npx expo export --platform web 2>&1 | tail -5`
Expected: `Exported: dist` with no errors

- [ ] **Step 6: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-430-250.ts app/src/data/charts/la-electrical/nec-ch9-t4.ts app/src/data/charts/la-electrical/nec-ch9-t5.ts
git commit -m "fix: verify and correct Tier 1 NEC table values (430.250, Ch9-T4, Ch9-T5)

Ohm verified all values against 2023 NEC. Removed verification-pending footnotes.
Applied corrections per ohm-tier1-verification.md."
```

---

## Task 3: Build Tier 2 Table — 110.26(A)(1) Working Space

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-110-26.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec110_26: ChartDefinition = {
  id: "nec-110-26",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 110.26(A)(1)",
  subtitle:
    "Working Spaces — Minimum Clear Distances",
  category: "General",
  source: "2023 NEC (NFPA 70)",
  questionCount: 10,
  tier: "2",
  searchable: true,
  data: {
    columns: [
      { key: "voltage", header: "Nominal Voltage to Ground", align: "left", width: 1.4 },
      { key: "cond1", header: "Condition 1", subheader: "ft", align: "right" },
      { key: "cond2", header: "Condition 2", subheader: "ft", align: "right" },
      { key: "cond3", header: "Condition 3", subheader: "ft", align: "right" },
    ],
    rows: [
      { cells: ["0–150 V", "3", "3", "3"] },
      { cells: ["151–600 V", "3", "3.5", "4"] },
      { cells: ["601 V–2500 V", "3", "4", "5"] },
      { cells: ["2501 V–9000 V", "4", "5", "6"] },
      { cells: ["9001 V–25,000 V", "5", "6", "9"] },
      { cells: ["25,001 V–75 kV", "6", "8", "10"] },
      { cells: ["Above 75 kV", "8", "10", "12"] },
    ],
    footnotes: [
      "Working space shall not be less than 30 inches wide in front of the equipment or the width of the equipment, whichever is greater. Per 110.26(A)(2).",
      "Minimum headroom of working spaces about service equipment, switchgear, switchboards, panelboards, or motor control centers shall be 6 ft 6 in. Per 110.26(A)(3).",
    ],
    notes: [
      {
        label: "Three Conditions Explained",
        text: "Condition 1: Exposed live parts on ONE side, no grounded parts on the other. Condition 2: Exposed live parts on ONE side, grounded parts on the other (e.g., concrete wall). Condition 3: Exposed live parts on BOTH sides (most restrictive). Most exam questions test Condition 1 (3 ft for ≤600V) and Condition 2 (3.5 ft for 151–600V).",
        severity: "critical",
      },
      {
        label: "Common Exam Trap — 0–150V Same for All Conditions",
        text: "For 0–150V, ALL three conditions require 3 ft minimum. Candidates waste time trying to differentiate conditions at this voltage range.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Verify file compiles**

Run: `cd app && npx tsc --noEmit app/src/data/charts/la-electrical/nec-110-26.ts 2>&1 | grep "nec-110-26" || echo "No errors"`

- [ ] **Step 3: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-110-26.ts
git commit -m "feat: add NEC Table 110.26(A)(1) — working space requirements"
```

---

## Task 4: Build Tier 2 Table — 300.5 Minimum Cover

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-300-5.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec300_5: ChartDefinition = {
  id: "nec-300-5",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 300.5",
  subtitle: "Minimum Cover Requirements, 0 to 1000 Volts, Nominal, Burial in Inches",
  category: "Wiring Methods",
  source: "2023 NEC (NFPA 70)",
  questionCount: 10,
  tier: "2",
  searchable: true,
  data: {
    columnGroups: [
      { label: "", colSpan: 1 },
      { label: "Location of Wiring Method or Circuit", colSpan: 5 },
    ],
    columns: [
      { key: "method", header: "Wiring Method", align: "left", width: 2.0 },
      { key: "col1", header: "All Locations Not Specified Below", subheader: "inches", align: "right" },
      { key: "col2", header: "Under Buildings", subheader: "inches", align: "right" },
      { key: "col3", header: "Under Streets, Highways, Roads, Alleys, Driveways, Parking Lots", subheader: "inches", align: "right" },
      { key: "col4", header: "One- and Two-Family Dwelling Driveways & Outdoor Parking, Used Only for Dwelling Purposes", subheader: "inches", align: "right" },
      { key: "col5", header: "Under Airport Runways", subheader: "inches", align: "right" },
    ],
    rows: [
      { cells: ["Direct burial cables or conductors", "24", "0 (in raceway only)", "24", "18", "18"] },
      { cells: ["Rigid metal conduit (RMC) or intermediate metal conduit (IMC)", "6", "0 (in raceway only)", "24", "6", "24"] },
      { cells: ["Nonmetallic raceways listed for direct burial without concrete encasement, or other approved raceways", "18", "0 (in raceway only)", "24", "18", "18"] },
      { cells: ["Residential branch circuits rated 120V or less with GFCI protection and max 20A overcurrent protection", "12", "0 (in raceway only)", "24", "12", "18"] },
      { cells: ["Circuits for landscape lighting operating at ≤30V, installed with Type UF or in listed raceway", "6", "0 (in raceway only)", "24", "6", "18"] },
    ],
    footnotes: [
      "Cover is defined as the shortest distance measured between a point on the top surface of any direct-buried conductor, cable, conduit, or other raceway and the top surface of finished grade, concrete, or similar cover.",
      "Where solid rock prevents burial to required depth, wiring shall be installed in a metal or nonmetallic raceway permitted for direct burial and the raceway shall be covered by 2 inches of concrete extending down to rock.",
    ],
    notes: [
      {
        label: "RMC Gets the Shallowest Depth",
        text: "Rigid metal conduit (RMC) and intermediate metal conduit (IMC) require only 6 inches minimum cover in general locations and residential driveways. This is the most common exam answer. Direct burial cable needs 24 inches. Exam trap: candidates confuse RMC (6\") with PVC (18\").",
        severity: "critical",
      },
      {
        label: "Under Buildings = Raceway Required",
        text: "Under buildings, the cover is 0 inches — but ONLY because direct burial is not permitted there. All wiring under buildings must be in a raceway (conduit). The 0 means the raceway can be at the surface.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-300-5.ts
git commit -m "feat: add NEC Table 300.5 — minimum cover requirements"
```

---

## Task 5: Build Tier 2 Table — 450.3(B) Transformer OCPD

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-450-3b.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec450_3b: ChartDefinition = {
  id: "nec-450-3b",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 450.3(B)",
  subtitle:
    "Maximum Rating or Setting of Overcurrent Protection for Transformers — 1000 Volts, Nominal, or Less",
  category: "Equipment",
  source: "2023 NEC (NFPA 70)",
  questionCount: 10,
  tier: "2",
  searchable: true,
  data: {
    columnGroups: [
      { label: "", colSpan: 1 },
      { label: "Primary Protection", colSpan: 1 },
      { label: "Secondary Protection (required only for Primary and Secondary method)", colSpan: 1 },
    ],
    columns: [
      { key: "method", header: "Protection Method", align: "left", width: 2.0 },
      { key: "primary", header: "Primary OCPD Max", subheader: "% of rated current", align: "right" },
      { key: "secondary", header: "Secondary OCPD Max", subheader: "% of rated current", align: "right" },
    ],
    rows: [
      { cells: ["Currents of 9 amperes or more", null, null], isSectionHeader: true },
      { cells: ["Primary only protection", "125%", "Not required"] },
      { cells: ["Primary and secondary protection", "250%", "125%"] },
      { cells: ["Currents less than 9 amperes", null, null], isSectionHeader: true },
      { cells: ["Primary only protection", "167%", "Not required"] },
      { cells: ["Primary and secondary protection", "300%", "167%"] },
      { cells: ["Currents less than 2 amperes", null, null], isSectionHeader: true },
      { cells: ["Primary only protection", "300%", "Not required"] },
      { cells: ["Primary and secondary protection", "300%", "167%"] },
    ],
    footnotes: [
      "Where 125 percent of the rated primary current does not correspond to a standard ampere rating of a fuse or circuit breaker, the next higher standard rating permitted by 240.6(A) shall be permitted.",
      "Where secondary overcurrent protection is required, the secondary OCPD shall not exceed the value specified in this table.",
    ],
    notes: [
      {
        label: "125% Primary-Only Is the Default",
        text: "Most exam questions test the primary-only method: OCPD rated at 125% of primary full-load current. If 125% doesn't land on a standard OCPD size (per 240.6(A)), you can go to the next standard size up.",
        severity: "critical",
      },
      {
        label: "Primary + Secondary — 250% / 125%",
        text: "When both primary and secondary protection are provided, the primary can be up to 250% (much less restrictive). The secondary must then be ≤125%. This method is used when the primary-only device is too large to provide adequate protection.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-450-3b.ts
git commit -m "feat: add NEC Table 450.3(B) — transformer OCPD"
```

---

## Task 6: Build Tier 2 Table — 310.15(C)(1) Ambient Temp Correction

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-310-15c1.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec310_15c1: ChartDefinition = {
  id: "nec-310-15c1",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 310.15(C)(1)",
  subtitle: "Ambient Temperature Correction Factors Based on 30°C (86°F)",
  category: "Conductor & Ampacity",
  source: "2023 NEC (NFPA 70)",
  questionCount: 9,
  tier: "2",
  searchable: true,
  relatedCharts: ["nec-310-16"],
  data: {
    columns: [
      { key: "tempC", header: "Ambient Temp", subheader: "°C", align: "left", width: 1.0 },
      { key: "tempF", header: "Ambient Temp", subheader: "°F", align: "left", width: 1.0 },
      { key: "cf60", header: "60°C Rated", subheader: "Factor", align: "right" },
      { key: "cf75", header: "75°C Rated", subheader: "Factor", align: "right" },
      { key: "cf90", header: "90°C Rated", subheader: "Factor", align: "right" },
    ],
    rows: [
      { cells: ["10 or less", "50 or less", "1.29", "1.20", "1.15"] },
      { cells: ["11–15", "51–59", "1.22", "1.15", "1.12"] },
      { cells: ["16–20", "60–68", "1.15", "1.11", "1.08"] },
      { cells: ["21–25", "69–77", "1.08", "1.05", "1.04"] },
      { cells: ["26–30", "78–86", "1.00", "1.00", "1.00"] },
      { cells: ["31–35", "87–95", "0.91", "0.94", "0.96"] },
      { cells: ["36–40", "96–104", "0.82", "0.88", "0.91"] },
      { cells: ["41–45", "105–113", "0.71", "0.82", "0.87"] },
      { cells: ["46–50", "114–122", "0.58", "0.75", "0.82"] },
      { cells: ["51–55", "123–131", "0.41", "0.67", "0.76"] },
      { cells: ["56–60", "132–140", null, "0.58", "0.71"] },
      { cells: ["61–65", "141–149", null, "0.47", "0.65"] },
      { cells: ["66–70", "150–158", null, "0.33", "0.58"] },
      { cells: ["71–75", "159–167", null, null, "0.50"] },
      { cells: ["76–80", "168–176", null, null, "0.41"] },
      { cells: ["81–85", "177–185", null, null, "0.29"] },
    ],
    footnotes: [
      "For ambient temperatures above 30°C, multiply the allowable ampacity from Table 310.16 by the correction factor above.",
      "For ambient temperatures below 30°C, the correction factor is greater than 1.00, meaning higher ampacity is permitted.",
    ],
    notes: [
      {
        label: "26–30°C = 1.00 (No Correction)",
        text: "Table 310.16 ampacities are based on a 30°C ambient. If ambient is 26–30°C, the correction factor is 1.00 — no derating needed. This is the baseline.",
        severity: "info",
      },
      {
        label: "90°C Column — Start Here for Derating",
        text: "When derating is required (ambient temp > 30°C OR more than 3 conductors in raceway), start with the 90°C ampacity from Table 310.16, apply the correction factor, then verify the result does not exceed the 75°C column value (per 110.14(C) termination limits).",
        severity: "critical",
      },
      {
        label: "Stacking Derating Factors",
        text: "When BOTH ambient temperature correction AND conductor fill adjustment apply, multiply them together: Adjusted Ampacity = Base Ampacity (90°C) × Temp Factor × Fill Factor. The result must still not exceed the termination temperature rating.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-310-15c1.ts
git commit -m "feat: add NEC Table 310.15(C)(1) — ambient temp correction factors"
```

---

## Task 7: Build Tier 2 Table — 314.16(B) Box Fill Volume

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-314-16b.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec314_16b: ChartDefinition = {
  id: "nec-314-16b",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 314.16(B)",
  subtitle: "Volume Required per Conductor",
  category: "Conduit & Box Fill",
  source: "2023 NEC (NFPA 70)",
  questionCount: 7,
  tier: "2",
  searchable: true,
  data: {
    columns: [
      { key: "size", header: "Size of Conductor", subheader: "AWG", align: "left", width: 1.2 },
      { key: "volume", header: "Free Space Within Box", subheader: "in³", align: "right" },
    ],
    rows: [
      { cells: ["18", "1.50"] },
      { cells: ["16", "1.75"] },
      { cells: ["14", "2.00"] },
      { cells: ["12", "2.25"] },
      { cells: ["10", "2.50"] },
      { cells: ["8", "3.00"] },
      { cells: ["6", "5.00"] },
    ],
    notes: [
      {
        label: "Box Fill Counting Rules — 314.16(B)(1)–(B)(5)",
        text: "Each conductor = 1 volume. Each clamp assembly = 1 volume (largest conductor). Each device (switch/receptacle) = 2 volumes (largest conductor connected). ALL equipment grounding conductors combined = 1 volume (largest EGC). Each internal cable clamp = 1 volume (largest conductor).",
        severity: "critical",
      },
      {
        label: "Most Tested: 14 AWG = 2.00 in³, 12 AWG = 2.25 in³",
        text: "Most exam problems use 14 AWG (2.00 in³) or 12 AWG (2.25 in³). Example: A box with four 12 AWG conductors, one device, one clamp, and one EGC = (4 × 2.25) + (2 × 2.25) + (1 × 2.25) + (1 × 2.25) = 18.00 in³ minimum box volume.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-314-16b.ts
git commit -m "feat: add NEC Table 314.16(B) — box fill volume per conductor"
```

---

## Task 8: Build Tier 2 Table — 220.54 Dryer Demand Factors

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-220-54.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec220_54: ChartDefinition = {
  id: "nec-220-54",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 220.54",
  subtitle: "Demand Factors for Household Electric Dryers",
  category: "Demand Factor",
  source: "2023 NEC (NFPA 70)",
  questionCount: 7,
  tier: "2",
  searchable: true,
  relatedCharts: ["nec-220-55"],
  data: {
    columns: [
      { key: "num", header: "Number of Dryers", align: "left", width: 1.4 },
      { key: "demand", header: "Demand Factor", subheader: "%", align: "right" },
    ],
    rows: [
      { cells: ["1–4", "100%"] },
      { cells: ["5", "85%"] },
      { cells: ["6", "75%"] },
      { cells: ["7", "65%"] },
      { cells: ["8", "60%"] },
      { cells: ["9", "55%"] },
      { cells: ["10", "50%"] },
      { cells: ["11", "47%"] },
      { cells: ["12–13", "45%"] },
      { cells: ["14–19", "40%"] },
      { cells: ["20–24", "35%"] },
      { cells: ["25–29", "32.5%"] },
      { cells: ["30–34", "30%"] },
      { cells: ["35–39", "27.5%"] },
      { cells: ["40 and over", "25%"] },
    ],
    footnotes: [
      "The minimum load for each dryer shall be 5000 watts (5 kW) or the nameplate rating, whichever is larger. Per NEC 220.54.",
    ],
    notes: [
      {
        label: "5 kW Minimum Per Dryer",
        text: "Each dryer is a minimum 5,000 VA (5 kW) load, regardless of nameplate. If the dryer nameplate exceeds 5 kW, use the nameplate value. Apply the demand factor from this table to the total calculated dryer load.",
        severity: "critical",
      },
      {
        label: "1–4 Dryers = No Demand Reduction",
        text: "For 1 through 4 dryers, the demand factor is 100% — no reduction. This is the most common exam scenario (single-family dwelling with one dryer).",
        severity: "info",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-220-54.ts
git commit -m "feat: add NEC Table 220.54 — dryer demand factors"
```

---

## Task 9: Build Tier 2 Table — 220.56 Kitchen Equipment Demand

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-220-56.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec220_56: ChartDefinition = {
  id: "nec-220-56",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 220.56",
  subtitle: "Demand Factors for Kitchen Equipment — Other Than Dwelling Unit(s)",
  category: "Demand Factor",
  source: "2023 NEC (NFPA 70)",
  questionCount: 7,
  tier: "2",
  searchable: true,
  data: {
    columns: [
      { key: "num", header: "Number of Units of Equipment", align: "left", width: 1.4 },
      { key: "demand", header: "Demand Factor", subheader: "%", align: "right" },
    ],
    rows: [
      { cells: ["1", "100%"] },
      { cells: ["2", "100%"] },
      { cells: ["3", "90%"] },
      { cells: ["4", "80%"] },
      { cells: ["5", "70%"] },
      { cells: ["6 and over", "65%"] },
    ],
    notes: [
      {
        label: "Commercial Kitchen Only — Not Residential",
        text: "This table applies to commercial kitchen equipment (restaurants, cafeterias, institutional kitchens). For residential cooking equipment, use Table 220.55. Candidates frequently confuse the two.",
        severity: "critical",
      },
      {
        label: "Thermostatic Loads Only",
        text: "This demand factor applies only to thermostatically controlled or intermittent-use equipment. Continuously operating loads (exhaust fans, dishwashers) should be calculated at 100% regardless of the number of units.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-220-56.ts
git commit -m "feat: add NEC Table 220.56 — kitchen equipment demand factors"
```

---

## Task 10: Build Tier 2 Table — 430.248 Single-Phase Motor FLC

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-430-248.ts`

- [ ] **Step 1: Create the data file**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec430_248: ChartDefinition = {
  id: "nec-430-248",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 430.248",
  subtitle: "Full-Load Currents in Amperes, Single-Phase Alternating-Current Motors",
  category: "Motor",
  source: "2023 NEC (NFPA 70)",
  questionCount: 8,
  tier: "2",
  searchable: true,
  relatedCharts: ["nec-430-250", "nec-430-52"],
  data: {
    columns: [
      { key: "hp", header: "HP", align: "left", width: 1.0 },
      { key: "v115", header: "115 V", subheader: "Amps", align: "right" },
      { key: "v200", header: "200 V", subheader: "Amps", align: "right" },
      { key: "v208", header: "208 V", subheader: "Amps", align: "right" },
      { key: "v230", header: "230 V", subheader: "Amps", align: "right" },
    ],
    rows: [
      { cells: ["⅙", "4.4", "2.5", "2.4", "2.2"] },
      { cells: ["¼", "5.8", "3.3", "3.2", "2.9"] },
      { cells: ["⅓", "7.2", "4.1", "4.0", "3.6"] },
      { cells: ["½", "9.8", "5.6", "5.4", "4.9"] },
      { cells: ["¾", "13.8", "7.9", "7.6", "6.9"] },
      { cells: ["1", "16", "9.2", "8.8", "8.0"] },
      { cells: ["1½", "20", "11.5", "11.0", "10.0"] },
      { cells: ["2", "24", "13.8", "13.2", "12.0"] },
      { cells: ["3", "34", "19.6", "18.7", "17.0"] },
      { cells: ["5", "56", "32.2", "30.8", "28.0"] },
      { cells: ["7½", "80", "46.0", "44.0", "40.0"] },
      { cells: ["10", "100", "57.5", "55.0", "50.0"] },
    ],
    footnotes: [
      "The voltages listed are rated motor voltages. The listed currents are for motors running at usual speeds and with normal torque characteristics.",
      "For full-load currents of 208- and 200-volt motors, the preceding values shall be multiplied by 1.10 and 1.15, respectively.",
    ],
    notes: [
      {
        label: "Use Table Values for Sizing — Not Nameplate",
        text: "Per NEC 430.6(A)(1): for motor branch-circuit conductor sizing and OCPD selection, use the full-load current from this table — NOT the motor nameplate amperes. Nameplate FLA is used only for overload protection sizing (430.32).",
        severity: "critical",
      },
      {
        label: "Single-Phase — Very Common on LA Exam",
        text: "Single-phase motors (residential A/C condensers, well pumps, shop equipment) are extremely common on the Louisiana contractor exam. Key values at 230V: ½ HP = 4.9A, 1 HP = 8.0A, 2 HP = 12.0A, 5 HP = 28.0A, 10 HP = 50.0A.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add app/src/data/charts/la-electrical/nec-430-248.ts
git commit -m "feat: add NEC Table 430.248 — single-phase motor FLC"
```

---

## Task 11: Build All 7 Tier 3 Tables

**Files:**
- Create: `app/src/data/charts/la-electrical/nec-430-247.ts`
- Create: `app/src/data/charts/la-electrical/nec-ch9-t8.ts`
- Create: `app/src/data/charts/la-electrical/nec-210-21b3.ts`
- Create: `app/src/data/charts/la-electrical/nec-210-24.ts`
- Create: `app/src/data/charts/la-electrical/nec-430-7b.ts`
- Create: `app/src/data/charts/la-electrical/nec-250-102c1.ts`
- Create: `app/src/data/charts/la-electrical/nec-430-72b.ts`

Each file follows the exact same `ChartDefinition` pattern. All values must come from the 2023 NEC.

- [ ] **Step 1: Create nec-430-247.ts — FLC, DC Motors**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec430_247: ChartDefinition = {
  id: "nec-430-247",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 430.247",
  subtitle: "Full-Load Current in Amperes, Direct-Current Motors",
  category: "Motor",
  source: "2023 NEC (NFPA 70)",
  questionCount: 3,
  tier: "3",
  searchable: true,
  relatedCharts: ["nec-430-248", "nec-430-250", "nec-430-52"],
  data: {
    columns: [
      { key: "hp", header: "HP", align: "left", width: 1.0 },
      { key: "v90", header: "90 V", subheader: "Amps", align: "right" },
      { key: "v120", header: "120 V", subheader: "Amps", align: "right" },
      { key: "v180", header: "180 V", subheader: "Amps", align: "right" },
      { key: "v240", header: "240 V", subheader: "Amps", align: "right" },
      { key: "v500", header: "500 V", subheader: "Amps", align: "right" },
      { key: "v550", header: "550 V", subheader: "Amps", align: "right" },
    ],
    rows: [
      { cells: ["¼", "4.0", "3.1", "2.0", "1.6", null, null] },
      { cells: ["⅓", "5.2", "4.1", "2.6", "2.0", null, null] },
      { cells: ["½", "6.8", "5.4", "3.4", "2.7", null, null] },
      { cells: ["¾", "9.6", "7.6", "4.8", "3.8", null, null] },
      { cells: ["1", "12.2", "9.5", "6.1", "4.7", null, null] },
      { cells: ["1½", null, "13.2", null, "6.6", null, null] },
      { cells: ["2", null, "17", null, "8.5", null, null] },
      { cells: ["3", null, "25", null, "12.2", null, null] },
      { cells: ["5", null, "40", null, "20", null, null] },
      { cells: ["7½", null, "58", null, "29", "13.6", "12.2"] },
      { cells: ["10", null, "76", null, "38", "18", "16"] },
      { cells: ["15", null, null, null, "55", "27", "24"] },
      { cells: ["20", null, null, null, "72", "34", "31"] },
      { cells: ["25", null, null, null, "89", "43", "38"] },
      { cells: ["30", null, null, null, "106", "51", "46"] },
      { cells: ["40", null, null, null, "140", "67", "61"] },
      { cells: ["50", null, null, null, "173", "83", "75"] },
      { cells: ["60", null, null, null, null, "99", "90"] },
      { cells: ["75", null, null, null, null, "123", "111"] },
      { cells: ["100", null, null, null, null, "164", "148"] },
      { cells: ["125", null, null, null, null, "205", "185"] },
      { cells: ["150", null, null, null, null, "246", "222"] },
      { cells: ["200", null, null, null, null, "330", "294"] },
    ],
    notes: [
      {
        label: "DC Motors — Less Common but Still Tested",
        text: "DC motor questions are infrequent on the LA exam but do appear. The same rule applies: use TABLE values for conductor/OCPD sizing (430.6), not nameplate current.",
        severity: "info",
      },
    ],
  },
};
```

- [ ] **Step 2: Create nec-ch9-t8.ts — Conductor Properties**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const necCh9T8: ChartDefinition = {
  id: "nec-ch9-t8",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Chapter 9, Table 8",
  subtitle: "Conductor Properties",
  category: "Conductor & Ampacity",
  source: "2023 NEC (NFPA 70)",
  questionCount: 4,
  tier: "3",
  searchable: true,
  relatedCharts: ["nec-310-16"],
  data: {
    columnGroups: [
      { label: "", colSpan: 1 },
      { label: "Copper", colSpan: 3 },
      { label: "Aluminum", colSpan: 3 },
    ],
    columns: [
      { key: "size", header: "Size", subheader: "AWG/kcmil", align: "left", width: 1.0 },
      { key: "cuArea", header: "Area", subheader: "cmil", align: "right" },
      { key: "cuStrands", header: "Stranding", subheader: "Qty/Size", align: "right" },
      { key: "cuResist", header: "DC Resistance", subheader: "Ω/kFT @ 75°C", align: "right" },
      { key: "alArea", header: "Area", subheader: "cmil", align: "right" },
      { key: "alStrands", header: "Stranding", subheader: "Qty/Size", align: "right" },
      { key: "alResist", header: "DC Resistance", subheader: "Ω/kFT @ 75°C", align: "right" },
    ],
    rows: [
      { cells: ["18", "1620", "1/solid", "7.77", null, null, null] },
      { cells: ["16", "2580", "1/solid", "4.89", null, null, null] },
      { cells: ["14", "4110", "1/solid", "3.07", null, null, null] },
      { cells: ["12", "6530", "1/solid", "1.93", null, null, null] },
      { cells: ["10", "10380", "1/solid", "1.21", null, null, null] },
      { cells: ["8", "16510", "1/solid", "0.764", null, null, null] },
      { cells: ["6", "26240", "7", "0.491", "26240", "7", "0.808"] },
      { cells: ["4", "41740", "7", "0.308", "41740", "7", "0.508"] },
      { cells: ["3", "52620", "7", "0.245", "52620", "7", "0.403"] },
      { cells: ["2", "66360", "7", "0.194", "66360", "7", "0.319"] },
      { cells: ["1", "83690", "19", "0.154", "83690", "19", "0.253"] },
      { cells: ["1/0", "105600", "19", "0.122", "105600", "19", "0.201"] },
      { cells: ["2/0", "133100", "19", "0.0967", "133100", "19", "0.159"] },
      { cells: ["3/0", "167800", "19", "0.0766", "167800", "19", "0.126"] },
      { cells: ["4/0", "211600", "19", "0.0608", "211600", "19", "0.100"] },
      { cells: ["250", "250000", "37", "0.0515", "250000", "37", "0.0847"] },
      { cells: ["300", "300000", "37", "0.0429", "300000", "37", "0.0707"] },
      { cells: ["350", "350000", "37", "0.0367", "350000", "37", "0.0605"] },
      { cells: ["400", "400000", "37", "0.0321", "400000", "37", "0.0529"] },
      { cells: ["500", "500000", "37", "0.0258", "500000", "37", "0.0424"] },
    ],
    notes: [
      {
        label: "Used for Voltage Drop Calculations",
        text: "The DC resistance values from this table are used in voltage drop calculations: VD = 2 × L × I × R / 1000 (single-phase) or VD = 1.732 × L × I × R / 1000 (three-phase), where R is the resistance per kFT from this table.",
        severity: "critical",
      },
    ],
  },
};
```

- [ ] **Step 3: Create nec-210-21b3.ts — Receptacle Ratings**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec210_21b3: ChartDefinition = {
  id: "nec-210-21b3",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 210.21(B)(3)",
  subtitle: "Receptacle Ratings for Various Size Multioutlet Circuits",
  category: "Wiring & Protection",
  source: "2023 NEC (NFPA 70)",
  questionCount: 4,
  tier: "3",
  searchable: true,
  data: {
    columns: [
      { key: "circuit", header: "Circuit Rating", subheader: "Amperes", align: "left", width: 1.2 },
      { key: "receptacle", header: "Receptacle Rating", subheader: "Amperes", align: "right" },
    ],
    rows: [
      { cells: ["15", "Not over 15"] },
      { cells: ["20", "15 or 20"] },
      { cells: ["30", "30"] },
      { cells: ["40", "40 or 50"] },
      { cells: ["50", "50"] },
    ],
    notes: [
      {
        label: "20A Circuit Can Use 15A Receptacles",
        text: "On a 20A multioutlet branch circuit, both 15A and 20A receptacles are permitted. This is the most commonly tested row. On a 15A circuit, only 15A receptacles are allowed.",
        severity: "critical",
      },
    ],
  },
};
```

- [ ] **Step 4: Create nec-210-24.ts — Branch-Circuit Requirements Summary**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec210_24: ChartDefinition = {
  id: "nec-210-24",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 210.24",
  subtitle: "Summary of Branch-Circuit Requirements",
  category: "Wiring & Protection",
  source: "2023 NEC (NFPA 70)",
  questionCount: 3,
  tier: "3",
  searchable: true,
  data: {
    columns: [
      { key: "rating", header: "Circuit Rating", subheader: "Amperes", align: "left", width: 1.0 },
      { key: "conductor", header: "Min Conductor Size", subheader: "AWG (Cu)", align: "right" },
      { key: "ocpd", header: "Max OCPD", subheader: "Amperes", align: "right" },
      { key: "lamphold", header: "Lampholders", align: "right", width: 1.2 },
      { key: "receptacle", header: "Receptacle Rating", subheader: "Amperes", align: "right" },
    ],
    rows: [
      { cells: ["15", "14", "15", "Any type", "15 max"] },
      { cells: ["20", "12", "20", "Any type", "15 or 20"] },
      { cells: ["30", "10", "30", "Heavy duty", "30"] },
      { cells: ["40", "8", "40", "Heavy duty", "40 or 50"] },
      { cells: ["50", "6", "50", "Heavy duty", "50"] },
    ],
    notes: [
      {
        label: "Quick Reference — Conductor to OCPD Match",
        text: "This table summarizes the minimum conductor size for each branch-circuit rating: 15A=14 AWG, 20A=12 AWG, 30A=10 AWG, 40A=8 AWG, 50A=6 AWG. These match NEC 240.4(D) limits.",
        severity: "info",
      },
    ],
  },
};
```

- [ ] **Step 5: Create nec-430-7b.ts — Locked-Rotor Code Letters**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec430_7b: ChartDefinition = {
  id: "nec-430-7b",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 430.7(B)",
  subtitle: "Locked-Rotor Indicating Code Letters",
  category: "Motor",
  source: "2023 NEC (NFPA 70)",
  questionCount: 3,
  tier: "3",
  searchable: true,
  relatedCharts: ["nec-430-52"],
  data: {
    columns: [
      { key: "code", header: "Code Letter", align: "left", width: 1.0 },
      { key: "kva", header: "Kilovolt-Amperes per Horsepower with Locked Rotor", align: "right", width: 1.8 },
    ],
    rows: [
      { cells: ["A", "0 – 3.14"] },
      { cells: ["B", "3.15 – 3.54"] },
      { cells: ["C", "3.55 – 3.99"] },
      { cells: ["D", "4.0 – 4.49"] },
      { cells: ["E", "4.5 – 4.99"] },
      { cells: ["F", "5.0 – 5.59"] },
      { cells: ["G", "5.6 – 6.29"] },
      { cells: ["H", "6.3 – 7.09"] },
      { cells: ["J", "7.1 – 7.99"] },
      { cells: ["K", "8.0 – 8.99"] },
      { cells: ["L", "9.0 – 9.99"] },
      { cells: ["M", "10.0 – 11.19"] },
      { cells: ["N", "11.2 – 12.49"] },
      { cells: ["P", "12.5 – 13.99"] },
      { cells: ["R", "14.0 – 15.99"] },
      { cells: ["S", "16.0 – 17.99"] },
      { cells: ["T", "18.0 – 19.99"] },
      { cells: ["U", "20.0 – 22.39"] },
      { cells: ["V", "22.4 and up"] },
    ],
    footnotes: [
      "Note: Letters I and O are not used to avoid confusion with numbers 1 and 0.",
    ],
    notes: [
      {
        label: "Locked-Rotor Current Calculation",
        text: "To find locked-rotor current: LRA = (Code Letter kVA × HP × 1000) / (Voltage × 1.732) for 3-phase, or (Code Letter kVA × HP × 1000) / Voltage for single-phase. This is used for sizing instantaneous-trip breakers.",
        severity: "info",
      },
    ],
  },
};
```

- [ ] **Step 6: Create nec-250-102c1.ts — Bonding Jumper Sizing**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec250_102c1: ChartDefinition = {
  id: "nec-250-102c1",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 250.102(C)(1)",
  subtitle: "Grounded Conductor, Main Bonding Jumper, System Bonding Jumper, and Supply-Side Bonding Jumper for AC Systems",
  category: "Grounding & Bonding",
  source: "2023 NEC (NFPA 70)",
  questionCount: 5,
  tier: "3",
  searchable: true,
  relatedCharts: ["nec-250-66", "nec-250-122"],
  data: {
    columns: [
      { key: "service", header: "Size of Largest Ungrounded Service-Entrance Conductor or Equivalent Area for Parallel Conductors", subheader: "AWG/kcmil (Cu)", align: "left", width: 2.0 },
      { key: "cu", header: "Copper", subheader: "AWG/kcmil", align: "right" },
      { key: "al", header: "Aluminum or Copper-Clad Aluminum", subheader: "AWG/kcmil", align: "right" },
    ],
    rows: [
      { cells: ["2 or smaller", "8", "6"] },
      { cells: ["1 or 1/0", "6", "4"] },
      { cells: ["2/0 or 3/0", "4", "2"] },
      { cells: ["Over 3/0 through 350 kcmil", "2", "1/0"] },
      { cells: ["Over 350 kcmil through 600 kcmil", "1/0", "3/0"] },
      { cells: ["Over 600 kcmil through 1100 kcmil", "2/0", "4/0"] },
      { cells: ["Over 1100 kcmil", "12.5% of area of largest service-entrance conductor", "12.5% of area of largest service-entrance conductor"] },
    ],
    footnotes: [
      "Where service-entrance phase conductors are paralleled, the equivalent size for the purpose of this table shall be determined by the largest parallel conductor.",
    ],
    notes: [
      {
        label: "Not the Same as Table 250.66 or 250.122",
        text: "Table 250.102(C)(1) sizes bonding jumpers and grounded conductors based on SERVICE conductor size. Table 250.66 sizes grounding ELECTRODE conductors. Table 250.122 sizes equipment grounding conductors based on OCPD rating. Exam questions often test whether you know which table to use.",
        severity: "critical",
      },
      {
        label: "Over 1100 kcmil = 12.5% Rule",
        text: "For service conductors larger than 1100 kcmil, the bonding jumper must be at least 12.5% of the circular mil area of the largest service-entrance conductor.",
        severity: "warning",
      },
    ],
  },
};
```

- [ ] **Step 7: Create nec-430-72b.ts — Motor Controller OCPD**

```typescript
import { ChartDefinition } from "../../../types/chart";

export const nec430_72b: ChartDefinition = {
  id: "nec-430-72b",
  tradeId: "la-electrical",
  type: "table",
  title: "NEC Table 430.72(B)",
  subtitle: "Maximum Rating of Motor Branch-Circuit Protective Device for Motor Control Circuit Conductors",
  category: "Motor",
  source: "2023 NEC (NFPA 70)",
  questionCount: 2,
  tier: "3",
  searchable: true,
  relatedCharts: ["nec-430-52"],
  data: {
    columnGroups: [
      { label: "", colSpan: 1 },
      { label: "Maximum Rating of Protective Device (Amps)", colSpan: 2 },
    ],
    columns: [
      { key: "size", header: "Size of Control Circuit Conductor", subheader: "AWG", align: "left", width: 1.2 },
      { key: "col1", header: "Column A: Aluminum or Copper-Clad Aluminum", align: "right" },
      { key: "col2", header: "Column B: Copper", align: "right" },
    ],
    rows: [
      { cells: ["18", null, "7"] },
      { cells: ["16", null, "10"] },
      { cells: ["14", "7", "45"] },
      { cells: ["12", "12", "60"] },
      { cells: ["10", "20", "90"] },
    ],
    footnotes: [
      "Values in Column A apply where the motor branch-circuit protective device does not provide protection for the control circuit conductors.",
      "Values in Column B apply where the motor branch-circuit protective device provides protection for the control circuit conductors.",
    ],
    notes: [
      {
        label: "Column B — When Branch Circuit Protects Control Wiring",
        text: "Column B (higher values) applies when the motor branch-circuit OCPD also protects the control circuit conductors. This is the more common arrangement. Column A applies only when separate protection is used.",
        severity: "info",
      },
    ],
  },
};
```

- [ ] **Step 8: Verify all 7 files compile**

Run: `cd app && npx expo export --platform web 2>&1 | tail -5`

Note: These files won't be imported yet — just verifying they're valid TypeScript. They'll be registered in Task 12.

- [ ] **Step 9: Commit all 7 Tier 3 tables**

```bash
git add app/src/data/charts/la-electrical/nec-430-247.ts app/src/data/charts/la-electrical/nec-ch9-t8.ts app/src/data/charts/la-electrical/nec-210-21b3.ts app/src/data/charts/la-electrical/nec-210-24.ts app/src/data/charts/la-electrical/nec-430-7b.ts app/src/data/charts/la-electrical/nec-250-102c1.ts app/src/data/charts/la-electrical/nec-430-72b.ts
git commit -m "feat: add all 7 Tier 3 NEC tables (430.247, Ch9-T8, 210.21(B)(3), 210.24, 430.7(B), 250.102(C)(1), 430.72(B))"
```

---

## Task 12: Register All New Tables in Trade Index and Master Registry

**Files:**
- Modify: `app/src/data/charts/la-electrical/index.ts`

- [ ] **Step 1: Update the electrical trade index**

Replace the entire file with:

```typescript
import { ChartDefinition } from "../../../types/chart";

// Tier 1 tables (existing)
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

// Tier 2 tables (new)
import { nec110_26 } from "./nec-110-26";
import { nec300_5 } from "./nec-300-5";
import { nec450_3b } from "./nec-450-3b";
import { nec310_15c1 } from "./nec-310-15c1";
import { nec314_16b } from "./nec-314-16b";
import { nec220_54 } from "./nec-220-54";
import { nec220_56 } from "./nec-220-56";
import { nec430_248 } from "./nec-430-248";

// Tier 3 tables (new)
import { nec430_247 } from "./nec-430-247";
import { necCh9T8 } from "./nec-ch9-t8";
import { nec210_21b3 } from "./nec-210-21b3";
import { nec210_24 } from "./nec-210-24";
import { nec430_7b } from "./nec-430-7b";
import { nec250_102c1 } from "./nec-250-102c1";
import { nec430_72b } from "./nec-430-72b";

export const electricalCharts: ChartDefinition[] = [
  // Tier 1
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
  // Tier 2
  nec110_26,
  nec300_5,
  nec450_3b,
  nec310_15c1,
  nec314_16b,
  nec220_54,
  nec220_56,
  nec430_248,
  // Tier 3
  nec430_247,
  necCh9T8,
  nec210_21b3,
  nec210_24,
  nec430_7b,
  nec250_102c1,
  nec430_72b,
];
```

- [ ] **Step 2: Build to verify everything compiles**

Run: `cd app && npx expo export --platform web 2>&1 | tail -5`
Expected: `Exported: dist` — all 26 charts now registered

- [ ] **Step 3: Verify chart count**

Run: `cd app && node -e "const r=require('./src/data/charts/registry'); console.log('Total charts:', r.getAllCharts().length)"`
Expected: `Total charts: 26`

- [ ] **Step 4: Commit**

```bash
git add app/src/data/charts/la-electrical/index.ts
git commit -m "feat: register all 15 new tables in electrical chart index (26 total)"
```

---

## Task 13: Annotate Questions with chart_refs for New Tables

**Files:**
- Modify: `app/src/data/electrical-questions.json`

- [ ] **Step 1: Identify questions that reference new tables**

Run a script to find questions whose `code_ref.section` matches any of the new table section numbers:

```bash
cd app && node -e "
const q=require('./src/data/electrical-questions.json');
const sections=['110.26','300.5','450.3','310.15','314.16','220.54','220.56','430.248','430.247','210.21','210.24','430.7','250.102','430.72'];
const matches=q.filter(x=>!x.chart_refs && sections.some(s=>x.code_ref.section.includes(s)));
console.log('Questions to annotate:', matches.length);
matches.forEach(m=>console.log(m.id, '-', m.code_ref.section));
"
```

- [ ] **Step 2: Add chart_refs to each matching question**

For each question identified, add the appropriate `chart_refs` array. Match the pattern:

```json
{
  "chart_refs": [
    { "chartId": "nec-110-26" }
  ]
}
```

For questions that reference multiple tables (e.g., a motor question needing both 430.248 and 430.52), include both:

```json
{
  "chart_refs": [
    { "chartId": "nec-430-248" },
    { "chartId": "nec-430-52" }
  ]
}
```

- [ ] **Step 3: Verify all chart_refs resolve to real charts**

```bash
cd app && node -e "
const q=require('./src/data/electrical-questions.json');
const r=require('./src/data/charts/registry');
let bad=0;
q.forEach(x=>{
  if(x.chart_refs) x.chart_refs.forEach(ref=>{
    if(!r.getChart(ref.chartId)){console.log('BROKEN:',x.id,'->',ref.chartId);bad++}
  });
});
console.log(bad?bad+' broken refs':'All chart_refs resolve OK');
"
```
Expected: `All chart_refs resolve OK`

- [ ] **Step 4: Count total annotated questions**

```bash
cd app && node -e "const q=require('./src/data/electrical-questions.json'); console.log('With chart_refs:', q.filter(x=>x.chart_refs&&x.chart_refs.length).length, '/', q.length)"
```

- [ ] **Step 5: Build to verify**

Run: `cd app && npx expo export --platform web 2>&1 | tail -5`
Expected: Clean build

- [ ] **Step 6: Commit**

```bash
git add app/src/data/electrical-questions.json
git commit -m "feat: annotate questions with chart_refs for Tier 2/3 tables"
```

---

## Task 14: Ohm Creates Diagram Specifications

**Files:**
- Create: `PKA/Team Inbox/ohm-diagram-specs.md`

**Context:** Ohm must create detailed specifications for all 10 diagrams. Each spec tells Glass/Swift exactly what to draw, label, and connect. This is NEC-accuracy work — Ohm's domain.

- [ ] **Step 1: Ohm writes specs for all 10 diagrams**

For each diagram, the spec must include:
1. **What to show** — Every component, connection, and label
2. **NEC references** — Which sections each element comes from
3. **Layout** — Rough positioning (top-to-bottom flow, left-to-right, etc.)
4. **Highlight zones** — Which SVG element IDs should be highlightable from questions
5. **Colors** — Which elements get which colors (match app dark theme)
6. **Labels** — Exact text for every label, including NEC section numbers

**Diagram list:**

**Tier 1:**
1. Grounding Electrode System (NEC 250.50) — all electrode types bonded together
2. Service Entrance Single-Line (utility → meter → disconnect → panel → GEC)
3. Motor Branch Circuit (NEC 430) — disconnect, controller, OCPD, overload, conductors
4. OCPD Sizing Flowchart — decision tree for branch circuit sizing

**Tier 2:**
5. GFCI/AFCI Protection Zones — floor plan showing required locations per 210.8/210.12
6. Conduit Fill Calculation Flow — step-by-step visual workflow
7. Demand Factor Calculation Worksheet — residential service load calculation visual

**Tier 3:**
8. 3-Way/4-Way Switch Wiring — circuit diagrams
9. Delta-Wye Transformer Connections — connection diagrams
10. Parallel Conductor Installation — proper arrangement per 310.10(G)

- [ ] **Step 2: Save to Team Inbox**

Write the complete specifications to `PKA/Team Inbox/ohm-diagram-specs.md`.

- [ ] **Step 3: Commit**

```bash
cd PKA && git add "Team Inbox/ohm-diagram-specs.md"
git commit -m "docs: Ohm's diagram specifications for 10 NEC reference diagrams"
```

---

## Task 15: Build Tier 1 Diagram Components

**Files:**
- Create: `app/src/data/charts/la-electrical/diagrams/grounding-electrode-system.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/service-entrance-layout.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/motor-branch-circuit.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/ocpd-sizing-flowchart.tsx`

**Depends on:** Task 14 (Ohm's diagram specs)

Each diagram is a React component that returns SVG markup. The component accepts optional `highlightAreas` prop to highlight specific elements.

- [ ] **Step 1: Create the diagrams directory**

```bash
mkdir -p "app/src/data/charts/la-electrical/diagrams"
```

- [ ] **Step 2: Build grounding-electrode-system.tsx**

Follow Ohm's spec from `ohm-diagram-specs.md`. The component must:
- Show all grounding electrode types (metal water pipe, ground rods, Ufer, metal frame)
- Show bonding connections between all electrodes
- Label each element with NEC section numbers
- Support `highlightAreas` prop for question-specific highlighting
- Use app theme colors (dark bg, gold accents, white text)

```typescript
import React from "react";
import { View } from "react-native";
import Svg, { G, Rect, Line, Text as SvgText, Circle, Path } from "react-native-svg";

interface Props {
  highlightAreas?: string[];
  width?: number;
  height?: number;
}

export const GroundingElectrodeSystem: React.FC<Props> = ({
  highlightAreas = [],
  width = 600,
  height = 400,
}) => {
  const isHighlighted = (id: string) => highlightAreas.includes(id);
  const highlightColor = "#c9a84c";
  const normalColor = "#a09a8e";

  // Full SVG implementation per Ohm's spec goes here.
  // Each major element (water pipe, ground rod, Ufer, building steel)
  // is wrapped in a <G id="element-name"> for highlighting.
  return (
    <View>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Implementation per Ohm's diagram spec */}
      </Svg>
    </View>
  );
};

export default GroundingElectrodeSystem;
```

The actual SVG content will be built from Ohm's detailed spec. Each diagram will have 50-200 lines of SVG elements. The pattern above shows the component structure — the SVG content is filled in from Ohm's spec.

- [ ] **Step 3: Build service-entrance-layout.tsx** (same pattern)
- [ ] **Step 4: Build motor-branch-circuit.tsx** (same pattern)
- [ ] **Step 5: Build ocpd-sizing-flowchart.tsx** (same pattern)

- [ ] **Step 6: Create ChartDefinition entries for each diagram**

Add to `la-electrical/diagrams/index.ts`:

```typescript
import { ChartDefinition } from "../../../../types/chart";
import { GroundingElectrodeSystem } from "./grounding-electrode-system";
import { ServiceEntranceLayout } from "./service-entrance-layout";
import { MotorBranchCircuit } from "./motor-branch-circuit";
import { OcpdSizingFlowchart } from "./ocpd-sizing-flowchart";

export const diagramGroundingElectrode: ChartDefinition = {
  id: "diagram-grounding-electrode",
  tradeId: "la-electrical",
  type: "diagram",
  title: "Grounding Electrode System",
  subtitle: "Complete grounding electrode system per NEC 250.50",
  category: "Grounding & Bonding",
  source: "2023 NEC (NFPA 70)",
  questionCount: 0,
  tier: "1",
  searchable: true,
  relatedCharts: ["nec-250-66", "nec-250-122"],
  data: "grounding-electrode-system", // Diagram renderer looks up the component by this key
};

// Similar entries for the other 3 diagrams...
```

- [ ] **Step 7: Register diagrams in the electrical index**

Add diagram imports and entries to `la-electrical/index.ts`.

- [ ] **Step 8: Build and verify**

Run: `cd app && npx expo export --platform web 2>&1 | tail -5`

- [ ] **Step 9: Commit**

```bash
git add app/src/data/charts/la-electrical/diagrams/
git commit -m "feat: add Tier 1 NEC diagrams (grounding, service entrance, motor, OCPD flowchart)"
```

---

## Task 16: Build Tier 2 + Tier 3 Diagram Components

**Files:**
- Create: `app/src/data/charts/la-electrical/diagrams/gfci-afci-zones.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/conduit-fill-flowchart.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/demand-factor-worksheet.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/three-way-four-way-switch.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/delta-wye-transformer.tsx`
- Create: `app/src/data/charts/la-electrical/diagrams/parallel-conductors.tsx`

**Depends on:** Task 14 (Ohm's diagram specs)

- [ ] **Step 1: Build all 6 remaining diagram components** (same pattern as Task 15)
- [ ] **Step 2: Create ChartDefinition entries for each**
- [ ] **Step 3: Register in electrical index**
- [ ] **Step 4: Build and verify**
- [ ] **Step 5: Commit**

```bash
git add app/src/data/charts/la-electrical/diagrams/
git commit -m "feat: add Tier 2/3 NEC diagrams (GFCI/AFCI, conduit fill, demand factor, switches, transformers, parallel)"
```

---

## Task 17: Final Build, Test, and Merge

**Files:**
- None new (verification only)

- [ ] **Step 1: Full web build**

```bash
cd app && npx expo export --platform web 2>&1 | tail -10
```
Expected: Clean build, all routes including `/reference-library`

- [ ] **Step 2: Run test suite**

```bash
cd app && npx jest --passWithNoTests 2>&1 | tail -10
```
Expected: chart.test.ts passes, no new failures

- [ ] **Step 3: Verify chart count**

```bash
cd app && node -e "
const r=require('./src/data/charts/registry');
const all=r.getAllCharts();
console.log('Total charts:', all.length);
const byTier={1:0,2:0,3:0};
all.forEach(c=>byTier[c.tier]++);
console.log('Tier 1:', byTier[1], '| Tier 2:', byTier[2], '| Tier 3:', byTier[3]);
const tables=all.filter(c=>c.type==='table').length;
const diagrams=all.filter(c=>c.type==='diagram').length;
console.log('Tables:', tables, '| Diagrams:', diagrams);
"
```
Expected: `Total charts: 36` (26 tables + 10 diagrams), `Tier 1: 15 | Tier 2: 11 | Tier 3: 10`

- [ ] **Step 4: Verify question annotation coverage**

```bash
cd app && node -e "
const q=require('./src/data/electrical-questions.json');
const withRefs=q.filter(x=>x.chart_refs&&x.chart_refs.length);
console.log('Questions with chart_refs:', withRefs.length, '/', q.length);
"
```

- [ ] **Step 5: Merge to master**

```bash
cd "C:\Users\chris\OneDrive\Documentos\test prep app ManyTalentsMore"
git checkout master
git merge feat/chart-expansion
```

- [ ] **Step 6: Verify merge**

```bash
git log --oneline -10
```

---

## Execution Summary

| Phase | Tasks | What Ships |
|-------|-------|------------|
| Tier 1 Verification | Task 2 | 3 flagged tables verified/corrected |
| Tier 2 Tables | Tasks 3–10 | 8 new NEC tables |
| Tier 3 Tables | Task 11 | 7 new NEC tables |
| Registry Update | Task 12 | All 26 tables registered and loadable |
| Question Annotation | Task 13 | Additional questions linked to new tables |
| Diagram Specs | Task 14 | Ohm's 10 diagram specifications |
| Tier 1 Diagrams | Task 15 | 4 SVG diagram components |
| Tier 2/3 Diagrams | Task 16 | 6 SVG diagram components |
| Merge | Task 17 | Everything on master |

**Total new charts:** 15 tables + 10 diagrams = 25 new charts
**Total charts after merge:** 26 tables + 10 diagrams = 36 charts
**Standard #23 applies:** Every table value verified against 2023 NEC by Ohm before merge.
