# Spec Delta: Milestones forecast

## ADDED

### REQ-MILESTONE-UI-016: Project forecast card
WHEN the Milestones list of a project has a non-null `forecast`, gin-console SHALL show a forecast card above the milestone list with:
- the forecast `finish` ("Finishes <date>"), or "No estimate: every open epic is unestimated" when `finish` is null;
- the `deadline` and how `finish` compares with it:
  - "<n> working days past the deadline" in the warning color when `overflow_days` is above 0;
  - "on the deadline" when `finish` equals `deadline`;
  - "<n> working days spare" otherwise. `<n>` counts the days Monday to Friday after `finish` up to and including `deadline`, the same count as gin-workflow `workdays_after`.
  - The comparison is left out when `finish` is null.
- "No deadline" when `deadline` is null, with the roadmap line `- Deadline: YYYY-MM-DD` to add;
- the default lanes (`lanes`), the open epic count (`open_epics`), and the unestimated epic count (`unestimated`), with a warning mark when `unestimated` is above 0;
- the forecast `error`, when set, in the destructive color, with the other figures still shown.
Source: `assets/2026-11-08/mockup/index.html#milestones`

The page SHALL NOT show the card when `forecast` is null or missing.

#### Scenario: on time with a deadline
- GIVEN project P whose `milestone list` reports forecast `finish: 2026-12-23`, `deadline: 2026-12-31`, `overflow_days: 0`, `lanes: 2`, `open_epics: 5`, `unestimated: 0`
- WHEN the user opens Milestones for P
- THEN the card reads "Finishes 23 Dec", "6 working days spare", "2 lanes", "5 open epics", and "0 unestimated" without a warning mark

#### Scenario: past the deadline
- GIVEN project P whose forecast has `finish: 2027-01-07`, `deadline: 2026-12-31`, `overflow_days: 5`
- WHEN the user opens Milestones for P
- THEN the card reads "5 working days past the deadline" in the warning color

#### Scenario: no deadline
- GIVEN project P whose forecast has `deadline: null` and `finish: 2026-11-20`
- WHEN the user opens Milestones for P
- THEN the card reads "Finishes 20 Nov" and "No deadline", and shows `- Deadline: YYYY-MM-DD` as the line to add to the roadmap

#### Scenario: every epic unestimated
- GIVEN project P whose forecast has `finish: null`, `open_epics: 2`, `unestimated: 2`
- WHEN the user opens Milestones for P
- THEN the card reads "No estimate: every open epic is unestimated" and "2 unestimated" with a warning mark, and shows no deadline comparison

#### Scenario: forecast error
- GIVEN project P whose forecast has `error: "Deadline: soon is not a date (YYYY-MM-DD)"`, `deadline: null`, `finish: 2026-11-20`
- WHEN the user opens Milestones for P
- THEN the card shows that error in the destructive color and still reads "Finishes 20 Nov"

#### Scenario: no forecast
- GIVEN project P whose `milestone list` reports `forecast: null`, or no `forecast` key
- WHEN the user opens Milestones for P
- THEN no forecast card is shown and the milestone list is shown as before

### REQ-MILESTONE-UI-017: Lanes on the milestone page
WHEN a milestone's `show` output has `lanes`, gin-console SHALL show "<n> lanes" ("1 lane" when `<n>` is 1) in the milestone page header next to the finish line, and SHALL show nothing in its place when `lanes` is missing.
Source: `assets/2026-11-08/mockup/index.html#milestone`

#### Scenario: lanes shown
- GIVEN milestone M1 whose `show` output has `lanes: 2`
- WHEN the user opens M1
- THEN the header shows "2 lanes"

#### Scenario: older gin-workflow
- GIVEN milestone M1 whose `show` output has no `lanes` key
- WHEN the user opens M1
- THEN the header shows no lane count and the rest of the header is unchanged

## MODIFIED

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: b8f53ca9ca6ac43a57158593d2962bd63dcb80ed18cf6d3d1326281fb03badc4 -->
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status, start and end (and kickoff when set), lanes, forecast finish, epic progress, and warning count, from `gin-workflow milestone list --all --json`. Lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" when the entry's `finish` is set, in the warning color when it is after the entry's `end`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
Source: `assets/2026-11-08/mockup/index.html#milestones`

#### Scenario: list
- GIVEN project P whose gin-workflow reports milestones M1 (active) and M2 (planned)
- WHEN the user opens Milestones for P
- THEN both milestones are listed with their status, period, lanes, progress, and warning count

#### Scenario: lanes and finish
- GIVEN project P whose `milestone list` reports M1 with `lanes: 2`, `end: 2026-11-12`, `finish: 2026-11-23`, and M2 with `lanes: 1`, `end: 2026-12-04`, `finish: 2026-12-01`
- WHEN the user opens Milestones for P
- THEN M1 shows "2 lanes" and "Finishes 23 Nov" in the warning color, and M2 shows "1 lane" and "Finishes 1 Dec" without it

#### Scenario: older gin-workflow
- GIVEN project P whose `milestone list` entries have no `lanes` key
- WHEN the user opens Milestones for P
- THEN each row shows "–" for lanes and the rest of the row as before

#### Scenario: unassigned count not shown
- GIVEN project P whose `milestone list` reports `unassigned_epics: 4`
- WHEN the user opens Milestones for P
- THEN the page does not show a sentence counting roadmap epics outside milestones

#### Scenario: schedule error
- GIVEN project P whose `milestone list` reports M2 with `error` "dependency cycle: A -> B -> A"
- WHEN the user opens Milestones for P
- THEN M2 shows that error in place of its progress and warning count, and M1 is shown normally

### REQ-MILESTONE-UI-003: Milestone Gantt tab
<!-- base: 68d4a64df113f2bf971cdb89e5a8e57653faeffec20de07102f57d2660e8efe5 -->
gin-console SHALL show, on a milestone's page, a Gantt tab drawing one bar per epic from `planned_start` to `planned_end` of `gin-workflow milestone show --json`, as gin-workflow scheduled them on the milestone's lanes and without rescheduling them, colored by bead status, with a line at the JSON `today` date, a line at the milestone `end`, and each epic's warnings.

#### Scenario: overflow shown
- GIVEN milestone M1 whose `show` output gives epic A warning `overflow` of 2 days
- WHEN the user opens the Gantt tab of M1
- THEN A's bar extends past the end line and A shows an overflow warning of 2 days

#### Scenario: lane-bound dates
- GIVEN milestone M1 with `lanes: 1` whose `show` output places independent epics A on 2026-11-09 to 2026-11-10 and B on 2026-11-11 to 2026-11-12
- WHEN the user opens the Gantt tab of M1
- THEN B's bar starts on 2026-11-11, after A's bar ends, and not alongside A

#### Scenario: today from the JSON
- GIVEN milestone M1 whose `show` output has `today: 2026-11-04`
- WHEN the user opens the Gantt tab of M1
- THEN the today line is drawn at 2026-11-04 whatever the browser's date

#### Scenario: external blocker named
- GIVEN epic A in M1 with warning `external_blocker` and `external_depends_on` `[{"id": "E9", "milestone": "M2"}]`
- WHEN the user opens the Gantt tab of M1
- THEN A shows an external blocker warning naming E9 and M2

### REQ-MILESTONE-UI-008: Milestones API
<!-- base: 6a188a654b35bbadbe3c0cac17dd879a849931fbccd484260b195f6353b8a6be -->
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin-workflow milestone list --all --json` or `gin-workflow milestone show <id> [--start <date>] --json` run in the project directory, including the list's `forecast` and the `lanes` of each list entry and of the shown milestone, with `null` for each of them that the output lacks. It SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

#### Scenario: list
- GIVEN project P whose `milestone list --all --json` prints schema 1 with M1
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, `unassigned_epics`, and `today`

#### Scenario: forecast and lanes
- GIVEN project P whose `milestone list` prints M1 with `lanes: 2` and a `forecast` with `deadline: 2026-12-31`, `lanes: 1`, `start: 2026-11-08`, `finish: 2026-12-23`, `overflow_days: 0`, `open_epics: 5`, `unestimated: 1`, `error: null`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response carries M1 with `lanes: 2` and that `forecast` unchanged

#### Scenario: output from an older gin-workflow
- GIVEN project P whose `milestone list` prints schema 1 without `forecast` and without `lanes`, and whose `milestone show M1` prints no `lanes`
- WHEN a client requests the list and M1
- THEN both responses are 200, the list has `forecast: null` and M1 entry `lanes: null`, and M1 has `lanes: null`

#### Scenario: preview not cached
- GIVEN a request for M1 with `start=2026-11-16` answered less than 5 seconds ago
- WHEN a client requests M1 with `start=2026-11-16` again
- THEN `milestone show M1 --start 2026-11-16 --json` runs again

#### Scenario: invalid start
- GIVEN project P
- WHEN a client requests `GET /api/milestones/P/M1?start=next-monday`
- THEN the response is 422 and no command runs

#### Scenario: old gin-workflow
- GIVEN project P whose `gin-workflow milestone` exits 2 with `invalid choice: 'milestone'`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "outdated"`, and the failure is not cached

#### Scenario: markdown tracking
- GIVEN project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "tracking"`

### REQ-UI-028: Bead detail
<!-- base: 09c18e607ab4d55986f071d3091c10846f9812f6a127dfb524c81eb3392b708b -->
The bead page SHALL show the bead's id, title, status, priority, type, labels, owner, assignee, creation and update times and comment count, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with a progress bar of closed children over all children. Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Markdown description
- GIVEN a bead whose description is `## Change` followed by `1. Format **dates**` and a fenced code block
- WHEN the page loads
- THEN the description shows a heading "Change", a numbered list item with "dates" in bold, and a code block

#### Scenario: Raw HTML stays text
- GIVEN a bead with a description containing `<script>x</script>` and `<img src=x onerror=alert(1)>`
- WHEN the page loads
- THEN both appear as text and no `script` or `img` element exists in the description

#### Scenario: Unsafe link
- GIVEN a bead with a description containing `[run](javascript:alert(1))` and `[docs](https://example.com)`
- WHEN the page loads
- THEN "run" is not a link, and "docs" links to `https://example.com` in a new tab

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and a progress bar reads 3 of 4

### REQ-UI-038: Created by and text sections
<!-- base: 7e51b0dc82720fa23e843a7196a83f77f8af78a86f4092e4be36e57f3d8408cd -->
The bead page SHALL show "Created by" with the `created_by` name, and SHALL show the sections Acceptance criteria, Design, Notes and Close reason in that order, each only when it has content, rendered as Markdown under the rules of REQ-UI-028.
Source: `assets/2026-11-08/mockup/index.html#bead-detail`

#### Scenario: Sections with content
- GIVEN a bead with acceptance criteria, notes and a close reason but no design
- WHEN the bead page is shown
- THEN it shows "Created by", Acceptance criteria, Notes and Close reason in that order and no Design section

#### Scenario: Markdown sections
- GIVEN acceptance criteria `- [ ] Local time` and a design containing `<script>x</script>` and `**bold**`
- WHEN the bead page is shown
- THEN the acceptance criteria show an unchecked, disabled checkbox before "Local time", "bold" is in a `strong` element, and `<script>x</script>` appears as text with no `script` element

#### Scenario: No author
- GIVEN a bead whose `created_by` is null
- WHEN the bead page is shown
- THEN "Created by" is not shown

## REMOVED
