# Milestones forecast

Epic: gin-console-cl0
Date: 2026-11-08

## Why
gin-workflow `milestone-forecast` (gin-workflow-57fw, merge 6b27ce6, shipped 2026-11-08) schedules a project's open roadmap epics on lanes, where one lane works on one epic at a time. `gin-workflow milestone list --json` now returns a top-level `forecast` and a `lanes` count for each milestone. `milestone show --json` returns `lanes` and lane-bound planned dates. The contract is in gin-workflow `.planning/specs/2026-11-08-roadmap-deadline-forecast-design.md`, R4 and R5.

The console does not show any of this. The API also drops the new keys, because `response_model` removes undeclared fields. A reader cannot see when the project will finish, how that compares with the roadmap deadline, or how many lanes each milestone runs on.

Scope decided 2026-11-08 (user): an additive change that keeps the current layout. A full page redesign or visible lane rows on the Gantt are out of scope.

## What Changes
1. **Backend**:
   - `MilestoneList` gains `forecast: Forecast | None`.
   - `MilestoneEntry` and `MilestoneDetail` gain `lanes: int | None`.
   - All three default to `None`, so output from an older gin-workflow still validates.
2. **Forecast card**: above the milestone list, the page shows when the project finishes, how that compares with the deadline (spare or overflow working days), the default lanes, open epics, unestimated epics, and the forecast `error`. The card is hidden when there is no forecast.
3. **List**: each milestone row shows its lanes and its forecast finish. The finish is marked when it falls after the milestone end.
4. **Milestone page**: the header shows the milestone's lanes. The Gantt keeps drawing the dates from `show`, which are now lane-bound.
5. **Bead text as Markdown** (added 2026-11-08, user): the bead page renders the description, acceptance criteria, design, notes and close reason as Markdown instead of plain pre-wrapped text. Bead text is written in Markdown by agents and people, and as plain text its headings, lists and code are hard to read. Raw HTML stays text.
6. **Contract record**: `gin-harness/docs/changes/gin-harness-6s4-milestones/design.md` "## JSON contract" adds `lanes` and `forecast`. This is a separate commit in gin-harness.

## User Stories

### US-1: See the project forecast against the deadline
As a project lead, I want the Milestones page to show when the open roadmap work will finish and how that compares with the deadline, so that I know early whether the project is late and by how much.
REQ: REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-008

Acceptance criteria:
- With a deadline of 31 Dec and a forecast finish of 23 Dec, the card reads "Finishes 23 Dec" and "6 working days spare".
- With a finish 5 working days after the deadline, the card reads "5 working days past the deadline" in the warning color.
- With no deadline, the card reads "No deadline" and shows the roadmap line to add.
- The card shows the default lanes, the open epic count, and the unestimated epic count. The unestimated count is marked when it is above 0.
- A forecast `error` is shown in the card, and the other figures are still shown.
- The card is not shown when `forecast` is null or missing.

### US-2: See lanes and forecast finish per milestone
As a project lead, I want each milestone to show its lanes and its lane-bound finish, so that I can tell which milestone overruns and whether more lanes would help.
REQ: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-017, REQ-MILESTONE-UI-003

Acceptance criteria:
- Each list row shows "2 lanes" (or "1 lane"), or "–" when the entry has no `lanes`.
- Each list row with a `finish` shows "Finishes <date>", in the warning color when the finish is after the milestone end.
- The milestone page header shows "<n> lanes" next to its finish line, and nothing when `lanes` is missing.
- The Gantt bars use the `planned_start` and `planned_end` from `show` as they are.

### US-3: Keep working with an older gin-workflow
As a console user whose gin-workflow is not yet reinstalled, I want the Milestones page to keep working, so that the upgrade order of the two tools does not matter.
REQ: REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-017

Acceptance criteria:
- A `milestone list` payload without `forecast` and `lanes` returns 200, with `forecast: null` and `lanes: null`.
- The page then shows the list as before, with no forecast card and "–" for lanes.

### US-4: Read bead text as formatted Markdown
As a console user, I want a bead's description and text sections rendered as Markdown, so that headings, lists, code and tables written in beads are readable.
REQ: REQ-UI-028, REQ-UI-038

Acceptance criteria:
- A description with `## Change`, a numbered list and a fenced code block shows a heading, a numbered list and a code block.
- Acceptance criteria `- [ ] item` show a disabled checkbox.
- `<script>` and other raw HTML appear as text, and no element is created from them.
- A `javascript:` link is shown as text; an `https` link opens in a new tab.

## Capabilities Affected
| Capability | REQ-IDs | Assets and diagrams |
|---|---|---|
| milestone-ui | ADDED REQ-MILESTONE-UI-016, REQ-MILESTONE-UI-017; MODIFIED REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-003, REQ-MILESTONE-UI-008 | `docs/specs/milestone-ui/diagrams/milestones-forecast-activity.md`; `docs/specs/milestone-ui/assets/2026-11-08/mockup/index.html` |
| ui | MODIFIED REQ-UI-028, REQ-UI-038 (the bead page requirements live in `ui`) | `docs/specs/ui/diagrams/bead-text-markdown-activity.md`; `docs/specs/ui/assets/2026-11-08/mockup/index.html` |

## Non-goals
- No page layout redesign. The mockups only show the added parts.
- No lane rows on the Gantt. The `show` JSON has no lane per epic, and the console does not reschedule.
- No editing of the deadline or lanes. The console stays read-only and shows the roadmap line instead.
- No forecast on the Reports page.
- Comments (REQ-UI-039) and bead titles stay plain text; only the five bead text fields render Markdown.

## Success Criteria
- The forecast card and per-milestone lanes render from the installed gin-workflow output.
- The backend and frontend tests pass with payloads that have the new keys and with payloads that lack them.
- The bead page renders the five text fields as Markdown, with raw HTML shown as text.
- `gin-harness-6s4` JSON contract record lists `lanes` and `forecast`.
