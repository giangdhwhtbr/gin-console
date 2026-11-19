# Plan: Readable UI

Epic: gin-console-3rr
Spec: `01-proposal.md`, `02-spec-delta.md` and `03-design.md` in this folder. Audit: report and scripts copied to `audit/` in this folder (`report.md`, `run.js`, `inpage.js`, `agg.js`, `pages.js`); screenshots stay in `/tmp/ui-audit/full/` and `/tmp/ui-audit/shots/` while they last.

## Objective
No text in the console overlaps other text or chart shapes, spills without an ellipsis, or falls under 4.5:1 contrast; facts read as label/value pairs; status, priority and size stand out on the bead page, List rows, cards and the Gantt; the Gantt label column is wider on wide windows.

Done when:
- Every scenario of REQ-UI-110 (ADDED) and REQ-UI-004, REQ-UI-028, REQ-UI-065, REQ-UI-095, REQ-UI-109, REQ-MILESTONE-UI-013 (MODIFIED) has a test that names its REQ.
- `gin-qa cases check --change gin-console-3rr` prints `ok`.
- TC-1 passes on the deployed console: the readability check finds nothing on the listed pages, widths and themes.

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
- **Problem statement:** the audit of 2026-11-19 found Gantt text over bars and lines, an undifferentiated grey meta line on the bead page, raw status values, plain priorities, points hidden or muted, a Reports table cell running under the next column, a cut tab list without a hint, and a 3.1:1 label.
- **Success criteria:**
  - Everything in the Objective.
  - Frontend test, typecheck, lint and build pass; the existing e2e suites (`npx playwright test --trace off`) stay green.
  - `gin specs lint --change gin-console-3rr --against master` prints `ok`; `gin specs trace --change gin-console-3rr` lists no missing REQ.
- **Global constraints** (from the spec and the user's decisions):
  - Presentation only: no API or data change.
  - Bead page: badge row (state mark "In progress", `P<n>` pill, size badge), points reason on its own line, label/value fact grid (Owner, Assignee, Created by, Created, Updated, Comments), dates "11 May 2026 16:00" without seconds; the details panel the same.
  - Priority pill: P0 destructive, P1 warning, P2+ neutral. Size badge: "<p> pt", else "<n>d" from `estimate_minutes`, else nothing.
  - Gantt label column fixed by window width: 300px under 1280, 380px from 1280, 440px from 1600; second line id, size, period, closed tracks, prep, spec, cut with an ellipsis from 1024px; spec item dropped when a `spec_not_ready` warning shows; tail titles cut before the next end/today line or chart edge; nothing from the chart crosses the label column.
  - Facts: label `text-muted-foreground` smaller, value `text-foreground` heavier. Contrast ≥ 4.5:1 (3:1 large) in light and dark.
  - Badges next to a title give way before the title (`min-w-0 shrink truncate`, `.planning/knowledge/beads-filters-and-epic-kind.md`); fixed-column lists switch by container query (`.planning/knowledge/container-queries-for-lists.md`).
  - No new dependency. New and changed tests carry their REQ-ID.
- **Non-goals:** Graph node content, a resizable Gantt column, a color redesign.

## Approach Options
### Option 1: shared presentation pieces applied everywhere
- **Summary:** `FactList`, `PriorityPill`, `SizeBadge`, `factDate` in shared places, used by the bead page, details panel, List rows, cards, the Gantt and the milestone velocity line; targeted layout fixes in the Gantt and Reports; the audit detector kept as a Playwright check.
- **Pros:** one look across pages; regressions caught by the check.
- **Cons:** touches many components in one epic.

### Option 2: local fixes per page
- **Summary:** restyle each place on its own.
- **Pros:** smaller diffs per file.
- **Cons:** drift between pages; no guard against new overlaps.

### Recommended Approach
- **Selected option:** Option 1, confirmed in discuss on 2026-11-19.
- **Rationale:** the same three patterns (facts, priority, size) repeat across pages, and the overlap check makes the fix last.

## Scope
- **In scope:** everything in the Objective and Global constraints.
- **Out of scope:** the non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (shared pieces and Beads views), Track 3 (Reports and Projects) and Track 5 (QA cases) share no file and run together; Track 2 (Gantt and milestone velocity line) reuses Track 1's SizeBadge and FactList and starts after it; Track 4 (readability check) runs after Tracks 1-3 so it can pass; Track 6 checks the merged branch on the deployed console.
```

## Tasks

### Track 1: Shared pieces, bead page, details panel, List rows and cards
- **Dependencies**: none
- **Requirements**: REQ-UI-110, REQ-UI-028, REQ-UI-065, REQ-UI-109
- **Files**:
  - Create `frontend/src/components/FactList.tsx`, `frontend/src/components/PriorityPill.tsx`, `frontend/src/components/SizeBadge.tsx`
  - Create `frontend/src/lib/dates.ts` (`factDate`)
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:120-190` (badge row, reason line, fact grid; remove the `" · "` meta line)
  - Modify `frontend/src/features/beads/DetailsPanel.tsx` (same presentation as the page)
  - Modify `frontend/src/features/beads/ListRow.tsx` (SizeBadge at every width, PriorityPill, label chips `truncate` + `title`)
  - Modify `frontend/src/features/beads/BeadCard.tsx` (SizeBadge on the last line, PriorityPill)
  - Test `frontend/src/components/{FactList,PriorityPill,SizeBadge}.test.tsx`, `frontend/src/lib/dates.test.ts`, `frontend/src/features/beads/{BeadDetailPage.test.tsx,DetailsPanel.test.tsx,ListView.test.tsx,BoardView.test.tsx}`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded presentation work with exact texts in the scenarios, following existing badge and state-mark components.
- **Acceptance criteria**:
  - Scenarios REQ-UI-028 "Badges and facts", REQ-UI-065 "Card with points", REQ-UI-109 (all, incl. "Size at every width"), REQ-UI-110 "Priority pill" and "Facts as label and value" (bead page part) have passing tests naming them; existing tests updated only where the spec changed the text.
  - test, typecheck, lint, build pass.
- **Estimated complexity**: medium

Interfaces produced (Tracks 2 and 3 consume):
```tsx
export type Fact = { label: string; value: React.ReactNode; title?: string };
export function FactList({ facts, layout }: { facts: readonly Fact[]; layout?: "grid" | "inline" }): JSX.Element; // <dl>, label muted xs, value text-foreground font-medium
export function PriorityPill({ priority }: { priority: number }): JSX.Element;   // "P<n>", P0 destructive, P1 warning, else neutral
export function SizeBadge({ points, estimateMinutes, suffix }: { points: number | null; estimateMinutes?: number | null; suffix?: string }): JSX.Element | null; // "<p> pt" | "<n>d" | null; suffix e.g. "11d left" appended as " · 11d left"
export function factDate(iso: string): string; // "11 May 2026 16:00" in the browser's time zone, no seconds
```

Steps:
1. Unit tests for the four pieces (texts, classes for colors, null cases) and the page/row/card scenarios above. Run `pnpm -C frontend test --run src/components src/lib src/features/beads` (fails).
2. Implement the pieces; apply them to the bead page (state via `StateMark`, `PriorityPill`, `SizeBadge`, reason line, `FactList` grid), details panel, List row (SizeBadge visible at every width, giving way before the title), BeadCard, label chips. Run the tests (pass).
3. `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass. Commit: `git commit -m "feat(ui): facts, priority and size badges on the bead page, rows and cards (gin-console-3rr)"`

### Track 2: Gantt label column, tails and lines; milestone velocity facts
- **Dependencies**: Track 1 (`SizeBadge`, `FactList`)
- **Requirements**: REQ-MILESTONE-UI-013, REQ-UI-110
- **Files**:
  - Modify `frontend/src/features/milestones/GanttChart.tsx:360-505` (label column width by window, second line order and truncation, spec item rule, tail title clamp, label column as an opaque layer above lines/arrows/bars, header End label placement)
  - Modify `frontend/src/features/milestones/gantt.ts` (helpers for the tail width: distance to the next end/today line or chart edge)
  - Modify `frontend/src/features/milestones/MilestoneVelocity.tsx` (`FactList` inline; same texts)
  - Test `frontend/src/features/milestones/{GanttChart.test.tsx,gantt.test.ts,MilestonePage.test.tsx}`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `high`
- **Why:** intricate layout in a scrolling, zoomable chart (sticky layer order, tail width against lines and edges, header label collisions) with many edge cases; checked in a real browser.
- **Acceptance criteria**:
  - Scenarios REQ-MILESTONE-UI-013 "Wide window" and "Tail title stops at the end line" plus the existing ones have passing tests naming them.
  - With an ad-hoc Playwright run of the audit detector (`docs/changes/gin-console-3rr-readable-ui/audit/inpage.js`) on a built UI against a temporary console (port 8714, project `example` regenerated into /tmp, and `qwikfone`), the Gantt at 1024, 1440, 1920 and 2000px in each zoom shows no overlap of label text with bars, lines, arrows or tails, and no "End" label over a month label; numbers and screenshots in the report.
  - test, typecheck, lint, build pass.
- **Estimated complexity**: high

Steps:
1. Tests: label column width classes by breakpoint; second line order (id, size badge with "· 11d left", period, closed, prep, spec) and `min-w-0 truncate` items; no spec item when `spec_not_ready` is among the warnings; `tailWidth(barEnd, lines, chartEnd)` in `gantt.ts`; velocity line through `FactList` with the REQ-MILESTONE-UI-021 texts unchanged. Run `pnpm -C frontend test --run src/features/milestones` (fails).
2. Implement; build; measure with the detector as in the acceptance criteria; iterate until clean.
3. `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass. Commit: `git commit -m "fix(milestones): readable gantt labels, tails and lines (gin-console-3rr)"`

### Track 3: Reports and Projects readability
- **Dependencies**: none
- **Requirements**: REQ-UI-095, REQ-UI-004, REQ-UI-110
- **Files**:
  - Modify `frontend/src/features/reports/UsageSection.tsx` (member/email cells `truncate` + `title`, no overlap with the tokens column)
  - Modify `frontend/src/features/reports/ReportsPage.tsx` (tab list edge fades from scroll position)
  - Modify `frontend/src/features/reports/team/*` and `frontend/src/features/reports/velocity/*` where milestone ids/labels render under 4.5:1 (audit C1)
  - Modify the Reports chart components flagged R1–R4 in the audit report (more margin or angled ticks)
  - Modify `frontend/src/features/projects/ProjectCard.tsx` (blocked > 0 in the warning color with an icon)
  - Test `frontend/src/features/reports/{ReportsPage.test.tsx,sections.test.tsx}`, `frontend/src/features/projects/ProjectsPage.test.tsx`
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** several small, independent presentation fixes with exact scenarios and audit evidence per item.
- **Acceptance criteria**:
  - Scenarios REQ-UI-095 "Hidden tabs are hinted", REQ-UI-004 "Blocked work stands out" and REQ-UI-110 "Contrast" (class-level) have passing tests naming them.
  - The audit detector on the Reports and Projects pages (390, 768, 1024, 1440 px, both themes, `example` and `qwikfone`) shows none of R1–R6, C1 or the Projects item; numbers in the report.
  - test, typecheck, lint, build pass.
- **Estimated complexity**: medium

Steps:
1. Tests as above. Run `pnpm -C frontend test --run src/features/reports src/features/projects` (fails).
2. Implement; build; run the detector on a temporary console (port 8715) and iterate.
3. Full frontend checks pass. Commit: `git commit -m "fix(reports): readable tables, tab hints and contrast; blocked work stands out (gin-console-3rr)"`

### Track 4: Readability check as a Playwright spec
- **Dependencies**: Track 1, Track 2, Track 3
- **Requirements**: REQ-UI-110
- **Files**:
  - Create `qa/e2e/support/readability.ts` (the audit's in-page detector as a typed helper: `readabilityFindings(page): Promise<Finding[]>` for overlap, spill and contrast, with the audit's false-positive filters)
  - Create `qa/e2e/ui/readability.spec.ts` (stubbed example data via `qa/e2e/support/api.ts`; pages Projects, Beads List/Board/Focus/Graph, bead page, My Tasks, Milestones, milestone Gantt (each zoom)/Beads/Retro, Reports each tab; widths 390, 1024, 1440, 1920; light and dark; expects no finding)
  - Create `qa/e2e/readability-live.js` (the same helper against a running console URL with real projects, for TC-1; prints findings as JSON)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** port proven scripts into a typed helper and a spec with the existing e2e fixtures.
- **Acceptance criteria**:
  - `npx playwright test qa/e2e/ui/readability.spec.ts --trace off` passes on the merged branch (built UI on :8701), and fails when a known overlap is reintroduced (temporarily revert one Track 2 class locally to prove it, then restore; not committed).
  - Existing e2e suites still pass.
- **Estimated complexity**: medium

Steps:
1. Port `docs/changes/gin-console-3rr-readable-ui/audit/inpage.js` into `readability.ts`; write the spec with stubs; run it (pass); prove it fails on a reintroduced overlap; restore.
2. Commit: `git commit -m "test(e2e): readability check for overlap, spill and contrast (gin-console-3rr)"`

### Track 5: QA cases
- **Dependencies**: none
- **Requirements**: REQ-UI-110, REQ-UI-004, REQ-UI-028, REQ-UI-065, REQ-UI-095, REQ-UI-109, REQ-MILESTONE-UI-013
- **Files**:
  - Create cases under `qa/cases/ui/` and `qa/cases/milestone-ui/` for each new scenario
  - Modify and re-pin the existing cases of the modified REQs (texts that changed: REQ-UI-109 "Technical epic", "Partial day", "Pointed epic" now say size badge)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** mechanical case writing from written scenarios.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-3rr` prints `ok`; `gin-qa cases check` shows no new finding.
- **Estimated complexity**: low

Steps:
1. `gin-qa cases plan --change gin-console-3rr`; write, update and re-pin per `qa/guidelines.md`.
2. Commit: `git commit -m "test(qa): cases for the readable UI (gin-console-3rr)"`

### Track 6: Check on the deployed console
- **Dependencies**: Track 1, Track 2, Track 3, Track 4, Track 5
- **Requirements**: REQ-UI-110, REQ-UI-028, REQ-UI-065, REQ-UI-109, REQ-UI-004, REQ-UI-095, REQ-MILESTONE-UI-013
- **Files**:
  - Modify `docs/changes/gin-console-3rr-readable-ui/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** run the written check and record it.
- **Acceptance criteria**: TC-1 is recorded as pass, claude (Playwright on the deployed build of <commit>, n/n checks, screenshots in qa/evidence/<date>-3rr-tc1).
- **Estimated complexity**: low

Steps:
1. Deploy the merged branch (`pnpm -C frontend build && uv --directory backend sync && systemctl --user restart gin-console`, `/api/projects` 200).
2. Run `qa/e2e/readability-live.js` on `example` and `qwikfone` at 390, 1024, 1440, 1920 in both themes (no finding), screenshot the Gantt of `ex-m2` at 2000px and the bead page of `ex-e3`, record TC-1 and commit: `git commit -m "test(specs): TC-1 passed by Playwright (gin-console-3rr)"`

## Integration
- **Branch**: `feat/gin-console-3rr-readable-ui`
- **Merge strategy**: parallel-then-merge (tracks 1, 3, 5 in worktrees on `feat/gin-console-3rr-readable-ui-t<N>`; Track 2 after Track 1 merges; Track 4 after 1–3; merge order 1, 3, 5, 2, 4; Track 6 on the merged branch)
