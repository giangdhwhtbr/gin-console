# Design: One set of definitions

Epic: gin-console-rm-definitions

## Architecture

The backend owns the definitions, and the frontend only renders them.

- **`backend/src/gin_console/beads/definitions.py`** (new) is the one home of the rules, next to `snapshot.py`:
  - `is_blocked(ident, row, snapshot)`: the bead is not closed, and its status is `blocked` or it is in `snapshot.blocked`. Moved from `beads/source.py:168`.
  - `is_done(row)`: the status is `closed`.
  - `counts_toward(row)`: not a merge gate and not a milestone.
  - Prep tasks keep `beads.prep.is_prep` and are counted apart.
  - `child_counts(snapshot)`: per bead, its direct tracks and prep tasks and the closed ones, over the whole export.
  - `person_key(value)`: trimmed, lower-cased, cut before the first `@`.
- **Callers:**
  - `projects/source.py:34` (`count_beads`): `blocked` uses `is_blocked`, and `in_progress` leaves blocked beads out.
  - `beads/source.py`: `blocked` and the new `child_counts` field on the list and detail models (the detail's `children` list stays as it is) (`beads/models.py`).
  - `reports/source.py`: `ReportBead` gains `blocked` from the snapshot.
  - `reports/team.py:105-122`: buckets and `blocked` per REQ-REPORTS-009 and REQ-REPORTS-010. Members are grouped by `person_key`, replacing `member_of` (`reports/service.py:58`).
  - Reports already imports `beads.prep`, `beads.lanes` and `beads.snapshot`, so this follows an existing pattern.
- **Frontend:**
  - `features/beads/columns.ts`: `boardColumn` checks closed, then blocked, then deferred, ready and working. Focus does the same. Column headers count prep tasks apart.
  - One `progressOf(bead)` reads `bead.child_counts` and replaces `graph.ts` `progressOf`, `epicOverview.ts` `epicProgress` and `prep.ts` `childCounts`. Its users are List rows, Graph nodes, Lanes, the bead page, the epic Progress card and the Gantt.
  - `lib/people.ts`: `personOf` (the same rule as `person_key`, with the same test cases) and `matchesMe`. My Tasks `match.ts` uses it.
  - `ListRow.tsx:122`, `BeadCard.tsx:36`, `filters.ts:94` (`effectiveAssignee`), `columns.ts:79` and `TracksTable.tsx:85` drop the owner fallback and show "Unassigned".
  - `BeadHeader.tsx` drops the Owner fact.
  - `milestones/MilestoneStatus.tsx` is the only status mark. The copies in `beads/MilestoneCard.tsx:12` and `reports/team/MilestoneLine.tsx:6` go.
  - `milestones/late.ts` (`lateOf`) is used by the Milestones list, `MilestoneCard`, `MilestoneLine` and `headlines.ts`.
  - `lib/dates.ts`: `formatDate`, `formatDateTime` and `formatRange` replace:
    - `reports/team/format.ts:28` `formatDate`;
    - `milestones/format.ts` `shortDate`;
    - `factDate`;
    - `toLocaleDateString` and `toLocaleString`.
    - `lib/format.ts` keeps the relative time for freshness only.
  - `components/ui/tooltip.tsx` wraps base-ui `Tooltip`. `components/Legend.tsx` wraps base-ui `Popover`. Both come from `@base-ui/react`, which the frontend already depends on.
  - `lib/definitions.ts` holds the one-sentence texts that the tooltips and the Legend share.
- **Data shape:** `child_counts` adds four integers per bead. The answer is gzipped and keeps its ETag (REQ-BEADS-014).

## Data Flow

- `docs/specs/beads/diagrams/bead-counts-activity.md`: how a bead is classed and counted, from the snapshot to the page.
- `docs/specs/beads/diagrams/bead-state.md`: the state shown for a bead, with blocked first.
- `docs/specs/beads/diagrams/me-filter-activity.md`: Me, Unassigned and one entry per person in the Assignee filter.
- `docs/specs/milestone-ui/diagrams/milestone-state.md`: the milestone status.
- `docs/specs/milestone-ui/diagrams/milestone-status-activity.md`: how each page shows a milestone's status and late mark.
- `docs/specs/ui/diagrams/legend-tooltip-activity.md`: tooltip on hover or focus, and the Legend on click or tap.

## Error Handling

- Dependencies with the wrong types and blockers outside the export (`external:`) are handled as REQ-BEADS-007 and REQ-BEADS-010 handle them today.
- `child_counts` is always present, with zeros for a bead without children. A bead whose parent is missing from the export counts for no one.
- If `GET /api/beads/milestones` fails, the bead page of a milestone shows its bead status. The milestone card keeps "Milestones unavailable" with Retry.
- If the Milestones list fails on Reports, the Team tab applies the late rule without the forecast: closed after the end, or open past the end. The Velocity tab shows its error as today.
- A value that is not a valid date is shown as it is, never as "Invalid Date".

## Testing

- **Backend (pytest), each test naming its REQ:**
  - `definitions.py` units: status `blocked` without a blocker, in-progress with an open blocker, a blocked ancestor, an `external:` blocker, merge gates and milestones left out, prep counted apart, `child_counts` with closed children hidden, and `person_key`.
  - The scenarios of REQ-SERVER-006, REQ-REPORTS-009 and REQ-REPORTS-010.
  - One fixture checks that the Projects `blocked` equals the number of listed beads with `blocked` true that are not prep tasks or milestones, and that the Team `blocked` of a milestone over the same beads differs only by the epics with tracks that the Team scope leaves out (REQ-REPORTS-009).
- **Frontend (vitest):**
  - `boardColumn` order.
  - Column counts with prep.
  - `progressOf` with "Show closed" off.
  - `personOf` with the cases shared with the backend.
  - The Assignee filter with Me, Unassigned and old email links.
  - The owner never shown.
  - `MilestoneStatus` on the bead header and the Graph node.
  - `lateOf`.
  - The date helpers for the current year, other years, ranges and a non-UTC time zone (`TZ` set in the test).
  - Tooltip on focus and Escape.
  - Legend open and close with focus return.
  - The PM labels.
  - Existing tests that pin the owner fallback (`BeadCard.test.tsx:53`), "No assignee", "Say/do", "d/pt" or `toLocaleDateString` output are updated to the new REQ text.
- **QA:** gin-qa cases per REQ in `qa/cases/{beads,ui,reports,milestone-ui}`. TC-1 (`05-tests.md`) runs Playwright on the Tailscale build:
  - at 1440px and 390px;
  - with `scripts/make_example_project.py` extended with a status-`blocked` bead, a blocked in-progress bead, the child of a blocked epic, beads assigned by handle and by email, and a late active milestone.

## Risks

- **Numbers move.** Projects and Team blocked counts rise, and In Progress counts fall. The tooltip and the Legend state each rule next to its number.
- **REQ-UI-095 is also changed by gin-console-5c4** (removing the AI usage and Data coverage tabs). Whichever change archives second must take the other's text and refresh its `base:` hash with `gin specs hash`.
- **One more request on Reports:** the Milestones list now loads with the Team tab. It already loads for the Velocity tab, and REQ-UI-095 requests it at most once per project and refresh.

## Open Technical Questions
