# Plan: Gantt zoom, panning, dependency arrows, child beads

Epic: gin-console-38i
Spec: `docs/changes/gin-console-38i-gantt-zoom/` (`01-proposal.md`, `02-spec-delta.md`, `03-design.md`, `05-tests.md`)
Mockup: https://claude.ai/artifact/FVdt4bqMsyWdPUDg2p2Dd4 (version 3)

## Objective
The milestone Gantt fits its days to the chart width, zooms to `1 week`, `2 weeks` or `Whole milestone` (kept in the URL as `zoom`), pans by mouse drag, swipe, trackpad and ‹ ›, shows readable epic rows, draws dependency arrows with a chain highlight, and expands an epic into its child beads.

**Goal:** every scenario of REQ-MILESTONE-UI-011 to -015 has a passing vitest case named with its REQ-ID, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass, and TC-1 and TC-2 of `05-tests.md` pass by hand.

**Architecture:** frontend `milestones` feature only (`03-design.md`).
- `gantt.ts`: pure layout and graph logic (`Zoom`, `zoomOf`, `spanOf`, `mondayOf`, `boundsOf`, `axisOf(plan, dayWidth, zoom)`, `fitDayWidth`, `dayAt`, `openingDay`, `stepDay`, `rowsOf`, `dependencyArrows`, `chainOf`, `childrenOf`).
- `usePan.ts` (new): mouse drag on the scroller, 4 px threshold, swallows the click that ends a drag.
- `GanttChart.tsx`: rewritten around those functions: measured width, zoom toolbar and pager, two-line labels, SVG arrows, child rows.
- `GanttTab.tsx` loads the project's beads (`useBeads(project, true)`); `MilestonePage.tsx` and `api.ts` carry `zoom` in the URL.

**Tech Stack:** React 19, TypeScript, Tailwind 4, shadcn/base-ui `Button`, lucide icons, vitest and Testing Library (jsdom). No new dependency, no backend change.

**Global Constraints (verbatim from the spec):**
- Dragging bars to change dates, or any other change to the plan (the console is read-only).
- Free zoom levels (a slider, Ctrl+wheel) or selecting a range on the axis. Decided 2026-11-01 (user): presets.
- Planned dates or bars for child beads: gin-workflow schedules epics only. Marks at a child's closing date. Decided 2026-11-01 (user): list only.
- Grandchildren, and keeping expanded epics or the scroll position in the URL.
- Changes to gin-workflow, the milestones API, or the beads API.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- Problem statement: the Gantt draws every day at 20 or 28 px over the whole plan, so a short milestone leaves most of the chart empty and a long one cannot be narrowed; beads are 16 px high, labels wrap, `depends_on` is not drawn, and child beads are invisible.
- Success criteria: the scenarios of REQ-MILESTONE-UI-011 to -015 pass as vitest cases; on `gin-workflow-8w27`, `Whole milestone` fills the width, `gin-workflow-dura` has an arrow from `gin-workflow-rm-cost-control`, and expanding `gin-workflow-rm-cost-control` lists its four closed tracks (TC-1, TC-2).
- Constraints: read-only (ADR-0001); jsdom has no layout, `ResizeObserver`, `scrollTo` or `setPointerCapture`, so the chart falls back to a 960 px width and plain `scrollLeft` there; `eslint-plugin-react-hooks` 7 forbids a synchronous `setState` in `useEffect` (allowed in `useLayoutEffect`); Linux, macOS and Windows browsers.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: Fit-to-width axis in one scroller, pure layout in `gantt.ts`
- Summary: compute a day width that fills the measured chart for the zoom's span, draw the whole plan at that width in the existing sideways scroller, and derive the days in view from `scrollLeft`. Rows get fixed heights so an SVG layer can draw arrows from computed row tops.
- Pros: one scroller serves zoom, drag, swipe and trackpad; geometry is testable without layout; the existing sticky label and lines keep working.
- Cons: the chart redraws on resize; arrow positions depend on fixed row heights, so labels must not wrap.

### Option 2: Window the axis to the days in view
- Summary: draw only the 7 or 14 days in view and redraw on each ‹ ›.
- Pros: fewer DOM nodes for long milestones.
- Cons: no native swipe or trackpad scrolling, no smooth drag; arrows to epics outside the window need clipping rules.

### Recommended Approach
- Selected option: Option 1, as confirmed in discuss (`03-design.md`).
- Rationale: native scrolling covers touch and trackpads for free; the code below was built and checked against the real `gin-workflow-8w27` plan in a scratch worktree (458 tests, typecheck, lint and build pass; screenshots at 1440 px and 390 px).

## Scope
- In scope: the files below in `frontend/src/features/milestones/`, and the evidence of TC-1 and TC-2 in `05-tests.md`.
- Out of scope: the backend, gin-workflow, the Graph tab, the milestones list page, the living specs (updated at archive).

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Track 2 imports the functions of Track 1 and Track 3 checks Track 2 in a browser, so the tracks run one after another.
```

## Tasks

### Track 1: Gantt layout and dependency logic
- **Dependencies**: none
- **Requirements**: REQ-MILESTONE-UI-011, REQ-MILESTONE-UI-012, REQ-MILESTONE-UI-014, REQ-MILESTONE-UI-015
- **Files**:
  - Modify `frontend/src/features/milestones/gantt.ts:1-3,18-38` (import `BeadSummary`; split `boundsOf` out of `axisOf`; `axisOf` takes `zoom`) and append after `periodOf` (line 103)
  - Test `frontend/src/features/milestones/gantt.test.ts:1-3` (imports) and new cases before the final `});`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** pure functions with the exact code and tests given below; no layout, no React.
- **Acceptance criteria**: the new `gantt.test.ts` cases (REQ-MILESTONE-UI-011, -012, -014, -015) and the existing ones pass; `pnpm -C frontend typecheck` and `pnpm -C frontend lint` pass. `axisOf(plan, dayWidth)` without `zoom` draws exactly what it drew before.
- **Estimated complexity**: low

**Interfaces produced** (consumed by Track 2):
```ts
export type Zoom = "1w" | "2w" | "all";
export const zoomOf: (param: string | null) => Zoom;
export const spanOf: (zoom: Zoom) => number | null;           // 7, 14, or null for the whole milestone
export const mondayOf: (day: number) => number;
export function boundsOf(plan: MilestoneDetail): { first: number; last: number };
export function axisOf(plan: MilestoneDetail, dayWidth: number, zoom?: Zoom): Axis;
export function fitDayWidth(first: number, last: number, width: number, floor: number): number;
export const dayAt: (axis: Axis, x: number) => number;
export function openingDay(plan: MilestoneDetail, axis: Axis): number;
export function stepDay(axis: Axis, from: number, direction: 1 | -1, span: number): number;
export const ROW_HEIGHT = 56, WARNING_HEIGHT = 18, CHILD_HEIGHT = 36, BAR_TOP = 16, BEAD_HEIGHT = 24;
export type Row = { kind: "epic"; epic: EpicPlan; top: number; height: number } | { kind: "child"; epic: EpicPlan; bead: BeadSummary; top: number; height: number };
export function rowsOf(epics: readonly EpicPlan[], today: string, expanded: ReadonlySet<string>, children: ReadonlyMap<string, readonly BeadSummary[]>): Row[];
export type Arrow = { from: string; to: string; path: string; late: boolean };
export function dependencyArrows(rows: readonly Row[], axis: Axis): Arrow[];
export function chainOf(epics: readonly EpicPlan[], id: string): Set<string>;
export function childrenOf(beads: readonly BeadSummary[]): Map<string, BeadSummary[]>;
```

- [ ] **Step 1: Write the failing tests.** Apply this diff to `frontend/src/features/milestones/gantt.test.ts` (save it to a file and run `git apply <file>` from the repo root, or edit by hand):

```diff
diff --git a/frontend/src/features/milestones/gantt.test.ts b/frontend/src/features/milestones/gantt.test.ts
index 08b7711..9a6647d 100644
--- a/frontend/src/features/milestones/gantt.test.ts
+++ b/frontend/src/features/milestones/gantt.test.ts
@@ -1,5 +1,26 @@
 import { describe, expect, it } from "vitest";
-import { axisOf, beadsOf, dayOf, endOf, isoOf, middleOf, monthsOf, sortEpics, warningLines, xOf } from "./gantt";
+import { bead } from "@/features/beads/beadFixtures";
+import {
+  axisOf,
+  beadsOf,
+  chainOf,
+  childrenOf,
+  dayAt,
+  dayOf,
+  dependencyArrows,
+  endOf,
+  fitDayWidth,
+  isoOf,
+  middleOf,
+  monthsOf,
+  openingDay,
+  rowsOf,
+  sortEpics,
+  stepDay,
+  warningLines,
+  xOf,
+  zoomOf,
+} from "./gantt";
 import { detail, epicPlan } from "./milestoneFixtures";
 
 const days = (epic: Parameters<typeof beadsOf>[0]) => beadsOf(epic).map(isoOf);
@@ -76,4 +97,109 @@ describe("gantt", () => {
     expect(monthsOf(axisOf(plan, 28), "2026-10-29").map((m) => m.label)).toEqual(["Oct", "Nov"]);
     expect(sortEpics(plan.epics).map((e) => e.id)).toEqual(["a", "b"]);
   });
+
+  it("REQ-MILESTONE-UI-011 zoom from the URL; anything else is the whole milestone", () => {
+    expect([zoomOf("1w"), zoomOf("2w"), zoomOf(null), zoomOf("3w")]).toEqual(["1w", "2w", "all", "all"]);
+  });
+
+  it("REQ-MILESTONE-UI-011 days fill the width, weekends narrow, never under the floor", () => {
+    const [mon, sun] = [dayOf("2026-11-02"), dayOf("2026-11-08")];
+    expect(fitDayWidth(mon, sun, 660, 24)).toBe((660 - 2 * 8) / 5);
+    expect(fitDayWidth(mon, dayOf("2026-11-06"), 660, 14)).toBe(132);
+    expect(fitDayWidth(mon, mon + 69, 660, 14)).toBe(14);
+    expect(fitDayWidth(dayOf("2026-11-07"), sun, 660, 24)).toBe(24);
+  });
+
+  it("REQ-MILESTONE-UI-011 a zoomed axis covers whole Monday-to-Sunday weeks", () => {
+    const plan = detail([epicPlan("a", { planned_start: "2026-11-04", planned_end: "2026-11-11" })], {
+      start: "2026-11-04",
+      schedule_start: "2026-11-04",
+      end: "2026-11-11",
+      finish: "2026-11-11",
+    });
+    expect([isoOf(axisOf(plan, 28).first), isoOf(axisOf(plan, 28).last)]).toEqual(["2026-11-04", "2026-11-11"]);
+    const zoomed = axisOf(plan, 28, "1w");
+    expect([isoOf(zoomed.first), isoOf(zoomed.last)]).toEqual(["2026-11-02", "2026-11-15"]);
+    expect(isoOf(dayAt(zoomed, xOf(zoomed, dayOf("2026-11-09")) + 0.5))).toBe("2026-11-09");
+    expect(isoOf(dayAt(zoomed, 1e6))).toBe("2026-11-15");
+  });
+
+  it("REQ-MILESTONE-UI-011 opens on the Monday of today's week, or of the plan's first day", () => {
+    const long = detail([epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-27" })], {
+      end: "2026-11-27",
+      finish: "2026-11-27",
+      today: "2026-11-11",
+    });
+    expect(isoOf(openingDay(long, axisOf(long, 28, "2w")))).toBe("2026-11-09");
+    const later = detail([epicPlan("a", { planned_start: "2026-11-04", planned_end: "2026-11-06" })], {
+      start: "2026-11-04",
+      schedule_start: "2026-11-04",
+      finish: "2026-11-06",
+      today: "2026-10-29",
+    });
+    expect(isoOf(openingDay(later, axisOf(later, 28, "1w")))).toBe("2026-11-02");
+  });
+
+  it("REQ-MILESTONE-UI-012 steps snap to Monday and stay on the axis", () => {
+    const plan = detail([epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-27" })], { end: "2026-11-27", finish: "2026-11-27" });
+    const axis = axisOf(plan, 28, "2w"); // 2026-11-02 to 2026-11-29
+    const step = (from: string, direction: 1 | -1, span: number) => isoOf(stepDay(axis, dayOf(from), direction, span));
+    expect(step("2026-11-02", 1, 14)).toBe("2026-11-16");
+    expect(step("2026-11-11", 1, 7)).toBe("2026-11-16");
+    expect(step("2026-11-11", -1, 7)).toBe("2026-11-09");
+    expect(step("2026-11-16", -1, 14)).toBe("2026-11-02");
+    expect(step("2026-11-09", -1, 14)).toBe("2026-11-02");
+    expect(step("2026-11-23", 1, 14)).toBe("2026-11-29");
+  });
+
+  it("REQ-MILESTONE-UI-014 arrows between epics of the milestone only, late in the blocked color", () => {
+    const epics = [
+      epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-02" }),
+      epicPlan("b", { planned_start: "2026-11-03", planned_end: "2026-11-03", depends_on: ["a", "x"] }),
+      epicPlan("c", { planned_start: "2026-11-09", planned_end: "2026-11-09", depends_on: ["a"] }),
+      epicPlan("d", { planned_start: "2026-11-09", planned_end: "2026-11-09", depends_on: ["c"] }),
+    ];
+    const axis = axisOf(detail(epics), 28);
+    const arrows = dependencyArrows(rowsOf(epics, "2026-10-29", new Set(), new Map()), axis);
+    expect(arrows).toEqual([
+      { from: "a", to: "b", path: "M25 28 H28 V56 H20 V84 H31", late: false },
+      { from: "a", to: "c", path: "M25 28 H28 V140 H159", late: false },
+      { from: "c", to: "d", path: "M181 140 H184 V168 H148 V196 H159", late: true },
+    ]);
+  });
+
+  it("REQ-MILESTONE-UI-014 arrows follow rows moved by warnings and expanded children", () => {
+    const epics = [
+      epicPlan("a", { planned_start: "2026-11-02", planned_end: "2026-11-02", warnings: [{ code: "unestimated", days: null }] }),
+      epicPlan("b", { planned_start: "2026-11-09", planned_end: "2026-11-09", depends_on: ["a"] }),
+    ];
+    const children = new Map([["a", [bead("a.1"), bead("a.2")]]]);
+    const rows = rowsOf(epics, "2026-10-29", new Set(["a"]), children);
+    expect(rows.map((r) => [r.kind, r.top, r.height])).toEqual([
+      ["epic", 0, 74],
+      ["child", 74, 36],
+      ["child", 110, 36],
+      ["epic", 146, 56],
+    ]);
+    expect(dependencyArrows(rows, axisOf(detail(epics), 28))[0].path).toBe("M25 28 H28 V174 H159");
+  });
+
+  it("REQ-MILESTONE-UI-014 the chain runs upstream and downstream, not to siblings", () => {
+    const epics = [
+      epicPlan("a"),
+      epicPlan("b", { depends_on: ["a"] }),
+      epicPlan("c", { depends_on: ["b", "x"] }),
+      epicPlan("d"),
+      epicPlan("e", { depends_on: ["a"] }),
+    ];
+    expect([...chainOf(epics, "b")].sort()).toEqual(["a", "b", "c"]);
+    expect([...chainOf(epics, "a")].sort()).toEqual(["a", "b", "c", "e"]);
+    expect([...chainOf(epics, "d")]).toEqual(["d"]);
+  });
+
+  it("REQ-MILESTONE-UI-015 children by parent, ordered by id", () => {
+    const byParent = childrenOf([bead("e.10", { parent: "e" }), bead("e.2", { parent: "e" }), bead("f.1", { parent: "f" }), bead("g")]);
+    expect(byParent.get("e")?.map((b) => b.id)).toEqual(["e.2", "e.10"]);
+    expect([...byParent.keys()].sort()).toEqual(["e", "f"]);
+  });
 });
```

- [ ] **Step 2: Run them.** `pnpm -C frontend test --run src/features/milestones/gantt.test.ts`. Expected: fails to compile or import (`zoomOf`, `fitDayWidth`, … are not exported).

- [ ] **Step 3: Implement.** Apply this diff to `frontend/src/features/milestones/gantt.ts`:

```diff
diff --git a/frontend/src/features/milestones/gantt.ts b/frontend/src/features/milestones/gantt.ts
index a329405..c13e7eb 100644
--- a/frontend/src/features/milestones/gantt.ts
+++ b/frontend/src/features/milestones/gantt.ts
@@ -1,3 +1,4 @@
+import type { BeadSummary } from "@/features/beads/api";
 import type { EpicPlan, MilestoneDetail } from "./api";
 import { monthName, shortDate, utcOf } from "./format";
 
@@ -15,8 +16,8 @@ export const isWeekend = (day: number) => {
 export type Column = { day: number; iso: string; weekend: boolean; x: number; width: number };
 export type Axis = { first: number; last: number; columns: Column[]; width: number };
 
-/** One column per calendar day over the milestone, its schedule and every epic; weekend columns are narrow. */
-export function axisOf(plan: MilestoneDetail, dayWidth: number): Axis {
+/** The first and last day of the milestone, its schedule and every epic. */
+export function boundsOf(plan: MilestoneDetail): { first: number; last: number } {
   const days = [
     plan.schedule_start,
     plan.start,
@@ -24,8 +25,14 @@ export function axisOf(plan: MilestoneDetail, dayWidth: number): Axis {
     ...(plan.finish === null ? [] : [plan.finish]),
     ...plan.epics.flatMap((e) => [e.planned_start, e.planned_end]),
   ].map(dayOf);
-  const first = Math.min(...days);
-  const last = Math.max(...days);
+  return { first: Math.min(...days), last: Math.max(...days) };
+}
+
+/** One column per calendar day over `boundsOf(plan)`, widened to whole Monday–Sunday weeks when zoomed; weekend columns are narrow. */
+export function axisOf(plan: MilestoneDetail, dayWidth: number, zoom: Zoom = "all"): Axis {
+  const bounds = boundsOf(plan);
+  const first = zoom === "all" ? bounds.first : mondayOf(bounds.first);
+  const last = zoom === "all" ? bounds.last : mondayOf(bounds.last) + 6;
   const columns: Column[] = [];
   let x = 0;
   for (let day = first; day <= last; day += 1) {
@@ -100,3 +107,117 @@ export function warningLines(epic: EpicPlan, today: string): string[] {
 
 export const periodOf = (from: string, to: string, today: string) =>
   from === to ? shortDate(from, today) : `${shortDate(from, today)} – ${shortDate(to, today)}`;
+
+/** REQ-MILESTONE-UI-011: the zoom modes; any other URL value shows the whole milestone. */
+export type Zoom = "1w" | "2w" | "all";
+export const zoomOf = (param: string | null): Zoom => (param === "1w" || param === "2w" ? param : "all");
+/** Calendar days in view for a zoomed mode; null for the whole milestone. */
+export const spanOf = (zoom: Zoom): number | null => (zoom === "1w" ? 7 : zoom === "2w" ? 14 : null);
+export const mondayOf = (day: number) => day - ((new Date(day * DAY_MS).getUTCDay() + 6) % 7);
+
+/** Working days share what the weekend columns leave of `width`, never narrower than `floor`. */
+export function fitDayWidth(first: number, last: number, width: number, floor: number): number {
+  let working = 0;
+  let weekends = 0;
+  for (let day = first; day <= last; day += 1) {
+    if (isWeekend(day)) weekends += 1;
+    else working += 1;
+  }
+  return working === 0 ? floor : Math.max(floor, (width - weekends * WEEKEND_WIDTH) / working);
+}
+
+/** The day whose column holds `x`; the last day past the end. */
+export const dayAt = (axis: Axis, x: number) => axis.columns.find((c) => x < c.x + c.width)?.day ?? axis.last;
+
+/** REQ-MILESTONE-UI-011: the Monday of today's week when today is in the plan, else of the plan's first day. */
+export function openingDay(plan: MilestoneDetail, axis: Axis): number {
+  const { first, last } = boundsOf(plan);
+  const today = dayOf(plan.today);
+  return Math.max(axis.first, mondayOf(today >= first && today <= last ? today : first));
+}
+
+/** REQ-MILESTONE-UI-012: the Monday `span` days after, or the Monday at or `span` days before, `from`, kept on the axis. */
+export function stepDay(axis: Axis, from: number, direction: 1 | -1, span: number): number {
+  const monday = mondayOf(from);
+  const next = direction === 1 ? monday + span : monday === from ? monday - span : monday;
+  return Math.min(Math.max(next, axis.first), axis.last);
+}
+
+export const ROW_HEIGHT = 56;
+export const WARNING_HEIGHT = 18;
+export const CHILD_HEIGHT = 36;
+export const BAR_TOP = 16;
+export const BEAD_HEIGHT = 24;
+
+export type Row =
+  | { kind: "epic"; epic: EpicPlan; top: number; height: number }
+  | { kind: "child"; epic: EpicPlan; bead: BeadSummary; top: number; height: number };
+
+/** Epic rows in `epics` order, each followed by its children when expanded; tops in px from the first row. */
+export function rowsOf(
+  epics: readonly EpicPlan[],
+  today: string,
+  expanded: ReadonlySet<string>,
+  children: ReadonlyMap<string, readonly BeadSummary[]>,
+): Row[] {
+  const rows: Row[] = [];
+  let top = 0;
+  for (const epic of epics) {
+    const height = ROW_HEIGHT + WARNING_HEIGHT * warningLines(epic, today).length;
+    rows.push({ kind: "epic", epic, top, height });
+    top += height;
+    if (!expanded.has(epic.id)) continue;
+    for (const bead of children.get(epic.id) ?? []) {
+      rows.push({ kind: "child", epic, bead, top, height: CHILD_HEIGHT });
+      top += CHILD_HEIGHT;
+    }
+  }
+  return rows;
+}
+
+export type Arrow = { from: string; to: string; path: string; late: boolean };
+
+/** REQ-MILESTONE-UI-014: an arrow from the end of A's last bead to the start of B's first bead for each in-milestone `depends_on`. */
+export function dependencyArrows(rows: readonly Row[], axis: Axis): Arrow[] {
+  const epicRows = new Map(rows.flatMap((r) => (r.kind === "epic" ? [[r.epic.id, r] as const] : [])));
+  const middle = (r: Row) => r.top + BAR_TOP + BEAD_HEIGHT / 2;
+  return [...epicRows.values()].flatMap((rb) =>
+    rb.epic.depends_on.flatMap((id) => {
+      const ra = epicRows.get(id);
+      if (ra === undefined) return [];
+      const a = beadsOf(ra.epic);
+      const edge = endOf(axis, a[a.length - 1]);
+      const start = xOf(axis, beadsOf(rb.epic)[0]);
+      const [ma, mb] = [middle(ra), middle(rb)];
+      // too close to turn in front of B: run along B's row edge and enter from the left
+      const turn = rb.top > ra.top ? rb.top : rb.top + rb.height;
+      const path =
+        start >= edge + 16
+          ? `M${edge - 3} ${ma} H${edge} V${mb} H${start + 3}`
+          : `M${edge - 3} ${ma} H${edge} V${turn} H${start - 8} V${mb} H${start + 3}`;
+      return [{ from: id, to: rb.epic.id, path, late: rb.epic.planned_start <= ra.epic.planned_end }];
+    }),
+  );
+}
+
+/** REQ-MILESTONE-UI-014: `id`, the epics it depends on and the epics that depend on it, directly or through others. */
+export function chainOf(epics: readonly EpicPlan[], id: string): Set<string> {
+  const ids = new Set(epics.map((e) => e.id));
+  const up = new Map(epics.map((e) => [e.id, e.depends_on.filter((d) => ids.has(d))]));
+  const down = new Map<string, string[]>();
+  for (const [b, as] of up) for (const a of as) down.set(a, [...(down.get(a) ?? []), b]);
+  const walk = (links: Map<string, string[]>) => {
+    const seen = [id];
+    for (const current of seen) for (const next of links.get(current) ?? []) if (!seen.includes(next)) seen.push(next);
+    return seen;
+  };
+  return new Set([...walk(up), ...walk(down)]);
+}
+
+/** REQ-MILESTONE-UI-015: beads by parent, each list ordered by id (".2" before ".10"). */
+export function childrenOf(beads: readonly BeadSummary[]): Map<string, BeadSummary[]> {
+  const byParent = new Map<string, BeadSummary[]>();
+  for (const bead of beads) if (bead.parent !== null) byParent.set(bead.parent, [...(byParent.get(bead.parent) ?? []), bead]);
+  for (const list of byParent.values()) list.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
+  return byParent;
+}
```

  `mondayOf` and `Zoom` are used by `axisOf` above their declaration; that is fine for functions and types (hoisted, and only called after module load).

- [ ] **Step 4: Run them again.** The Step 2 command. Expected: 15 tests pass (6 existing, 9 new). Then `pnpm -C frontend typecheck` and `pnpm -C frontend lint`. Expected: no errors.

- [ ] **Step 5: Commit** `feat(milestones): Gantt zoom, panning and dependency layout (gin-console-38i.1)`.

### Track 2: Zoom, panning, readable rows, arrows and child beads in the Gantt
- **Dependencies**: Track 1
- **Requirements**: REQ-MILESTONE-UI-011, REQ-MILESTONE-UI-012, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-014, REQ-MILESTONE-UI-015
- **Files**:
  - Create `frontend/src/features/milestones/usePan.ts`
  - Modify `frontend/src/features/milestones/GanttChart.tsx:1-174` (whole file replaced)
  - Modify `frontend/src/features/milestones/GanttTab.tsx:1-31,64` (`zoom`, `onZoom`, beads, `childBeads`)
  - Modify `frontend/src/features/milestones/MilestonePage.tsx:9,26-37,53-62` (`zoom` from and to the URL)
  - Modify `frontend/src/features/milestones/api.ts:1,148-151` (`milestonePath` takes `zoom`)
  - Test `frontend/src/features/milestones/GanttChart.test.tsx` (new)
  - Test `frontend/src/features/milestones/MilestonePage.test.tsx:5,51,59` and new cases at the end
  - Test `frontend/src/features/milestones/api.test.ts:34-35`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** one component rewritten with the exact code below, but it mixes layout effects, pointer events and SVG geometry, and jsdom differs from a browser (no layout, no `scrollTo`), so test failures need judgement.
- **Acceptance criteria**: every REQ-MILESTONE-UI-011 to -015 case in `GanttChart.test.tsx`, `MilestonePage.test.tsx` and `api.test.ts` passes, as do the existing REQ-MILESTONE-UI-002 to -005 cases; `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- **Estimated complexity**: medium

**Interfaces produced:**
- `milestonePath(project: string, id: string, tab?: "gantt" | "graph", start?: string | null, zoom?: Zoom): string` writes `tab`, `start`, then `zoom` (only `1w` or `2w`).
- `GanttChart` props: `{ project: string; plan: MilestoneDetail; preview: boolean; zoom: Zoom; onZoom: (zoom: Zoom) => void; childBeads: ReadonlyMap<string, readonly BeadSummary[]> }`.
- `GanttTab` adds props `zoom: Zoom` and `onZoom: (zoom: Zoom) => void`.
- DOM hooks used by tests and TC-2: `[data-scroller]` (the sideways scroller), `[data-range]` (days in view), `[data-epic]` and `[data-child]` rows with `data-faded`, `path[data-from][data-to]` arrows with `data-late` and `data-state="hot|faded"`, `[data-tail]` (title after the bar), `[data-shade]` (parent period in a child row).

- [ ] **Step 1: Write the failing tests.** Create `frontend/src/features/milestones/GanttChart.test.tsx`:

```tsx
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MilestoneDetail } from "./api";
import { GanttChart } from "./GanttChart";
import type { Zoom } from "./gantt";
import { detail, epicPlan } from "./milestoneFixtures";

afterEach(cleanup);

const draw = (plan: MilestoneDetail, zoom: Zoom = "all") =>
  render(<GanttChart project="alpha" plan={plan} preview={false} zoom={zoom} onZoom={vi.fn()} childBeads={new Map()} />);
const scroller = () => document.querySelector<HTMLElement>("[data-scroller]") ?? document.body;
const range = () => document.querySelector("[data-range]")?.textContent;
const arrow = (from: string, to: string) => document.querySelector<SVGPathElement>(`path[data-from="${from}"][data-to="${to}"]`);
const epicRow = (id: string) => document.querySelector<HTMLElement>(`[data-epic="${id}"]`) ?? document.body;

const MONTH = detail([epicPlan("e-a", { planned_start: "2026-11-02", planned_end: "2026-11-27", estimate_days: 20 })], {
  end: "2026-11-27",
  finish: "2026-11-27",
});

describe("GanttChart", () => {
  it("REQ-MILESTONE-UI-011 today outside the plan: one week opens on the Monday of the plan's first day", () => {
    draw(
      detail([epicPlan("e-a", { planned_start: "2026-11-04", planned_end: "2026-11-06" })], {
        start: "2026-11-04",
        schedule_start: "2026-11-04",
        finish: "2026-11-06",
        today: "2026-10-29",
      }),
      "1w",
    );
    expect(range()).toBe("2 Nov – 8 Nov");
  });

  it("REQ-MILESTONE-UI-012 › steps to the next Monday; ‹ disabled at the start", async () => {
    draw(MONTH, "2w");
    expect(range()).toBe("2 Nov – 15 Nov");
    expect(screen.getByRole("button", { name: "Earlier" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(range()).toBe("16 Nov – 29 Nov");
    expect(screen.getByRole("button", { name: "Later" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Earlier" }));
    expect(range()).toBe("2 Nov – 15 Nov");
  });

  it("REQ-MILESTONE-UI-012 dragging moves the days in view and does not open the link under it", () => {
    draw(MONTH, "1w");
    const el = scroller();
    Object.defineProperty(el, "scrollWidth", { value: 3000 });
    Object.defineProperty(el, "clientWidth", { value: 960 });
    const link = screen.getByRole("link", { name: "e-a" });
    const before = window.location.pathname;
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0, clientX: 700 });
    fireEvent.pointerMove(link, { pointerType: "mouse", clientX: 40 });
    fireEvent.pointerUp(link, { pointerType: "mouse", clientX: 40 });
    fireEvent.click(link);
    expect(window.location.pathname).toBe(before);
    expect(el.scrollLeft).toBe(660);
    fireEvent.scroll(el);
    expect(range()).toBe("9 Nov – 15 Nov");
  });

  it("REQ-MILESTONE-UI-012 a move under 4 px is a click", () => {
    window.history.replaceState(null, "", "/milestones/alpha/m-1");
    draw(MONTH, "1w");
    const el = scroller();
    Object.defineProperty(el, "scrollWidth", { value: 3000 });
    Object.defineProperty(el, "clientWidth", { value: 960 });
    const link = screen.getByRole("link", { name: "e-a" });
    fireEvent.pointerDown(link, { pointerType: "mouse", button: 0, clientX: 700 });
    fireEvent.pointerMove(link, { pointerType: "mouse", clientX: 697 });
    fireEvent.pointerUp(link, { pointerType: "mouse", clientX: 697 });
    fireEvent.click(link);
    expect(window.location.pathname).toBe("/beads/alpha/e-a");
    expect(el.scrollLeft).toBe(0);
  });

  it("REQ-MILESTONE-UI-013 title line, then id, period and estimate; the title after a short bar", () => {
    const title = "Process hygiene: consistent skills, rules that bind where it matters";
    draw(detail([epicPlan("gin-workflow-rm-process-hygiene", { title, planned_start: "2026-11-02", planned_end: "2026-11-02", estimate_days: 1 })]));
    const li = epicRow("gin-workflow-rm-process-hygiene");
    const [first, second] = li.querySelectorAll(":scope > div > div > span");
    expect(first).toHaveTextContent(title);
    expect(first.querySelector(`[title="${title}"]`)).toHaveClass("truncate");
    expect(second).toHaveTextContent("gin-workflow-rm-process-hygiene2 Nov, 1d");
    expect(second).toHaveClass("whitespace-nowrap");
    expect([...second.children].every((part) => part.classList.contains("truncate"))).toBe(true);
    expect(li.querySelector("[data-tail]")).toHaveTextContent(title);
  });

  it("REQ-MILESTONE-UI-013 no title after a bar that reaches the end", () => {
    draw(MONTH);
    expect(epicRow("e-a").querySelector("[data-tail]")).toBeNull();
  });

  const CHAIN = detail([
    epicPlan("A", { planned_start: "2026-11-02", planned_end: "2026-11-02" }),
    epicPlan("B", { planned_start: "2026-11-03", planned_end: "2026-11-03", depends_on: ["A", "X"] }),
    epicPlan("C", { planned_start: "2026-11-04", planned_end: "2026-11-05", depends_on: ["B"] }),
    epicPlan("D", { planned_start: "2026-11-05", planned_end: "2026-11-05", depends_on: ["C"] }),
    epicPlan("E", { planned_start: "2026-11-09", planned_end: "2026-11-09" }),
  ]);

  it("REQ-MILESTONE-UI-014 an arrow per in-milestone dependency; late ones in the blocked color", () => {
    draw(CHAIN);
    expect([...document.querySelectorAll("path[data-from]")].map((p) => `${p.getAttribute("data-from")}>${p.getAttribute("data-to")}`)).toEqual([
      "A>B",
      "B>C",
      "C>D",
    ]);
    expect(arrow("A", "B")).not.toHaveAttribute("data-late");
    expect(arrow("C", "D")).toHaveAttribute("data-late", "true");
    expect(arrow("C", "D")).toHaveClass("text-state-blocked");
    expect(document.querySelector('path[data-from="X"]')).toBeNull();
  });

  it("REQ-MILESTONE-UI-014 pointing at an epic highlights its chain and fades the rest", () => {
    draw(CHAIN);
    fireEvent.mouseEnter(epicRow("B"));
    expect(["A", "B", "C", "D"].map((id) => epicRow(id).hasAttribute("data-faded"))).toEqual([false, false, false, false]);
    expect(epicRow("E")).toHaveAttribute("data-faded", "true");
    expect(arrow("A", "B")).toHaveAttribute("data-state", "hot");
    fireEvent.mouseLeave(screen.getByRole("list", { name: "Epics" }));
    expect(epicRow("E")).not.toHaveAttribute("data-faded");
    expect(arrow("A", "B")).not.toHaveAttribute("data-state");
  });

  it("REQ-MILESTONE-UI-014 focus inside a row highlights its chain", () => {
    draw(CHAIN);
    act(() => screen.getByRole("link", { name: "E" }).focus());
    expect(epicRow("A")).toHaveAttribute("data-faded", "true");
    expect(arrow("A", "B")).toHaveAttribute("data-state", "faded");
  });
});
```

  Apply this diff to `frontend/src/features/milestones/MilestonePage.test.tsx` (the end and today lines move because the chart now fills 960 px: label 300, 660 px over 5 working days):

```diff
diff --git a/frontend/src/features/milestones/MilestonePage.test.tsx b/frontend/src/features/milestones/MilestonePage.test.tsx
index 0a1b170..445a5e9 100644
--- a/frontend/src/features/milestones/MilestonePage.test.tsx
+++ b/frontend/src/features/milestones/MilestonePage.test.tsx
@@ -2,6 +2,7 @@ import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-li
 import userEvent from "@testing-library/user-event";
 import { afterEach, describe, expect, it, vi } from "vitest";
 import { bead, json } from "@/features/beads/beadFixtures";
+import type { BeadSummary } from "@/features/beads/api";
 import type { MilestoneDetail } from "./api";
 import { detail, epicPlan, stubMilestones } from "./milestoneFixtures";
 import { MilestonePage } from "./MilestonePage";
@@ -48,7 +49,7 @@ describe("MilestonePage", () => {
     const a = await row("e-a");
     expect(beads(a)).toEqual(["2026-11-02", "2026-11-03", "2026-11-04", "2026-11-05", "2026-11-06"]);
     expect(a).toHaveTextContent("2 working days past the end");
-    expect(line("end")?.style.left).toBe(`${256 + 3 * 28}px`);
+    expect(line("end")?.style.left).toBe(`${300 + 3 * 132}px`); // label 300, 660 px over 5 working days
   });
 
   it("REQ-MILESTONE-UI-003 today from the JSON, whatever the browser's date", async () => {
@@ -56,7 +57,7 @@ describe("MilestonePage", () => {
     try {
       open(OVERFLOW);
       await row("e-a");
-      expect(line("today")?.style.left).toBe(`${256 + 2 * 28 + 14}px`);
+      expect(line("today")?.style.left).toBe(`${300 + 2 * 132 + 66}px`);
     } finally {
       vi.useRealTimers();
     }
@@ -190,4 +191,88 @@ describe("MilestonePage", () => {
     await userEvent.click(screen.getByRole("tab", { name: "Gantt" }));
     expect(window.location.search).toBe("");
   });
+
+  const LONG = detail([epicPlan("e-a", { planned_start: "2026-11-02", planned_end: "2026-11-27", estimate_days: 20 })], {
+    end: "2026-11-27",
+    finish: "2026-11-27",
+    today: "2026-11-11",
+  });
+  const range = () => document.querySelector("[data-range]")?.textContent;
+  const pressed = () => within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { pressed: true });
+
+  it("REQ-MILESTONE-UI-011 whole milestone by default fills the width", async () => {
+    open(OVERFLOW);
+    await row("e-a");
+    expect(pressed()).toHaveTextContent("Whole milestone");
+    expect(document.querySelector<HTMLElement>("[data-scroller] > div")?.style.width).toBe("960px");
+    expect(range()).toBeUndefined();
+  });
+
+  it("REQ-MILESTONE-UI-011 two weeks from today, kept in the URL", async () => {
+    open(LONG);
+    await row("e-a");
+    await userEvent.click(screen.getByRole("button", { name: "2 weeks" }));
+    expect(window.location.search).toBe("?zoom=2w");
+    expect(pressed()).toHaveTextContent("2 weeks");
+    expect(range()).toBe("9 Nov – 22 Nov");
+  });
+
+  it("REQ-MILESTONE-UI-011 unknown zoom is the whole milestone", async () => {
+    open(LONG, undefined, "?zoom=3w");
+    await row("e-a");
+    expect(pressed()).toHaveTextContent("Whole milestone");
+  });
+
+  it("REQ-MILESTONE-UI-011 zoom kept with the preview and the tabs", async () => {
+    open(detail([epicPlan("e-a")], { status: "scheduled", kickoff: "2026-11-09" }), (start) =>
+      json(detail([epicPlan("e-a", { planned_start: "2026-11-16", planned_end: "2026-11-18" })], { status: "scheduled", schedule_start: start, preview: true, finish: "2026-11-18" })),
+      "?zoom=1w",
+    );
+    fireEvent.change(await screen.findByLabelText("Kick-start date"), { target: { value: "2026-11-16" } });
+    expect(window.location.search).toBe("?start=2026-11-16&zoom=1w");
+    await waitFor(() => expect(beads(document.querySelector("[data-epic='e-a']") ?? document.body)[0]).toBe("2026-11-16"));
+    expect(pressed()).toHaveTextContent("1 week");
+    await userEvent.click(screen.getByRole("tab", { name: "Graph" }));
+    expect(window.location.search).toBe("?tab=graph&start=2026-11-16&zoom=1w");
+  });
+
+  const epicBeads = [
+    bead("e-a.2", { parent: "e-a", status: "in_progress", title: "Wire the pager" }),
+    bead("e-a.1", { parent: "e-a", status: "closed", closed_at: "2026-11-01T04:15:36Z" }),
+    bead("e-b.1", { parent: "e-b" }),
+  ];
+  const openWithBeads = (beadsAnswer: BeadSummary[] | ((url: URL) => Response)) => {
+    window.history.replaceState(null, "", "/milestones/alpha/m-1");
+    const fetchMock = stubMilestones(() => json(detail([epicPlan("e-a"), epicPlan("e-b"), epicPlan("e-c")])), beadsAnswer);
+    render(<MilestonePage project="alpha" id="m-1" />);
+    return fetchMock;
+  };
+
+  it("REQ-MILESTONE-UI-015 expand an epic to list its children; the others stay collapsed", async () => {
+    const fetchMock = openWithBeads(epicBeads);
+    const toggle = await screen.findByRole("button", { name: "Show 2 child beads of e-a" });
+    expect(await row("e-a")).toHaveTextContent("1/2 closed");
+    expect(fetchMock.mock.calls.some(([input]) => typeof input === "string" && input.startsWith("/api/beads") && input.includes("closed=1"))).toBe(true);
+    expect(within(await row("e-c")).queryByRole("button")).toBeNull();
+    expect(await row("e-c")).not.toHaveTextContent("closed");
+    expect(document.querySelectorAll("[data-child]")).toHaveLength(0);
+    await userEvent.click(toggle);
+    expect(toggle).toHaveAttribute("aria-expanded", "true");
+    const children = [...document.querySelectorAll<HTMLElement>("[data-child]")];
+    expect(children.map((c) => c.dataset.child)).toEqual(["e-a.1", "e-a.2"]);
+    expect(children[0]).toHaveTextContent("closed 1 Nov");
+    expect(children[1]).toHaveTextContent("Wire the pager");
+    expect(children[1]).toHaveTextContent("In progress");
+    expect(within(children[0]).getByRole("link", { name: ".1" })).toHaveAttribute("href", "/beads/alpha/e-a.1");
+    expect(children[0].querySelector("[data-shade]")).not.toBeNull();
+    expect(screen.getByRole("button", { name: "Show 1 child bead of e-b" })).toHaveAttribute("aria-expanded", "false");
+  });
+
+  it("REQ-MILESTONE-UI-015 beads unavailable: no expand buttons, the plan still drawn", async () => {
+    openWithBeads(() => json({ error: "bd failed" }, 502));
+    const a = await row("e-a");
+    expect(beads(a)).toHaveLength(3);
+    await waitFor(() => expect(within(a).queryByRole("button")).toBeNull());
+    expect(a).not.toHaveTextContent("closed");
+  });
 });
```

  Apply this diff to `frontend/src/features/milestones/api.test.ts`:

```diff
diff --git a/frontend/src/features/milestones/api.test.ts b/frontend/src/features/milestones/api.test.ts
index 33fc5e6..7c17d1c 100644
--- a/frontend/src/features/milestones/api.test.ts
+++ b/frontend/src/features/milestones/api.test.ts
@@ -33,5 +33,7 @@ describe("milestones api", () => {
   it("builds milestone paths", () => {
     expect(milestonePath("al pha", "m-1")).toBe("/milestones/al%20pha/m-1");
     expect(milestonePath("alpha", "m-1", "graph", "2026-11-16")).toBe("/milestones/alpha/m-1?tab=graph&start=2026-11-16");
+    expect(milestonePath("alpha", "m-1", "gantt", null, "2w")).toBe("/milestones/alpha/m-1?zoom=2w"); // REQ-MILESTONE-UI-011
+    expect(milestonePath("alpha", "m-1", "gantt", null, "all")).toBe("/milestones/alpha/m-1");
   });
 });
```

- [ ] **Step 2: Run them.** `pnpm -C frontend test --run src/features/milestones`. Expected: the new files fail (`GanttChart` has no `zoom` prop, no `[data-range]`, no arrows), and the two REQ-MILESTONE-UI-003 line positions fail (`340px` and `326px` received).

- [ ] **Step 3: Add the pan hook.** Create `frontend/src/features/milestones/usePan.ts`:

```ts
import { useEffect, type RefObject } from "react";

const THRESHOLD = 4;

/** REQ-MILESTONE-UI-012: drag the scroller sideways with the mouse; the click that ends a drag opens nothing.
 *  Touch and trackpads scroll natively. */
export function usePan(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    let start: { x: number; left: number } | null = null;
    let dragged = false;
    const down = (event: PointerEvent) => {
      dragged = false;
      if (event.pointerType !== "mouse" || event.button !== 0 || el.scrollWidth <= el.clientWidth) return;
      start = { x: event.clientX, left: el.scrollLeft };
    };
    const move = (event: PointerEvent) => {
      if (start === null) return;
      const dx = event.clientX - start.x;
      if (!dragged && Math.abs(dx) <= THRESHOLD) return;
      if (!dragged) {
        dragged = true;
        el.setPointerCapture?.(event.pointerId);
        el.dataset.panning = "";
      }
      el.scrollLeft = start.left - dx;
    };
    const up = () => {
      start = null;
      delete el.dataset.panning;
    };
    const noDrag = (event: DragEvent) => event.preventDefault(); // links would start a native drag instead
    const click = (event: MouseEvent) => {
      if (!dragged) return;
      dragged = false;
      event.preventDefault();
      event.stopPropagation();
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("dragstart", noDrag);
    el.addEventListener("click", click, true);
    return () => {
      el.removeEventListener("dragstart", noDrag);
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("click", click, true);
    };
  }, [ref]);
}
```

- [ ] **Step 4: Replace the chart.** Replace `frontend/src/features/milestones/GanttChart.tsx` with:

```tsx
import { Ban, Check, ChevronLeft, ChevronRight, Circle, CircleDot, Clock, TriangleAlert } from "lucide-react";
import { useId, useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from "react";
import { Link } from "@/app/Link";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "@/features/beads/api";
import { useWide } from "@/features/beads/useWide";
import { cn } from "@/lib/utils";
import type { MilestoneDetail } from "./api";
import { CopyCommand } from "./CopyCommand";
import { plural, shortDate, weekday } from "./format";
import {
  axisOf,
  BAR_TOP,
  BEAD_HEIGHT,
  beadsOf,
  boundsOf,
  chainOf,
  dayAt,
  dayOf,
  dependencyArrows,
  endOf,
  fitDayWidth,
  isoOf,
  middleOf,
  mondayOf,
  monthsOf,
  openingDay,
  periodOf,
  rowsOf,
  sortEpics,
  spanOf,
  stepDay,
  warningLines,
  xOf,
  type Axis,
  type Row,
  type Zoom,
} from "./gantt";
import { usePan } from "./usePan";

const LOOK = {
  open: { icon: Circle, label: "Open", text: "text-muted-foreground", fill: "border border-muted-foreground bg-card" },
  in_progress: { icon: CircleDot, label: "In progress", text: "text-state-progress", fill: "bg-state-progress" },
  blocked: { icon: Ban, label: "Blocked", text: "text-state-blocked", fill: "bg-state-blocked" },
  closed: { icon: Check, label: "Closed", text: "text-state-done", fill: "bg-state-done opacity-60" },
  deferred: {
    icon: Clock,
    label: "Deferred",
    text: "text-state-deferred",
    fill: "border border-state-deferred bg-[repeating-linear-gradient(135deg,var(--state-deferred)_0_2px,transparent_2px_5px)]",
  },
} as const;
const isLook = (status: string): status is keyof typeof LOOK => Object.hasOwn(LOOK, status);
const lookOf = (status: string) => (isLook(status) ? LOOK[status] : LOOK.open);
const enc = encodeURIComponent;

const ZOOMS = [
  { value: "1w", label: "1 week" },
  { value: "2w", label: "2 weeks" },
  { value: "all", label: "Whole milestone" },
] as const;
const DEFAULT_WIDTH = 960; // until the first measure, and in tests, which have no layout
const TAIL_ROOM = 90;

type Props = {
  project: string;
  plan: MilestoneDetail;
  preview: boolean;
  zoom: Zoom;
  onZoom: (zoom: Zoom) => void;
  childBeads: ReadonlyMap<string, readonly BeadSummary[]>;
};

/** REQ-MILESTONE-UI-003 and -011 to -015: each epic as beads on a thread, one bead per working day, zoomed to fit the width. */
export function GanttChart(props: Props) {
  if (props.plan.epics.length === 0) {
    return (
      <div className="flex flex-col items-start gap-2 text-sm">
        <p>No epics in this milestone. Add some with:</p>
        <CopyCommand command={`/roadmap --milestone ${props.plan.id}`} />
      </div>
    );
  }
  return <Chart {...props} />;
}

/** The scroller's width, followed with a ResizeObserver where the browser has one. */
function useWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useLayoutEffect(() => {
    const el = ref.current;
    if (el === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (el.clientWidth > 0) setWidth(el.clientWidth);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

function Chart({ project, plan, preview, zoom, onZoom, childBeads }: Props) {
  const wide = useWide();
  const label = wide ? 300 : 168;
  const scroller = useRef<HTMLDivElement>(null);
  const plot = useWidth(scroller) - label;
  const span = spanOf(zoom);
  const bounds = boundsOf(plan);
  const dayWidth =
    span === null
      ? fitDayWidth(bounds.first, bounds.last, plot, 14)
      : fitDayWidth(mondayOf(bounds.first), mondayOf(bounds.first) + span - 1, plot, 24);
  const axis = axisOf(plan, dayWidth, zoom);
  const maxLeft = Math.max(0, axis.width - plot);
  const todayX = middleOf(axis, dayOf(plan.today));
  const endX = Math.min(endOf(axis, dayOf(plan.end)), axis.width - 2);
  const [left, setLeft] = useState(0);
  const [hot, setHot] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const opened = useRef<string | null>(null);
  const view = useRef(axis.first); // the first day in view, kept when the day width changes
  usePan(scroller);

  // REQ-MILESTONE-UI-011/-012: open a zoom at its opening day (the whole milestone at today);
  // a refresh keeps the days in view, a resize keeps the first day in view
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el === null) return;
    const key = `${plan.id} ${zoom}`;
    let to = xOf(axis, view.current);
    if (opened.current !== key) {
      opened.current = key;
      to = span !== null ? xOf(axis, openingDay(plan, axis)) : todayX === null ? 0 : todayX - plot / 3;
    }
    to = Math.min(Math.max(0, to), maxLeft);
    el.scrollLeft = to;
    view.current = dayAt(axis, to + 0.5);
    setLeft(to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.id, zoom, dayWidth, axis.first]);

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const x = event.currentTarget.scrollLeft;
    view.current = dayAt(axis, x + 0.5);
    setLeft(x);
  };
  const step = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el === null || span === null) return;
    const to = Math.min(xOf(axis, stepDay(axis, dayAt(axis, left + 0.5), direction, span)), maxLeft);
    if (typeof el.scrollTo === "function") {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollTo({ left: to, behavior: reduce ? "auto" : "smooth" });
    } else {
      el.scrollLeft = to; // jsdom
    }
    view.current = dayAt(axis, to + 0.5);
    setLeft(to);
  };
  const toggle = (id: string) =>
    setExpanded((before) => {
      const after = new Set(before);
      if (!after.delete(id)) after.add(id);
      return after;
    });

  const epics = sortEpics(plan.epics);
  const rows = rowsOf(epics, plan.today, expanded, childBeads);
  const height = rows.reduce((sum, r) => sum + r.height, 0);
  const chain = hot === null ? null : chainOf(epics, hot);
  const faded = (id: string) => chain !== null && !chain.has(id);
  const date = (day: number) => shortDate(isoOf(day), plan.today);

  return (
    <figure aria-label="Schedule" className={cn("flex flex-col rounded border bg-card", preview && "border-dashed")}>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-3 py-2">
        <div role="group" aria-label="Zoom" className="flex gap-1">
          {ZOOMS.map((z) => (
            <Button key={z.value} variant={zoom === z.value ? "secondary" : "ghost"} size="sm" aria-pressed={zoom === z.value} onClick={() => onZoom(z.value)}>
              {z.label}
            </Button>
          ))}
        </div>
        {span !== null && (
          <div className="flex items-center gap-2 text-sm">
            <Button variant="outline" size="icon-sm" aria-label="Earlier" disabled={left <= 0.5} onClick={() => step(-1)}>
              <ChevronLeft aria-hidden />
            </Button>
            <span data-range className="min-w-32 text-center tabular-nums">
              {`${date(dayAt(axis, left + 0.5))} – ${date(dayAt(axis, left + plot - 0.5))}`}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Later" disabled={left >= maxLeft - 0.5} onClick={() => step(1)}>
              <ChevronRight aria-hidden />
            </Button>
          </div>
        )}
      </div>
      <div
        ref={scroller}
        data-scroller
        onScroll={onScroll}
        className="isolate overflow-x-auto data-[panning]:cursor-grabbing data-[panning]:select-none"
      >
        <div className="relative" style={{ width: label + axis.width }}>
          <div aria-hidden className="absolute inset-y-0" style={{ left: label }}>
            {axis.columns
              .filter((c) => c.weekend)
              .map((c) => (
                <span key={c.day} className="absolute inset-y-0 bg-muted" style={{ left: c.x, width: c.width }} />
              ))}
            <span className="absolute inset-y-0 bg-state-blocked/5" style={{ left: endX, width: Math.max(0, axis.width - endX) }} />
          </div>
          <Header axis={axis} label={label} today={plan.today} />
          <div className="relative">
            <Arrows rows={rows} axis={axis} label={label} height={height} chain={chain} />
            <ol aria-label="Epics" onMouseLeave={() => setHot(null)} onBlur={() => setHot(null)}>
              {rows.map((row) =>
                row.kind === "epic" ? (
                  <EpicRow
                    key={row.epic.id}
                    project={project}
                    row={row}
                    axis={axis}
                    label={label}
                    today={plan.today}
                    kids={childBeads.get(row.epic.id) ?? []}
                    open={expanded.has(row.epic.id)}
                    faded={faded(row.epic.id)}
                    onToggle={() => toggle(row.epic.id)}
                    onHot={() => setHot(row.epic.id)}
                  />
                ) : (
                  <ChildRow key={row.bead.id} project={project} row={row} axis={axis} label={label} today={plan.today} faded={faded(row.epic.id)} />
                ),
              )}
            </ol>
          </div>
          {todayX !== null && (
            <div data-line="today" aria-hidden className="absolute inset-y-0 z-[5] border-l border-dashed border-foreground" style={{ left: label + todayX }}>
              <span className="absolute top-0 ml-1 rounded bg-foreground px-1 text-[11px] text-background">Today</span>
            </div>
          )}
          <div data-line="end" aria-hidden className="absolute inset-y-0 z-[5] border-l-2 border-foreground" style={{ left: label + endX }}>
            <span
              className={cn("absolute top-1 whitespace-nowrap text-[11px] font-medium", endX > axis.width - 80 ? "right-full mr-1" : "ml-1")}
            >{`End ${shortDate(plan.end, plan.today)}`}</span>
          </div>
        </div>
      </div>
      <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 border-t px-3 py-2 text-xs text-muted-foreground">
        {Object.values(LOOK).map((look) => (
          <li key={look.label} className="flex items-center gap-1.5">
            <span aria-hidden className={cn("h-3 w-5 rounded-full", look.fill)} />
            {look.label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-l border-dashed border-foreground" />
          Today
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 border-l-2 border-foreground" />
          End
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-5 bg-state-blocked/10" />
          Past the end
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-5 bg-muted-foreground" />
          Depends on
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-0.5 w-5 bg-state-blocked" />
          Starts before its dependency ends
        </li>
      </ul>
    </figure>
  );
}

function Header({ axis, label, today }: { axis: Axis; label: number; today: string }) {
  return (
    <div aria-hidden className="relative flex border-b text-[11px] text-muted-foreground">
      <div className="sticky left-0 z-10 flex-none bg-card" style={{ width: label }} />
      <div className="relative h-11 flex-none" style={{ width: axis.width }}>
        {monthsOf(axis, today).map((m) => (
          <span key={m.key} className="absolute top-1 truncate pl-1 font-medium text-foreground" style={{ left: m.x, width: m.width }}>
            {m.label}
          </span>
        ))}
        {axis.columns
          .filter((c) => !c.weekend)
          .map((c) => (
            <span key={c.day} className="absolute bottom-1 text-center tabular-nums" style={{ left: c.x, width: c.width }}>
              {c.width >= 56 ? `${weekday(c.iso)} ${Number(c.iso.slice(8))}` : Number(c.iso.slice(8))}
            </span>
          ))}
      </div>
    </div>
  );
}

/** REQ-MILESTONE-UI-014: arrows under the bars; the pointed chain stands out, the rest fades. */
function Arrows({ rows, axis, label, height, chain }: { rows: Row[]; axis: Axis; label: number; height: number; chain: Set<string> | null }) {
  const id = useId().replace(/[^\w-]/g, "");
  const tones = { muted: "text-muted-foreground", late: "text-state-blocked", hot: "text-foreground" } as const;
  return (
    <svg aria-hidden className="pointer-events-none absolute top-0" style={{ left: label }} width={axis.width} height={height}>
      <defs>
        {Object.entries(tones).map(([tone, text]) => (
          <marker key={tone} id={`${id}-${tone}`} className={text} viewBox="0 0 6 6" refX="5" refY="3" markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0 0 L6 3 L0 6 z" fill="currentColor" />
          </marker>
        ))}
      </defs>
      {dependencyArrows(rows, axis).map((a) => {
        const on = chain !== null && chain.has(a.from) && chain.has(a.to);
        const tone = a.late ? "late" : on ? "hot" : "muted";
        return (
          <path
            key={`${a.from} ${a.to}`}
            data-from={a.from}
            data-to={a.to}
            data-late={a.late || undefined}
            data-state={chain === null ? undefined : on ? "hot" : "faded"}
            d={a.path}
            fill="none"
            stroke="currentColor"
            strokeWidth={on ? 2 : 1.5}
            markerEnd={`url(#${id}-${tone})`}
            className={cn(tones[tone], chain !== null && !on && "opacity-20", "motion-safe:transition-opacity")}
          />
        );
      })}
    </svg>
  );
}

function EpicRow({
  project,
  row,
  axis,
  label,
  today,
  kids,
  open,
  faded,
  onToggle,
  onHot,
}: {
  project: string;
  row: Row & { kind: "epic" };
  axis: Axis;
  label: number;
  today: string;
  kids: readonly BeadSummary[];
  open: boolean;
  faded: boolean;
  onToggle: () => void;
  onHot: () => void;
}) {
  const { epic } = row;
  const look = lookOf(epic.status);
  const Icon = look.icon;
  const days = beadsOf(epic);
  const x0 = xOf(axis, days[0]);
  const x1 = endOf(axis, days[days.length - 1]);
  const unestimated = epic.estimate_days === null;
  const closed = kids.filter((b) => b.status === "closed").length;
  const fade = cn("motion-safe:transition-opacity", faded && "opacity-35");
  return (
    <li data-epic={epic.id} data-faded={faded || undefined} onMouseEnter={onHot} onFocus={onHot} className="flex border-b" style={{ height: row.height }}>
      <div className="sticky left-0 z-10 flex flex-none flex-col justify-center gap-0.5 bg-card px-3" style={{ width: label }}>
        <div className={cn("flex min-w-0 flex-col gap-0.5", fade)}>
          <span className="flex min-w-0 items-center gap-1.5 text-sm">
            {kids.length > 0 ? (
              <button
                type="button"
                aria-expanded={open}
                aria-label={`${open ? "Hide" : "Show"} ${plural(kids.length, "child bead")} of ${epic.id}`}
                onClick={onToggle}
                className="flex size-5 flex-none items-center justify-center rounded text-muted-foreground hover:bg-muted"
              >
                <ChevronRight aria-hidden className={cn("size-3.5 motion-safe:transition-transform", open && "rotate-90")} />
              </button>
            ) : (
              <span aria-hidden className="size-5 flex-none" />
            )}
            <Icon role="img" aria-label={look.label} className={cn("size-3.5 flex-none", look.text)} />
            <span title={epic.title} className="min-w-0 truncate font-medium">
              {epic.title}
            </span>
          </span>
          {/* on wide screens only the id shrinks; it keeps 64 px, so its link stays reachable on a phone */}
          <span className="flex min-w-0 items-center gap-1.5 whitespace-nowrap pl-[26px] text-xs text-muted-foreground">
            <span title={epic.id} className="min-w-16 shrink-[100] truncate">
              <Link to={`/beads/${enc(project)}/${enc(epic.id)}`} className="font-mono underline-offset-2 hover:underline">
                {epic.id}
              </Link>
            </span>
            <span className="min-w-0 truncate lg:shrink-0">{`${periodOf(epic.planned_start, epic.planned_end, today)}, ${unestimated ? "no estimate" : `${epic.estimate_days}d`}`}</span>
            {kids.length > 0 && <span className="min-w-0 truncate lg:shrink-0">{`${closed}/${kids.length} closed`}</span>}
          </span>
          {warningLines(epic, today).map((text) => (
            <span key={text} title={text} className="flex min-w-0 items-center gap-1 pl-[26px] text-xs text-state-blocked">
              <TriangleAlert aria-hidden className="size-3 flex-none" />
              <span className="min-w-0 truncate">{text}</span>
            </span>
          ))}
        </div>
      </div>
      <div className={cn("relative flex-none", fade)} style={{ width: axis.width }}>
        <div
          aria-hidden
          className={cn("absolute motion-safe:transition-transform motion-safe:duration-150", look.text)}
          style={{ top: BAR_TOP, height: BEAD_HEIGHT, transform: `translateX(${x0}px)`, width: x1 - x0 }}
        >
          {days.length > 1 && <span className="absolute inset-x-2 top-1/2 h-px bg-current" />}
          {days.map((day) => (
            <span
              key={day}
              data-bead={isoOf(day)}
              className={cn("absolute inset-y-0 rounded-full", unestimated ? "border border-dashed border-muted-foreground bg-card" : look.fill)}
              style={{ left: xOf(axis, day) - x0 + 2, width: endOf(axis, day) - xOf(axis, day) - 4 }}
            />
          ))}
        </div>
        {axis.width - x1 >= TAIL_ROOM && (
          <span
            data-tail
            aria-hidden
            className="absolute truncate text-xs text-muted-foreground"
            style={{ left: x1 + 8, top: BAR_TOP, lineHeight: `${BEAD_HEIGHT}px`, maxWidth: axis.width - x1 - 16 }}
          >
            {epic.title}
          </span>
        )}
      </div>
    </li>
  );
}

/** REQ-MILESTONE-UI-015: a child bead under its expanded epic; the epic's period shaded, no bar. */
function ChildRow({ project, row, axis, label, today, faded }: { project: string; row: Row & { kind: "child" }; axis: Axis; label: number; today: string; faded: boolean }) {
  const { epic, bead } = row;
  const look = lookOf(bead.status);
  const Icon = look.icon;
  const days = beadsOf(epic);
  const x0 = xOf(axis, days[0]);
  const x1 = endOf(axis, days[days.length - 1]);
  const shortId = bead.id.startsWith(epic.id) ? bead.id.slice(epic.id.length) : bead.id;
  const state = bead.status === "closed" && bead.closed_at !== null ? `closed ${shortDate(bead.closed_at.slice(0, 10), today)}` : look.label;
  const fade = cn("motion-safe:transition-opacity", faded && "opacity-35");
  return (
    <li data-child={bead.id} data-faded={faded || undefined} className="flex border-b" style={{ height: row.height }}>
      <div className="sticky left-0 z-10 flex flex-none items-center bg-card pr-3 pl-3" style={{ width: label }}>
        <span className={cn("flex min-w-0 flex-1 items-center gap-1.5 pl-[26px] text-xs", fade)}>
          <Icon role="img" aria-label={look.label} className={cn("size-3 flex-none", look.text)} />
          <span title={bead.id} className="flex-none">
            <Link to={`/beads/${enc(project)}/${enc(bead.id)}`} className="font-mono text-muted-foreground underline-offset-2 hover:underline">
              {shortId}
            </Link>
          </span>
          <span title={bead.title} className="min-w-0 flex-1 truncate">
            {bead.title}
          </span>
          <span className="flex-none text-muted-foreground">{state}</span>
        </span>
      </div>
      <div className={cn("relative flex-none", fade)} style={{ width: axis.width }}>
        <span data-shade aria-hidden className="absolute inset-y-1.5 rounded bg-foreground/5" style={{ left: x0, width: x1 - x0 }} />
      </div>
    </li>
  );
}
```

  Notes for the reviewer:
  - `Chart` holds every hook, so the empty state returns before any hook and the scroller exists whenever `useWidth` and `usePan` run.
  - The layout effect is keyed on `plan.id`, `zoom`, `dayWidth` and `axis.first`: opening a zoom scrolls to `openingDay` (the whole milestone to a third before today); a resize or a new axis start keeps the first day in view; a refresh with the same axis changes nothing, so the days in view stay (REQ-MILESTONE-UI-012). `setLeft` there is allowed by the hooks lint because it is a layout effect.
  - The id on the label's second line shrinks first (`shrink-[100]`) but keeps 64 px, so its link stays reachable on a phone; period and count keep their width on wide screens (`lg:shrink-0`), where an ellipsis on them would cut a date.
  - The End label sits in the month row (`top-1`) so it never covers day numbers; near the right edge it goes left of the line.

- [ ] **Step 5: Wire the URL and the beads.** Apply these diffs:

```diff
diff --git a/frontend/src/features/milestones/api.ts b/frontend/src/features/milestones/api.ts
index dafc1f9..4861b67 100644
--- a/frontend/src/features/milestones/api.ts
+++ b/frontend/src/features/milestones/api.ts
@@ -1,4 +1,5 @@
 import { field, isFiniteNumber, isString, isStringOrNull } from "@/lib/guards";
+import type { Zoom } from "./gantt";
 
 export type Cause = "outdated" | "tracking" | "schema";
 export type MilestoneEntry = {
@@ -145,10 +146,11 @@ export async function fetchMilestone(project: string, id: string, start: string
 
 export const milestonesPath = (project: string) => `/milestones?project=${enc(project)}`;
 
-export function milestonePath(project: string, id: string, tab: "gantt" | "graph" = "gantt", start: string | null = null) {
+export function milestonePath(project: string, id: string, tab: "gantt" | "graph" = "gantt", start: string | null = null, zoom: Zoom = "all") {
   const query = new URLSearchParams();
   if (tab === "graph") query.set("tab", "graph");
   if (start !== null) query.set("start", start);
+  if (zoom !== "all") query.set("zoom", zoom);
   const search = query.toString();
   return `/milestones/${enc(project)}/${enc(id)}${search === "" ? "" : `?${search}`}`;
 }
```

```diff
diff --git a/frontend/src/features/milestones/GanttTab.tsx b/frontend/src/features/milestones/GanttTab.tsx
index 661e3f8..cae17c8 100644
--- a/frontend/src/features/milestones/GanttTab.tsx
+++ b/frontend/src/features/milestones/GanttTab.tsx
@@ -1,27 +1,40 @@
+import { useMemo } from "react";
 import { Button } from "@/components/ui/button";
+import type { BeadSummary } from "@/features/beads/api";
+import { useBeads } from "@/features/beads/useBeads";
 import type { MilestoneDetail } from "./api";
 import { CopyCommand } from "./CopyCommand";
 import { shortDate, weekday } from "./format";
+import { childrenOf, type Zoom } from "./gantt";
 import { GanttChart } from "./GanttChart";
 import { MilestoneError } from "./MilestoneError";
 import type { LoadState } from "./useLoad";
 
-/** REQ-MILESTONE-UI-003 and -004: the current plan, or a read-only preview from a picked kick-start date. */
+const NO_CHILDREN: ReadonlyMap<string, readonly BeadSummary[]> = new Map();
+
+/** REQ-MILESTONE-UI-003 and -004: the current plan, or a read-only preview from a picked kick-start date.
+ *  REQ-MILESTONE-UI-015: the project's beads, open and closed, give each epic its children; none while loading or failed. */
 export function GanttTab({
   project,
   plan,
   start,
+  zoom,
   preview,
   onRetryPreview,
   onStart,
+  onZoom,
 }: {
   project: string;
   plan: MilestoneDetail;
   start: string | null;
+  zoom: Zoom;
   preview: LoadState<MilestoneDetail | null>;
   onRetryPreview: () => void;
   onStart: (date: string | null) => void;
+  onZoom: (zoom: Zoom) => void;
 }) {
+  const { state: beads } = useBeads(project, true);
+  const childBeads = useMemo(() => (beads.status === "ok" ? childrenOf(beads.beads) : NO_CHILDREN), [beads]);
   const pickable = plan.status === "planned" || plan.status === "scheduled";
   const previewing = pickable && start !== null;
   const failed = previewing && preview.status === "error";
@@ -61,7 +74,7 @@ export function GanttTab({
           Loading preview…
         </p>
       ) : (
-        <GanttChart project={project} plan={shown} preview={previewing} />
+        <GanttChart project={project} plan={shown} preview={previewing} zoom={zoom} onZoom={onZoom} childBeads={childBeads} />
       )}
     </div>
   );
```

```diff
diff --git a/frontend/src/features/milestones/MilestonePage.tsx b/frontend/src/features/milestones/MilestonePage.tsx
index 19f3708..b4b699b 100644
--- a/frontend/src/features/milestones/MilestonePage.tsx
+++ b/frontend/src/features/milestones/MilestonePage.tsx
@@ -6,7 +6,7 @@ import { Tabs } from "@/components/Tabs";
 import { cn } from "@/lib/utils";
 import { fetchMilestone, milestonePath, milestonesPath, type MilestoneDetail } from "./api";
 import { plural, shortDate } from "./format";
-import { dayOf, isoOf } from "./gantt";
+import { dayOf, isoOf, zoomOf } from "./gantt";
 import { GanttTab } from "./GanttTab";
 import { MilestoneError } from "./MilestoneError";
 import { MilestoneGraph } from "./MilestoneGraph";
@@ -23,9 +23,11 @@ const ISO = /^\d{4}-\d{2}-\d{2}$/;
 
 export function MilestonePage({ project, id }: { project: string; id: string }) {
   const { search } = useLocation();
-  const asked = new URLSearchParams(search).get("start");
+  const params = new URLSearchParams(search);
+  const asked = params.get("start");
   const day = asked !== null && ISO.test(asked) ? dayOf(asked) : NaN; // month 13 gives NaN, Feb 31 rolls over
-  const tab: Tab = new URLSearchParams(search).get("tab") === "graph" ? "graph" : "gantt";
+  const tab: Tab = params.get("tab") === "graph" ? "graph" : "gantt";
+  const zoom = zoomOf(params.get("zoom"));
   const start = !Number.isNaN(day) && isoOf(day) === asked ? asked : null;
   const current = useCallback(() => fetchMilestone(project, id, null), [project, id]);
   const preview = useCallback(
@@ -34,7 +36,7 @@ export function MilestonePage({ project, id }: { project: string; id: string })
   );
   const base = useLoad(current, true);
   const shown = useLoad<MilestoneDetail | null>(preview, false);
-  const pick = (next: string | null) => navigate(milestonePath(project, id, tab, next), { replace: true });
+  const pick = (next: string | null) => navigate(milestonePath(project, id, tab, next, zoom), { replace: true });
 
   return (
     <section className="flex flex-col gap-4">
@@ -50,16 +52,18 @@ export function MilestonePage({ project, id }: { project: string; id: string })
           {base.state.error !== null && (
             <p role="status" className="text-sm text-destructive">{`Refresh failed: ${base.state.error.message}`}</p>
           )}
-          <Tabs tabs={TABS} tab={tab} onChange={(next) => navigate(milestonePath(project, id, next, start), { replace: true })} label="Milestone views" />
+          <Tabs tabs={TABS} tab={tab} onChange={(next) => navigate(milestonePath(project, id, next, start, zoom), { replace: true })} label="Milestone views" />
           <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
             {tab === "gantt" ? (
               <GanttTab
                 project={project}
                 plan={base.state.data}
                 start={start}
+                zoom={zoom}
                 preview={shown.state}
                 onRetryPreview={shown.retry}
                 onStart={pick}
+                onZoom={(next) => navigate(milestonePath(project, id, tab, start, next), { replace: true })}
               />
             ) : (
               <MilestoneGraph project={project} id={id} />
```

- [ ] **Step 6: Run the tests again.** The Step 2 command. Expected: all pass (68 in `src/features/milestones`).

- [ ] **Step 7: Full frontend checks.** `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`. Expected: all pass (458 tests at the time of planning). Commit `feat(milestones): Gantt zoom, panning, arrows and child beads (gin-console-38i.2)`.

### Track 3: Check the Gantt in a browser
- **Dependencies**: Track 2
- **Requirements**: REQ-MILESTONE-UI-011, REQ-MILESTONE-UI-012, REQ-MILESTONE-UI-013, REQ-MILESTONE-UI-014, REQ-MILESTONE-UI-015
- **Files**:
  - Modify `docs/changes/gin-console-38i-gantt-zoom/05-tests.md` (TC-1 and TC-2 evidence)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** a person runs the manual cases and the evidence is recorded as text.
- **Human gate**: a person opens the built console on a laptop and a phone, in light and dark, and runs TC-1 and TC-2 of `05-tests.md` (mouse drag, trackpad and swipe cannot be checked in jsdom).
- **Acceptance criteria**: TC-1 and TC-2 have dated evidence naming the build checked and the result on laptop and phone, light and dark.
- **Estimated complexity**: low

- [ ] **Step 1:** Build and serve the branch: `pnpm -C frontend build`, then start the console on a free port with a config listing gin-console and gin-workflow (8700 may be in use by another console process; never stop it), or run `pnpm -C frontend dev --port <free port>` against the console on 8700.
- [ ] **Step 2:** The person checks TC-1 on `gin-workflow-8w27` and on a milestone of 4 weeks or more (a kick-start preview of a planned milestone works when none is that long): each zoom leaves no empty area right of the last day; `2 weeks` opens on the Monday of today's week; mouse drag, trackpad scroll and phone swipe move the days in view and the label follows; ‹ › land on Mondays and disable at the ends; a drag that starts on an epic id does not open it; reload keeps `zoom`.
- [ ] **Step 3:** The person checks TC-2 on the same milestones: each label shows the title on one line and the id, period and estimate on the next, cut with an ellipsis on a phone; an arrow runs from `gin-workflow-rm-cost-control` to `gin-workflow-dura`; pointing at or tabbing into an epic highlights its chain and fades the rest; `gin-workflow-rm-cost-control` expands to four closed tracks `.1` to `.4` with their closing dates, and collapsing leaves the other epics as they were.
- [ ] **Step 4:** Record the results in the TC-1 and TC-2 evidence cells and commit `docs(specs): record gin-console-38i Gantt check (gin-console-38i.3)`. Stop the console or dev server started in Step 1.

## Integration
- **Branch**: `feat/milestone-gantt-zoom` (holds the spec commit `1aeeab8`)
- **Merge strategy**: sequential (Track 1 → Track 2 → Track 3)

## Validation
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `gin-workflow specs trace --change gin-console-38i` reports every REQ covered
- [ ] TC-1 passed on laptop and phone, light and dark
- [ ] TC-2 passed on laptop and phone, light and dark

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog using the route rubric.
- The code in this plan was built and checked in a scratch worktree on 2026-11-01 against `1aeeab8`: 458 frontend tests, typecheck, lint and build passed, and screenshots of `gin-workflow-8w27` at 1440 px and 390 px matched the mockup. Diffs apply to `1aeeab8`.
- Arrows of several epics that end on the same day share a vertical run on that day's boundary; the chain highlight tells them apart. A routing that spreads them is the upgrade if it ever confuses.
- Expanded epics live in component state: a refresh and a zoom change keep them, a reload forgets them (keeping them in the URL is a non-goal).
- The Parent Bead `gin-console-38i` stays open until a human-confirmed merge; track beads close after tests and review pass.
