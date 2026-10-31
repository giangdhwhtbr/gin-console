# Design: Milestones

Epic: gin-console-djg

## Architecture
A new `milestones` bounded context, as ADR-0001 prescribes for each roadmap epic; no new ADR.

- **Backend** `gin_console/milestones/{models,source,router}.py`.
  - `source.py` runs `gin-workflow milestone list --all --json` and `gin-workflow milestone show <id> [--start D] --json` in the project directory through the existing `run_json` path (`projects/collect.py`), so Windows keeps running `gin-workflow` through Git Bash and the child environment drops the console's venv. The runner is a `GwRunner` protocol injected into `create_app`, like `BdRunner`; tests inject a `FakeGw`.
  - `models.py` holds pydantic models of the schema 1 JSON contract (`gin-harness/docs/changes/gin-harness-6s4-milestones/design.md`, "JSON contract"). Unknown fields are ignored, so gin-workflow can add fields without breaking the console.
  - `router.py` serves `GET /api/milestones?project=<name>` and `GET /api/milestones/{project}/{id}?start=YYYY-MM-DD`. `start` is typed as a date, so FastAPI rejects anything else with 422 before a command runs. Responses without `start` go through `KeyedCache` (5 s, keyed by project and id); previews bypass it. Project lookup and 404 reuse the beads router's rules.
- **Ready exclusion** (REQ-MILESTONE-UI-007): the rows of `bd ready --json` carry `issue_type` (checked against bd 1.0.5); the two collectors drop rows whose `issue_type` is `milestone`: `projects/collect.py` (ready count and active epics) and `beads/source.py` (`ready` flag). Filtering in code, not with `--exclude-type`, keeps older `bd` versions and the existing fakes working.
- **Frontend** `src/features/milestones/`.
  - `api.ts` and type guards in the style of `features/beads/api.ts`; `useMilestones(project)` and `useMilestone(project, id, start)` in the style of `useBeads` (10 s polling while visible, latest answer wins, a failed refresh keeps the last data); a preview does not poll.
  - `MilestonesPage` (list), `MilestonePage` (header plus Gantt and Graph tabs), `GanttChart`, `KickstartPicker`, `MilestoneError` (cause-specific panel).
  - Routes in `app/App.tsx`: `/milestones?project=<name>` and `/milestones/<project>/<id>?tab=gantt|graph&start=YYYY-MM-DD`; the Gantt tab is the default. A `NAV` entry in `app/Layout.tsx` with the lucide `Flag` icon.
  - Graph tab: loads `/api/beads?project=<name>&closed=1` unfiltered and renders `GraphCanvas` with `scopeGraph(beads, milestoneId, …)`. `holders` already makes the milestone's epics nodes, folds their tasks into them, and turns a bead outside the scope that has an edge into an external node (dashed). Double-click opens the bead page, as on the Dependencies page.
  - Beads views (REQ-MILESTONE-UI-006, -009): `useBeads`, the only loader of the List, Board, Focus (`BeadsView`) and Dependencies (`GraphPage`) views, drops `issue_type === "milestone"`; the milestone Graph tab loads the list without that filter. A milestone's epics then have a parent that is not loaded, which `parentOf` (`graph.ts`) and the List tree (REQ-UI-041) already treat as no parent, so no graph or tree logic changes.
  - Gantt: built with CSS grid and divs; no chart or date library. Dates stay ISO strings from the JSON; day arithmetic uses UTC `Date` values parsed from `YYYY-MM-DD` so the browser's timezone cannot shift a day.
  - Kick-start picker: native `<input type="date">`.

## Data Flow
1. `/milestones?project=P` (default: first configured project; a project `<select>` as on the Beads page) → `GET /api/milestones?project=P` → `milestone list --all --json` → list rows: title, status, `start`–`end`, `kickoff` when set, `closed/total` epics, warning count, or the entry's `error` instead of progress and warnings. Above the list: "N roadmap epics are not in any milestone" from `unassigned_epics`.
2. Row → `/milestones/P/M1` → Gantt tab → `GET /api/milestones/P/M1` → `milestone show M1 --json`.
   - Axis: one column per calendar day from the earlier of `schedule_start` and `start` to the later of `end` and `finish`; weekends shaded; month and day labels.
   - Bars: one row per epic, `planned_start` to `planned_end`, colored by bead status with the state colors the Beads views use.
   - Lines: `today` from the JSON (never the browser's clock) and the milestone `end`.
   - Warnings per epic: `overflow` with its days, `late`, `unestimated`, `external_blocker` with each `external_depends_on` id and its milestone (or "no milestone").
3. Kick-start (only `planned`/`scheduled`): the picker defaults to `kickoff`, else `start`. Picking D sets `?start=D` → `GET /api/milestones/P/M1?start=D` → `show M1 --start D --json` → Gantt redrawn with a "Preview — nothing is written" label and `gin-workflow milestone kickstart M1 --date D` with a copy button. Clearing the date returns to the current plan.
4. Graph tab → `GET /api/beads?project=P&closed=1` → `scopeGraph(beads, M1)` → `GraphCanvas`.

## UI and UX
The pages use the console's existing tokens and type: Geist for text, Geist Mono only for bead ids and commands (as elsewhere), the cool-grey surfaces, and the state colors of `index.css`. No new palette, font, or dependency. The one distinctive element is the Gantt; the list and headers stay as quiet as the Beads pages.

### Tokens used
| Role | Token |
|---|---|
| Surfaces | `--background` page, `--card` chart and list, `--muted` weekend and track fill |
| Not started (`open`) | hollow segment: `--card` fill, `--muted-foreground` outline |
| In progress | `--state-progress` |
| Blocked | `--state-blocked` |
| Closed | `--state-done`, fill at reduced opacity |
| Deferred | `--state-deferred`, diagonal hatch |
| Past the end zone, overflow, warnings | `--state-blocked` (tint at low alpha for the zone) |
| Today and End lines | `--foreground` |

Milestone status marks reuse the `StateMark` pattern (icon plus word, never color alone): planned uses `Clock` in `--state-deferred`, scheduled uses `CalendarClock` in `--state-ready`, active uses `CircleDot` in `--state-progress`, and closed uses `Check` in `--state-done`.

### Milestones list (`/milestones?project=P`)
A table, not cards: milestones are compared row against row. Left aligned throughout.

```
Milestones                                         [ gin-workflow ▾ ]

4 roadmap epics aren't in a milestone yet. Add them with /roadmap --milestone <id>.

  Status       Milestone                    Period               Epics            Warnings
  ◉ Active     Beta readiness   gw-ab1      2 Nov – 18 Dec       ▬▬▬▭▭▭ 2 of 6    ⚠ 2
  ◷ Scheduled  Public launch    gw-ab4      Kicks off 4 Jan      ▭▭▭▭ 0 of 4      —
                                            (5 Jan – 12 Feb)
  ◷ Planned    Hardening        gw-ab7      15 Feb – 26 Mar      Dependency cycle: gw-x → gw-y → gw-x
  ✓ Closed     Alpha            gw-ab0      1 Sep – 30 Oct       6 of 6           —
```

- Order: active, scheduled, planned, then closed, each group by `start`. Closed rows use `--muted-foreground` text.
- The whole row is a link to the milestone page and is keyboard focusable. The title is the link text, and the id sits beside it in mono.
- Period: `start – end`. When `kickoff` is set, it reads "Kicks off 4 Jan" with the period on a second line. Dates use short day-month form, adding the year only when it is not the year of `today`.
- Epics: the existing quota `ProgressBar` shape (thin track) with "2 of 6" in tabular figures.
- Warnings: a `TriangleAlert` icon and count in `--state-blocked`, or an em dash for none.
- Row `error`: replaces the Epics and Warnings cells with the message in `--destructive`.
- Unassigned line: one sentence above the table, shown only when `unassigned_epics` > 0. There is no stat tile.
- Mobile (< md): each row becomes a two-line block: status, title and warnings on the first line; period and "2 of 6" on the second.
- Empty: "No milestones in gin-workflow yet. Create one with `gin-workflow milestone create "<title>" --start <date> --end <date>`." This line has a copy button for the command.

### Milestone page (`/milestones/P/M1`)
```
← Milestones · gin-workflow
Beta readiness                                            gw-ab1
◉ Active   2 Nov – 18 Dec   Finishes 22 Dec, 2 working days past the end

[ Gantt ] [ Graph ]
```
- The header line states the outcome in words: "Finishes 22 Dec, on time" or "…, 2 working days past the end" (the latter in `--state-blocked`). It is built from `finish` and `overflow_days`.
- A `description`, when present, is clamped to two lines, with "Show more" to expand it.
- Tabs: `role="tablist"` with Left/Right arrow keys, generalising `DetailTabs` to take a list of tabs. The selected tab is kept in `?tab=`.

### Gantt tab: epics as beads on a thread
The console's brand mark is three beads on a thread. The Gantt draws each epic the same way, because the scheduler counts working days:
- Each working day of an epic is one rounded segment (a bead).
- A 1px thread in the bar's color joins the segments and runs through weekends.
- Weekends are collapsed to narrow hatched columns without labels.

A 3-day epic is therefore three beads; a bar that crosses a weekend visibly skips it. This is the only decorative idea on the page.

```
Kick-start date [ 2026-11-16 ▾ ]  Reset
┌ Preview from Mon 16 Nov. Nothing changes until you run: ───────────────────────┐
│ gin-workflow milestone kickstart gw-ab1 --date 2026-11-16              [Copy]  │
└───────────────────────────────────────────────────────────────────────────────┘
                         │ November                               │ past end
 Epic                    │ 16 17 18 19 20 ░ 23 24 25 26 27 ░ 30 01 │ 02 03
                         │       ┆today                             ┃End 1 Dec
 ◉ gw-rm-a  Auth flows   │ ●━●━●                                    ┃
   16–18 Nov · 3d        │                                         ┃
 ○ gw-rm-b  Sync API     │       ○━○ ░ ○━○━○                         ┃
   19–25 Nov · 5d        │                                         ┃
 ○ gw-rm-c  Reports      │                              ○━○ ░ ○━○━┃━○━○
   26 Nov–3 Dec · 6d     │                                         ┃
   ⚠ 2 days past the end   ⚠ Blocked by gw-rm-y (in Public launch)
 ◌ gw-rm-d  Docs         │ ◌                                        ┃
   16 Nov · no estimate  │                                          ┃
   ⚠ No estimate
```

- Label column, sticky on the left:
  - The status icon (shape and color) and the id in mono, then the title, truncated with the full title in `title`.
  - A second line with the dates and "Nd" estimate in text, so every bar has a text equivalent.
  - Warning lines underneath as plain sentences in `--state-blocked` with `TriangleAlert`:
    - "2 days past the end"
    - "Late: should have finished 4 Nov"
    - "No estimate"
    - "Blocked by gw-rm-y (in Public launch)", or "(not in a milestone)"; the blocking id links to its bead page.
- Timeline:
  - Day columns are 28px on desktop and 20px under md; weekend columns are 8px.
  - Two-row axis: months, then day numbers.
  - Today: a 1px `--foreground` dashed line with a "Today" chip on the axis, positioned from JSON `today`.
  - End: a 2px solid `--foreground` line with "End 1 Dec". Days after `end` get a faint `--state-blocked` tint, so overflow beads sit visibly in the past-the-end zone without any extra color.
- Row order: `planned_start`, then `planned_end`, then id.
- Unestimated epics: one dashed hollow bead on `planned_start`.
- Scrolling: the timeline scrolls horizontally inside its own container, never the page. On load it opens at `today` when today is in range, else at the schedule start.
- Accessibility:
  - Each row is a list item whose accessible name reads "Sync API, open, 19 to 25 November, 5 working days, no warnings".
  - The beads themselves are `aria-hidden`.
  - Status is never shown by color alone: there is an icon in the label and a hollow, solid, or hatched fill.
- Legend under the chart: the five fills with their status words, the Today line, the End line, and the past-the-end zone.
- Empty milestone: "No epics in this milestone. Add some with `/roadmap --milestone gw-ab1`."

### Kick-start preview
- The picker shows only for `planned` and `scheduled` milestones. It has the visible label "Kick-start date" and uses native `<input type="date">`, which defaults to `kickoff`, else `start`.
- While a preview is shown:
  - A banner above the chart has a dashed `--border` and the copy "Preview from Mon 16 Nov. Nothing changes until you run:", followed by the command in mono and a "Copy" button. After copying, the button reads "Copied" for 2 s.
  - The chart's outer border turns dashed. "Reset" returns to the current plan and clears `?start=`.
- The single motion: when the preview date changes, the beads slide to their new days (transform, 150 ms). It answers the user's pick and shows what moved. It is off under `prefers-reduced-motion`.
- Loading a preview dims the chart and disables the picker until the answer arrives. A failed preview replaces the chart with the error and its Retry, and never leaves the old beads in place.

### Graph tab
The existing Dependencies canvas, toolbar, and node design, scoped to the milestone, with nothing new: epics are solid nodes, and beads from other milestones are the existing dashed external nodes. Above the canvas, one line explains the dashed nodes: "Dashed nodes are outside this milestone."

### Unavailable states
A destructive `Alert` with a title that names the cause and a body that says the fix, with the command in mono and a copy button:

| Cause | Title | Body |
|---|---|---|
| `outdated` | Milestones need a newer gin-workflow | Run `gin-workflow/install.sh`, then reload this page. |
| `tracking` | This project tracks tasks in markdown | Milestones live in Beads. Set `providers.task_tracking: beads` in the project's gin-workflow config. |
| `schema` | gin-workflow reports milestone schema 2 | This console reads schema 1. Update gin-console to read it. |
| other | Milestones couldn't be loaded | The command's message, then Retry. |

### Copy rules
Sentence case, no all-caps labels, and no arrows appended to links. Actions keep one name: "Copy" becomes "Copied", and "Reset" returns to the current plan. Every error says what happened and what to do next.

## Error Handling
| Condition | Server | Page |
|---|---|---|
| Project unknown or directory missing | 404 | error panel |
| `start` not an ISO date | 422, no command runs | not reachable from the picker |
| No `milestone` command: exit 2 with `invalid choice: 'milestone'` | 502, `cause: outdated` | "Milestones need a newer gin-workflow. Run `gin-workflow/install.sh`." |
| stderr names `providers.task_tracking: beads` | 502, `cause: tracking` | "Milestones need `providers.task_tracking: beads` in this project." |
| `schema` is not 1 | 502, `cause: schema` | "gin-workflow reports milestone schema N; this console reads schema 1." |
| `gin-workflow` missing, timeout, invalid JSON, `bd` failure, unknown milestone id, `show` dependency cycle | 502, `cause: null`, `error` from the command | destructive panel with the message and Retry |
| List entry with `error` | 200 | that row shows the error; other rows normal |
| Preview (`start`) fails | 502 | error in the Gantt tab, no bars; the previous plan is not shown |
| Refresh fails after a good load | 502 | the last data stays with an inline error, as `useBeads` does |

Failures are never cached. The `error` text comes from the command's stderr (`milestone error: …`), trimmed as `run_json` does today.

## Testing
Every test names its REQ-ID.

- **Backend (pytest)** with `FakeGw` through `create_app` and JSON fixtures copied from the contract examples: list and show parsing, list entry with `error`, the three causes plus a generic failure, 422 without a command call, preview bypassing the cache, 404 for unknown project (REQ-MILESTONE-UI-008, -005); ready exclusion in `collect.py` and `beads/source.py` with a milestone row in the fake `bd ready` (REQ-MILESTONE-UI-007, REQ-BEADS-007, REQ-SERVER-006).
- **Frontend (vitest)**: list page rows, unassigned count, row error (UI-001); Gantt bar placement, today line from the JSON, end line, overflow and external blocker badges (UI-003); picker shown only for `planned`/`scheduled`, preview request and kickstart command, preview failure (UI-004); cause panels (UI-005); Graph tab nodes and external node (UI-002); project Dependencies graph keeps epics under a milestone with their edge (UI-006); List and Board without milestone beads (UI-009); sidebar entry and routes.
- **Manual check** against a real project with a planned milestone: list, Gantt, preview, and Graph agree with `gin-workflow milestone list|show --json`.

## Assumptions
- `bd ready --json` rows keep their `issue_type` field (true for bd 1.0.5); a row without it counts as not a milestone.
- The project selector follows the Beads page: query parameter, first configured project by default.
- Milestone beads stay in the `/api/beads` response; only the frontend views hide them, so the Graph tab can scope on the milestone.
- The bead detail page reached by a direct link to a milestone id is unchanged.
- Gantt bars span calendar days, so a bar over a weekend includes the shaded weekend days; the epic's working-day estimate is shown on the bar.
