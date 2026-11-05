# Reports page: tabs and milestone burndown

Design input for `/gin-workflow:discuss`. It describes the approved mockup; the requirements (REQ-IDs) are written by discuss into the change's `02-spec-delta.md`, not here.

## Why

The Reports page shows AI usage, delivery flow, quality and data coverage in one long scroll (REQ-REPORTS-003 to REQ-REPORTS-006). A reader has to scroll past every section to reach the one they want, and the page has no view of milestones. A manager needs to see whether the active milestone will finish by its end date and how the team performed on past milestones.

## Files

| File | Shows |
|---|---|
| `reports-tabs.html` | Interactive mockup with sample data. Open it in a browser. The "Mockup controls" bar switches the milestone state and the theme; it is not part of the design. |
| `reports-milestones-active.png` | Milestones tab, active milestone that will finish late |
| `reports-milestones-active-dark.png` | Same, dark theme |
| `reports-milestones-active-mobile.png` | Same, 400 px wide |
| `reports-milestones-planned.png` | Milestones tab, planned milestone (not started) |
| `reports-milestones-closed.png` | Milestones tab, closed milestone |
| `reports-milestones-empty.png` | Milestones tab, project without milestones |
| `reports-milestones-unavailable.png` | Milestones tab, gin-workflow without the `milestone` command |
| `reports-delivery.png` | Delivery tab |
| `reports-ai-usage.png` | AI usage tab |
| `reports-quality.png` | Quality tab |
| `reports-data-coverage.png` | Data coverage tab |

The mockup uses the console's own tokens (`frontend/src/index.css`), Geist, and the fixed stage and type color order of `features/reports/colors.ts`. All numbers, names and bead ids in it are sample data.

## Page structure

- **Header**: title, "Generated <time>", and the Project selector (a configured project or All projects). The project applies to every tab.
- **Tab bar**: Milestones, Delivery, AI usage, Quality, Data coverage. Each tab shows a one-line headline under its name, so the reader can scan all five without opening them:

  | Tab | Headline | Example |
  |---|---|---|
  | Milestones | Verdict on the active milestone; else the next planned start; else "No milestones" | "Beta readiness 2 days late" (warning icon) |
  | Delivery | Beads closed in the period | "41 beads closed" |
  | AI usage | Tokens and estimated cost | "12.4M tokens, $38.20" |
  | Quality | Rework rate | "9% rework" |
  | Data coverage | Number of gaps, with a warning icon when above 0 | "5 gaps" |

- The selected tab lives in the URL (`?tab=milestones|delivery|usage|quality|coverage`), so a link opens the same tab. Arrow keys move between tabs (WAI-ARIA tabs pattern).
- The KPI row that sits above all sections today is split: each tab opens with its own short row of figures.
- **Filters per tab**: Delivery, AI usage, Quality and Data coverage keep the existing Period (7, 30, 90 days) and Sprint filters of REQ-REPORTS-001. The Milestones tab has a Milestone selector instead, since a milestone has its own period.

## Milestones tab

### Milestone selector

A select grouped by status: Active, Planned, Closed. It defaults to the active milestone, else the next planned one, else the most recently closed one. A link opens the milestone's Gantt page (`/milestones/<project>/<id>`). With All projects, the options are grouped by project.

### Verdict

One sentence in large type, then status chips and the period:

| Milestone state | Sentence | Chips |
|---|---|---|
| Active, projected after end | "At the current pace, <title> finishes on <projected date>, <n> working days after its end date." | "Late by n days" (warning), "Active" |
| Active, projected on or before end | "At the current pace, <title> finishes on <projected date>, <n> working days before its end date." | "On track", "Active" |
| Planned or scheduled | "<title> starts on <start> with <scope> beads in scope and <n> working days to finish them." | "Planned" |
| Closed | "<title> finished on <finish date>, <n> working days after (or before) its end date." | "Closed", slip chip |

### Burndown chart

- **X axis**: working days from the milestone's start (kickoff when set) to its end, extended to the projected or actual finish when that is later. Ticks on Mondays. Weekends are skipped, as on the Gantt.
- **Y axis**: number of beads.
- **Scope** (thin grey step line): beads under the milestone's epics on each day. A step up is labelled with the number added (+4).
- **Remaining** (solid blue line, light area under it): scope minus beads closed, at the end of each working day, up to today.
- **Ideal** (dashed grey): straight line from the scope on the first day to 0 at the end date.
- **Projected** (dotted blue): from today's remaining to 0 at the current pace; a dotted vertical marker and the label "Projected <date>" at the finish day.
- **Today** line and **End <date>** line. Today comes from the milestone JSON `today`, as on the Gantt (REQ-MILESTONE-UI-003).
- **Hover**: a crosshair per working day with date, remaining, closed that day, added that day and ideal; for future days, ideal and projected.
- Planned milestone: scope and ideal only, with "The burndown starts on <start>".
- Closed milestone: remaining to 0 and a "Finished <date>" marker, no projection.

### Figures beside the chart

| State | Figures |
|---|---|
| Active | Remaining (of scope), scope added since start, working days left, pace over the last 5 working days, pace needed to finish on time (warning color when above the current pace) |
| Planned | Beads in scope, working days, pace needed, pace in the last closed milestone |
| Closed | Beads closed, scope added (and %), average pace, slip |

Definitions used by the mockup:

- *pace* = beads closed in the last 5 working days / 5
- *projected finish* = today + ceil(remaining / pace) working days
- *pace needed* = remaining / working days left

### Epics in this milestone

One row per epic: title (linking to the bead page) and id, a closed/total progress meter for its child beads, planned end (`planned_end` from `milestone show`), and a status chip: Done, In progress, Not started, "Late by n days" (from the `overflow` warning) or "Waits on <id>" (from `external_blocker`). The heading shows "<closed> of <scope> beads closed".

### Closed by member

Horizontal bars of beads closed in this milestone per assignee, then a line with the beads in progress per member. Before the milestone starts: "Nothing closed yet. Members appear once the milestone starts."

### Milestones compared

The project's closed milestones, oldest first:

- a column chart of pace (beads closed per working day) per milestone, with the active milestone's pace so far as a lighter last column;
- a table with end date, finish date, slip in working days (late or early chip) and scope added (count and % of the starting scope).

### Empty and error states

- **No milestones**: "gin-console has no milestones yet", one sentence on what a milestone is, and the command `gin-workflow milestone create` with a Copy button.
- **Milestones unavailable** (REQ-MILESTONE-UI-005 causes): an error naming the cause and fix (for example `gin-workflow/install.sh`), and a note that the other tabs keep working.

## Delivery tab

Same data as REQ-REPORTS-004, rearranged:

- Figures: beads closed, median cycle time, median lead time, in progress now.
- Closed per week: stacked columns by bead type, with a legend.
- Cycle and lead time: two range charts side by side (dot at the median, tick at the 85th percentile), switchable By type / By member. They replace the two time tables.
- Oldest in progress (table) next to In progress by member (bars).
- Estimate and actual: table of closed epics with estimate, actual and difference chip.

## AI usage tab

Same data as REQ-REPORTS-003: figures (tokens, estimated cost, tokens per closed bead, cache reads), tokens by member and stage (stacked horizontal bars), stage share (one segmented bar with percentages), top epics with a budget meter (warning color when over budget), and models with role, tokens and cost ("Not priced" when gin-workflow wrote no cost). The top beads table of today stays; the mockup leaves it out for space.

## Quality tab

Same data as REQ-REPORTS-005: figures (rework rate, reopens, bugs found later, review cycles per bead), tokens and rework per bead (scatter, beads with rework in a second color), rework by member (table), review findings by severity and waivers.

## Data coverage tab

Same data as REQ-REPORTS-006, one section per gap type with a count: not collected (each bead with its `gin-workflow usage collect --bead <id>` command and a Copy button), unreadable usage, models without a price, incomplete logs, projects that failed, and the share of tokens under Unassigned. The tab headline counts the gaps.

## Data the burndown needs

Already available:

- `gin-workflow milestone list --all --json` and `milestone show <id> --json`: start, end, kickoff, status, `today`, the epics and their `planned_end` and warnings.
- `bd list --all --json` (as `GET /api/beads`): each bead's `parent`, `status`, `created_at` and `closed_at`, `assignee`.

Not available yet, to settle in discuss:

- Scope per day is rebuilt from `created_at`. A bead moved into or out of a milestone epic, or deleted, changes the past scope line, because `bd list` holds no history of the parent. `bd history` holds snapshots, at the cost of one call per bead.
- There is no endpoint that returns a burndown series; either `/api/milestones/{project}/{id}` grows one, or the frontend builds it from the beads it already loads for the Gantt (REQ-MILESTONE-UI-015).
- The finish date of a closed milestone: `milestone list` gives `finish`; check it is the actual close and not the planned finish.

## Decisions taken in the design review

- Tabs, one per existing report section plus Milestones; no Overview tab, since the tab headlines carry the summary.
- The burndown counts beads, not epics: a milestone holds about six epics, so an epic count moves in large steps and makes the projection jump.
- The KPI row moves into the tabs it belongs to.
- Milestones tab first, because it is the view a manager opens most.

## Open questions

1. Which beads count toward scope: direct children of the milestone's epics only, or all descendants? Do closed beads created before the start count as already done?
2. Pace window: fixed at 5 working days, or a setting?
3. Should "Closed by member" stay? Comparing people by bead count can mislead when bead sizes differ; a team-only total is the alternative.
4. Default tab when the project has no milestones: Milestones (with the empty state) or Delivery?
5. With All projects, should the Milestones tab show one milestone at a time, or a list of every project's active milestone with a small burndown each?
6. Does the burndown honour the Kick-start preview date of a planned milestone (REQ-MILESTONE-UI-004)?
