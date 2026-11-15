# Design: Milestone catch-up with gin-workflow

Epic: gin-console-workflow-catchup

## Architecture

- **Backend (`backend/src/gin_console/milestones/models.py`)**
  - `MilestoneDetail` gains `integration: IsoDate | None = None`, `deadline: IsoDate | None = None` and `away: dict[str, list[str]] = {}`. `away` is passed through as gin prints it; each value is a list of `YYYY-MM-DD` or `YYYY-MM-DD..YYYY-MM-DD` strings.
  - `EpicPlan` gains `remaining_days: int | None = None` and `assumed_days: int | None = None`.
  - The router and source are unchanged, because they already return the validated model.
- **Frontend: milestone API (`frontend/src/features/milestones/api.ts`)**
  - The types and shape checks gain the same fields.
  - A missing key reads as `null`, or `{}` for `away`, so an older gin-workflow still works.
- **Frontend: Retro tab**
  - `features/milestones/retro.ts` (new) is a pure parser:
    - `parseRetros(comments, milestoneId)` returns `{ close: CloseEntry | null; retros: RetroEntry[]; unparsed: RawEntry[] }`.
    - A comment matches when its text starts with `[gin close] <id>` or `[gin retro] <id> <member>`, where `<id>` is compared exactly.
    - Labels are found at line starts, as `Label:` followed by text up to the next label line.
    - The newest close wins. Retros keep the newest comment per member, sorted by member.
    - A matching comment with no known label goes to `unparsed`.
  - `features/milestones/RetroTab.tsx` (new):
    - It loads the comments with the existing `fetchComments(project, id)` from `features/beads/api.ts` and handles loading, error and Retry.
    - It renders the close block (author, date, each present label) and the retro cards.
    - Label text uses `MarkdownText`, as the bead text does.
  - `MilestonePage.tsx`:
    - `TABS` gains `retro`, and `milestonePath`'s `MilestoneTab` gains `"retro"`.
    - The tab label is "Retro" plus the member count. The count comes from the same comments load, through a small hook shared with RetroTab so the comments load once per page.
- **Frontend: Gantt and header**
  - In `gantt.ts`, `warningLines` gains cases for:
    - `spec_due`;
    - `after_integration`, which uses `plan.integration`, so `warningLines` takes the plan's integration date;
    - `open_bugs`, which uses `count`;
    - `oversized`, which uses `days`.
    
    The warning type gains `count?: number`.
  - `GanttChart.tsx`: the estimate text reads `"<n>d left"` when the status is `in_progress` and `remaining_days < estimate_days`, and `"assumed <n>d"` when `estimate_days` is null and `assumed_days` is set. Otherwise it is unchanged.
  - `MilestoneHeader` in `MilestonePage.tsx` shows Integration, Deadline and Away after the lanes. A helper `awayLine(away, today)` formats the ranges with `shortDate`.
- **Reports**: `reports/team/TeamSection.tsx:35` changes its command to `gin milestone create`.

## Data Flow

- Retro tab: see `docs/specs/milestone-ui/diagrams/milestone-retro-activity.md`.
- Schedule facts: `gin milestone show --json` → `MilestoneDetail` → `GET /api/milestones/{p}/{id}` → the header and the Gantt.

## Error Handling

- **Comments fail to load:** the Retro tab shows the error with Retry, and the other tabs are unaffected. The tab label shows no count until the comments load.
- **Malformed `away`:** a range that is not a date or `date..date` is shown as its raw string.
- **Older gin-workflow without the new keys:** the fields default to null or `{}`, and the UI shows nothing for them (REQ-MILESTONE-UI-020 "Older gin-workflow").

## Testing

- **pytest:** `test_milestones_api.py`, scenario "schedule facts" (REQ-MILESTONE-UI-008), plus an older output without the keys.
- **vitest:**
  - `retro.test.ts` (REQ-MILESTONE-UI-019): close and retros, newest per member, another milestone's retro ignored, not in the expected format, and labels across lines.
  - `RetroTab.test.tsx`: tab count, empty state, and error with Retry.
  - `gantt.test.ts`: the four warning sentences (REQ-MILESTONE-UI-003).
  - `GanttChart.test.tsx`: "2d left" and "assumed 3d" (REQ-MILESTONE-UI-013).
  - `MilestonePage.test.tsx`: the header with integration, deadline and away, and the older output (REQ-MILESTONE-UI-020); `tab=retro` (REQ-MILESTONE-UI-018).
  - `ReportsPage.test.tsx`: `gin milestone create` (REQ-REPORTS-017).
- **TC-1:** run with Playwright against a copy of the example project that has retro and close comments and integration and away metadata.

## Open Technical Questions
