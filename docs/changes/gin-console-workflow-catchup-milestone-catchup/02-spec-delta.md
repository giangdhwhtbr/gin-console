# Spec Delta: Milestone catch-up with gin-workflow

## ADDED

### REQ-MILESTONE-UI-019: Retro tab on the milestone page
The milestone page SHALL offer a third tab "Retro", kept in the URL as `tab=retro` and labelled with the number of members who left a retro, that SHALL read the comments of the milestone bead through `GET /api/beads/{project}/{id}/comments` and show:
- the newest comment that starts with `[gin close] <milestone id>`, with its author and date and the text after each of the labels `Delivered:`, `Spillover:`, `Outcome:`, `Demo:`, `Retros:`, `Metrics:` and `Action:` that it holds, rendered as Markdown, leaving out a label it lacks;
- for each member, by name, the newest comment that starts with `[gin retro] <milestone id> <member>`, with its date and the text after `Went well:`, `Slowed us:` and `Change next:`;
- a comment with one of these prefixes but none of the labels, as its full text with the note "Not in the expected format";
- "No retros yet. Members record one with `/retro`." when there is no retro and no close comment.
IF the comments cannot be loaded, THEN the tab SHALL show the error with a Retry button.

#### Scenario: Close and retros
- GIVEN milestone `m1` with a comment `[gin close] m1` holding `Delivered:`, `Spillover:` and `Action:`, and comments `[gin retro] m1 ann` and `[gin retro] m1 bao`
- WHEN the user opens `/milestones/p/m1?tab=retro`
- THEN the tab reads "Retro 2", shows the close block with Delivered, Spillover and Action, then the retros of ann and bao

#### Scenario: Newest retro per member
- GIVEN two comments `[gin retro] m1 ann` from 10 Nov and 12 Nov
- WHEN the Retro tab is shown
- THEN only the retro of 12 Nov is shown for ann

#### Scenario: Retro of another milestone
- GIVEN a comment `[gin retro] m2 ann` on the bead of `m1`
- WHEN the Retro tab of `m1` is shown
- THEN it is not counted or shown

#### Scenario: Not in the expected format
- GIVEN a comment `[gin retro] m1 chi` with no `Went well:`, `Slowed us:` or `Change next:`
- WHEN the Retro tab is shown
- THEN chi's comment is shown in full with "Not in the expected format"

#### Scenario: Nothing yet
- GIVEN milestone `m1` without retro or close comments
- WHEN the Retro tab is shown
- THEN it reads "Retro" without a number and says "No retros yet. Members record one with `/retro`."

### REQ-MILESTONE-UI-020: Integration, deadline and away in the milestone header
WHEN a milestone's `show` output has `integration`, `deadline` or a non-empty `away`, the milestone page header SHALL show "Integration <date>", "Deadline <date>" and "Away: <member> <dates>, …" (each range of a member as a date or "<from>–<to>"), and SHALL show nothing for each of them that is `null`, empty or missing.

#### Scenario: All three
- GIVEN milestone `m1` whose `show` output has `integration: 2026-11-24`, `deadline: 2026-11-28` and `away: {"ann": ["2026-11-18..2026-11-20"], "bao": ["2026-11-25"]}`
- WHEN the user opens `m1`
- THEN the header shows "Integration 24 Nov", "Deadline 28 Nov" and "Away: ann 18–20 Nov, bao 25 Nov"

#### Scenario: Older gin-workflow
- GIVEN milestone `m1` whose `show` output has no `integration`, `deadline` or `away` key
- WHEN the user opens `m1`
- THEN the header shows none of them and the rest of the header is unchanged

## MODIFIED

### REQ-MILESTONE-UI-003: Milestone Gantt tab
<!-- base: 5a0f24997dc310269c3426f3196644f2976852a3cb1a38aafc6de3b619f1ba95 -->
gin-console SHALL show, on a milestone's page, a Gantt tab drawing one bar per epic from `planned_start` to `planned_end` of `gin milestone show --json`, as gin-workflow scheduled them on the milestone's lanes and without rescheduling them, colored by bead status, with a line at the JSON `today` date, a line at the milestone `end`, and each epic's warnings, reading `spec_due` as "Spec due before kick-off", `after_integration` as "Ends after integration on <integration date>", `open_bugs` as "<count> open bug(s)" and `oversized` as "<days> working day(s) longer than the milestone", and any other code as the code itself.

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

#### Scenario: newer warnings
- GIVEN epics in M1 with warnings `spec_due`, `after_integration` (integration 2026-11-24), `open_bugs` with `count: 2` and `oversized` with `days: 3`
- WHEN the user opens the Gantt tab of M1
- THEN they read "Spec due before kick-off", "Ends after integration on 24 Nov", "2 open bugs" and "3 working days longer than the milestone"

### REQ-MILESTONE-UI-008: Milestones API
<!-- base: e217a166b9731a508008ba4cb220eeb792af79e0e395b2b8d2d3adf31aba27c5 -->
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin milestone list --all --json` or `gin milestone show <id> [--start <date>] --json` run in the project directory, including the list's `forecast`, the `lanes` of each list entry and of the shown milestone, the shown milestone's `integration`, `deadline` and `away`, and each epic's `remaining_days` and `assumed_days`, with `null` (`{}` for `away`) for each of them that the output lacks, and SHALL accept a list entry whose `start` and `end` are `null` and return them as `null`. It SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

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
- GIVEN project P whose `gin milestone` exits 2 with `invalid choice: 'milestone'`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "outdated"`, and the failure is not cached

#### Scenario: markdown tracking
- GIVEN project P whose `milestone list` exits 1 with `milestone error: milestones need providers.task_tracking: beads`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 502 with `cause: "tracking"`

#### Scenario: entry without dates
- GIVEN project P whose `milestone list` prints M1 and M4 with `start: null`, `end: null` and `error: "M4 has no start/end metadata"`
- WHEN a client requests `GET /api/milestones?project=P`
- THEN the response is 200 with M1, and M4 with `start: null`, `end: null` and that `error`

#### Scenario: schedule facts
- GIVEN project P whose `milestone show M1` prints `integration: 2026-11-24`, `deadline: null`, `away: {"ann": ["2026-11-18"]}` and an epic with `remaining_days: 2` and `assumed_days: null`
- WHEN a client requests `GET /api/milestones/P/M1`
- THEN the response carries those values unchanged

### REQ-MILESTONE-UI-013: Readable Gantt rows
<!-- base: 8bde4860ebbf2ad5f0747758dbc7841287f745918691126859133251ac48e7c8 -->
Each epic row of the Gantt SHALL show, in a label column that stays visible while the chart scrolls, the status icon and title on one line and the epic id (linking to its bead page), period and estimate on the next, the estimate reading "<n>d", or "<n>d left" when the epic is in progress and its `remaining_days` is below its estimate, or "assumed <n>d" when it has no estimate and `assumed_days` is set, each line cut short with an ellipsis instead of wrapping and the full title available on hover, except that under 1024px the items of the second line (id, period and estimate, closed tracks, prep, spec) wrap onto further lines rather than being cut, followed by the epic's warnings; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title takes one line cut short with an ellipsis, and the id, period and closed tracks wrap onto the following lines, none of them cut to less than its first word

#### Scenario: title after the bar
- GIVEN epic A whose bar ends on the first day of a 10-day plan shown as `Whole milestone`
- WHEN the Gantt is shown
- THEN A's title is shown after its bar

#### Scenario: remaining and assumed days
- GIVEN an in-progress epic A with `estimate_days: 5` and `remaining_days: 2`, and an open epic B without an estimate and with `assumed_days: 3`
- WHEN the Gantt is shown
- THEN A's second line reads "2d left" and B's reads "assumed 3d"

### REQ-MILESTONE-UI-018: Beads tab on the milestone page
<!-- base: 03e47834f169cf6d4f06bedfa97ae2e433580b15327ef193175b8d7f905d238a -->
The milestone page SHALL offer the tabs Gantt, Beads and Retro (REQ-MILESTONE-UI-019), kept in the URL as `tab` (`gantt` when absent or unknown, `beads`, `retro`), and SHALL treat `tab=graph` as `tab=beads` with `view=graph`. WHILE the Beads tab is shown, the page SHALL show the Beads views (REQ-UI-030) of the milestone's project with the Milestone filter fixed to this milestone and no Milestone select, SHALL keep their search, filters, view, selection and graph scope in the milestone page's URL with the names the Beads page uses, and SHALL fetch closed beads without "Show closed" WHILE the milestone is closed. WHEN the user changes tab, the page SHALL keep only `start` and `zoom` of the query besides `tab`.

#### Scenario: Beads tab
- GIVEN milestone `m2` of project `p` with epics `e1` and `e2` and a bead `x` under milestone `m3`
- WHEN the user opens `/milestones/p/m2?tab=beads`
- THEN the List view shows `e1` and `e2` and not `x`, and there is no Milestone select

#### Scenario: View and filters in the URL
- GIVEN the Beads tab of `m2`
- WHEN the user chooses Board and the status "open"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board&status=open` and reloading it shows the same Board and filter

#### Scenario: Changing tab
- GIVEN `/milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w`
- WHEN the user chooses Gantt and then Beads
- THEN the URL is `/milestones/p/m2?start=2026-11-10&zoom=2w` and then `/milestones/p/m2?tab=beads&start=2026-11-10&zoom=2w`, and the List view shows no filter

#### Scenario: Old Graph link
- GIVEN a link to `/milestones/p/m2?tab=graph`
- WHEN it is opened
- THEN the Beads tab is shown on the Graph view

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed
- WHEN the user opens its Beads tab with "Show closed" off
- THEN the closed beads of `m1` are shown

### REQ-REPORTS-017: Team tab states
<!-- base: 7e1568048031e33b59dde96bf3334c2c43a915f865607a253f4dd2e66f3bab76 -->
The Team tab SHALL handle these states:
- WHILE "All projects" is selected, it SHALL show "Pick a project to see its team" and SHALL NOT request the team report.
- WHEN `milestones` is empty, it SHALL show "<project> has no milestones yet", one sentence on what a milestone is, and the command `gin milestone create` with a copy button.
- WHILE the team report loads, it SHALL show a loading state.
- IF the request fails, THEN it SHALL show the error with a Retry button.
- It SHALL NOT show a late answer for a project or milestone that is no longer selected.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: all projects
- GIVEN "All projects" is selected
- WHEN the Team tab is shown
- THEN it says "Pick a project to see its team" and no request goes to `/api/reports/team`

#### Scenario: no milestones
- GIVEN the team report of `beta` has no milestones
- WHEN the Team tab is shown
- THEN it says "beta has no milestones yet" and offers to copy `gin milestone create`

#### Scenario: failure
- GIVEN `/api/reports/team` answers 502
- WHEN the user presses Retry and the next answer is 200
- THEN the Team tab shows the report

#### Scenario: late answer
- GIVEN the team report for `m2` is loading and the user picks `m1`
- WHEN the answer for `m2` arrives
- THEN the page does not show it

## REMOVED
