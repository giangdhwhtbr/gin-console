# Design: Readable UI

Epic: gin-console-3rr

## Architecture

- **Shared pieces (`frontend/src/components/`, one component per file)**:
  - `FactList.tsx`: a `<dl>` of label/value pairs; `layout: "grid" | "inline"`; labels `text-xs text-muted-foreground`, values `text-sm text-foreground font-medium`; used by the bead page, the details panel and `MilestoneVelocity` (inline).
  - `PriorityPill.tsx`: `P<n>` pill; P0 destructive, P1 warning, P2+ neutral; used by List rows, cards and the bead page.
  - `SizeBadge.tsx`: "<p> pt" or "<n>d" (from `estimateText`), nothing when neither; used by List rows, Board/Focus cards, the bead page and the Gantt label.
  - `frontend/src/lib/dates.ts` (or the existing date helper if one exists): `factDate(iso) = "11 May 2026 16:00"`.
- **Bead page (`features/beads/BeadDetailPage.tsx`) and details panel (`DetailsPanel.tsx`)**: the state via `StateMark` (REQ-UI-064), `PriorityPill`, `SizeBadge` in one row with the type and kind badges; the points reason line; `FactList` grid for owner, assignee, created by, created, updated, comments; the `" · "`-joined meta line goes.
- **List row (`ListRow.tsx`), Board/Focus card (`BeadCard.tsx`)**: `SizeBadge` at every width (it gives way before the title as the other items, REQ-UI-044); `PriorityPill` in place of plain `P<n>`; label chips `truncate` with `title`.
- **Gantt (`features/milestones/GanttChart.tsx`, `gantt.ts`)**:
  - Label column width from the window: 168px under 1024px, `300px` from 1024px, `380px` from 1280px, `440px` from 1600px (and the chart offset that depends on it).
  - Second line: `min-w-0 overflow-hidden`, items `min-w-0 shrink truncate` except the id; order id, `SizeBadge` + days left, period, closed tracks, prep, spec; the spec item is left out when the epic's warnings include `spec_not_ready`.
  - Tail title (`data-tail`): max width = distance from the bar end to the next end/today line or chart edge minus a gap, `truncate`; the label column is an opaque sticky layer above the chart (z-index) so scrolled tails, lines and arrows pass under it.
  - Header: the "End <date>" label is placed on the day row or offset so it never shares space with a month label.
- **Milestone page (`MilestoneVelocity.tsx`)**: the same texts rendered through `FactList` inline (label muted, value strong).
- **Reports**: `UsageSection` tables cut the member/email cell with `truncate` + `title`; the tab list (`ReportsPage.tsx`) gets edge fades driven by its scroll position; milestone ids in the Team and Velocity tabs use `text-muted-foreground` at ≥4.5:1 (or `text-foreground`); chart labels that touch get more margin or angle.
- **Projects (`ProjectCard.tsx`)**: blocked > 0 in `text-warning` with an icon.
- **Readability check (`qa/e2e/support/readability.ts` + `qa/e2e/ui/readability.spec.ts`)**: the audit's in-page detector (text runs via `Range.getClientRects`, overlap with other runs and with chart shapes, spill without ellipsis, WCAG contrast) as a helper; a Playwright spec that stubs the example data with `stubApi` (REQ-UI-110 "No overlapping text") on the key pages at 390/1024/1440/1920 in both themes; the same helper runs against the deployed console in TC-1.

## Data Flow

No data change; see `docs/specs/ui/diagrams/readability-check-activity.md` for the check.

## Error Handling

- Missing points and estimate: `SizeBadge` renders nothing.
- Missing dates: the fact is left out of the grid.
- Unknown priority (outside 0–4): neutral pill.
- The check's known false positives (text clipped by an ellipsis, sr-only text, fixed bottom navigation over content at 390px) are filtered as in the audit scripts.

## Testing

- **vitest**: `FactList`, `PriorityPill`, `SizeBadge`, `factDate` units; `BeadDetailPage.test.tsx` "REQ-UI-028 Badges and facts"; `BoardView`/`BeadCard` "REQ-UI-065 Card with points"; `ListView.test.tsx` "REQ-UI-109 Size at every width" and "REQ-UI-110 Priority pill"; `ProjectsPage.test.tsx` "REQ-UI-004 Blocked work stands out"; `ReportsPage.test.tsx` "REQ-UI-095 Hidden tabs are hinted"; `GanttChart.test.tsx` "REQ-MILESTONE-UI-013 Wide window / Tail title stops at the end line" (class and structure contracts).
- **Playwright**: `qa/e2e/ui/readability.spec.ts` (REQ-UI-110 "No overlapping text", "Contrast") with stubbed data; the existing e2e suites stay green.
- **QA**: cases for new scenarios, re-pin the modified REQs' cases.
- **TC-1**: the readability check on the deployed console with `example` and `qwikfone`, 390/1024/1440/1920 px, light and dark, plus screenshots of the Gantt at 2000px and the bead page.

## Open Technical Questions
