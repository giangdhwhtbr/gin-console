# Spec Delta: Bugs view

## ADDED

### REQ-REPORTS-039: Bugs report request
WHEN a client requests `GET /api/reports/bugs` with `project` (a configured project name) and either `milestone` (a bead id) or `days` (7, 30 or 90), the server SHALL read every bead of the project from its `bd export` snapshot (REQ-BEADS-012) without starting a process, and SHALL return:
- `generated_at` and `today`, the server's local date;
- `milestone`, the id REQ-REPORTS-008 selects (the default milestone when neither `milestone` nor `days` is given), or `null`; and `days`, the period, or `null`;
- `period`: `start` and `end`, both included. For a milestone it goes from its `start` to the earlier of its `end` and `today`; for a period, from `days` days before `today` to `today`. It is `null` before the start of the milestone and when there is neither a milestone nor `days`;
- `figures` and `weeks` (REQ-REPORTS-041), and `epics` and `open` (REQ-REPORTS-042).

A bug SHALL be a bead whose `issue_type` is `bug` and that is not a merge gate (REQ-BEADS-019). The server SHALL serve the same answer for the same `project` and scope for 60 seconds unless `POST /api/refresh` dropped it. It SHALL respond 404 when `project` is not configured, 422 when `days` is another value, when `milestone` holds a character outside letters, digits, `.`, `_` and `-`, or when both are given, and IF the snapshot cannot be read as in REQ-BEADS-005, THEN SHALL respond 502 with an `error` and SHALL NOT keep the failure in the cache.

#### Scenario: Milestone
- GIVEN `today` 2026-11-25 and the active milestone `m2` of `alpha` from 2026-11-16 to 2026-12-04
- WHEN a client requests `/api/reports/bugs?project=alpha`
- THEN `milestone` is `m2`, `days` is `null` and `period` is 2026-11-16 to 2026-11-25

#### Scenario: Closed milestone
- GIVEN `today` 2026-11-25 and the closed milestone `m1` of `alpha` from 2026-10-05 to 2026-10-30
- WHEN a client requests `/api/reports/bugs?project=alpha&milestone=m1`
- THEN `period` is 2026-10-05 to 2026-10-30

#### Scenario: Period
- GIVEN `today` 2026-11-25
- WHEN a client requests `/api/reports/bugs?project=alpha&days=7`
- THEN `milestone` is `null`, `days` is 7 and `period` is 2026-11-18 to 2026-11-25

#### Scenario: Not started
- GIVEN `today` 2026-11-25, the milestone `m3` of `alpha` starting 2026-12-07, and one open bug
- WHEN a client requests `/api/reports/bugs?project=alpha&milestone=m3`
- THEN `period` is `null`, `weeks` is empty, `figures.opened` and `figures.closed` are 0, and `open` holds the bug

#### Scenario: No milestones
- GIVEN project `beta` without milestones and with one open bug
- WHEN a client requests `/api/reports/bugs?project=beta`
- THEN `milestone`, `days` and `period` are `null`, and `open` holds the bug

#### Scenario: No process and cache
- GIVEN the bugs report for `alpha` and `m2` was answered 20 seconds ago
- WHEN a client requests it again, and then again after `POST /api/refresh`
- THEN no `gin` or `bd` process starts for the first, which has the same `generated_at`, and the second has a newer one

#### Scenario: Bad input
- GIVEN no project `nope`
- WHEN a client requests `project=nope`, `project=alpha&days=14`, `project=alpha&milestone=a b` and `project=alpha&milestone=m2&days=7`
- THEN the responses are 404, 422, 422 and 422

#### Scenario: Unreadable export
- GIVEN the export of `alpha` cannot be read, and then can
- WHEN a client requests `/api/reports/bugs?project=alpha` twice
- THEN the responses are 502 with an `error`, and 200

### REQ-REPORTS-040: Source epic of a bug
Type: business-rule
The source epic of a bug SHALL be the first epic found by these rules, and the source SHALL be unknown when none finds one:
1. of its `discovered-from` targets in id order, the first that is in the project and is an epic or has an epic among its parents: that target when it is an epic, else its nearest epic;
2. the nearest epic among the parents of the bug.

The search among parents SHALL stop at a parent outside the project and at a bead met twice.

#### Scenario: Linked to a track
- GIVEN bug `b-1` discovered from track `t-1`, whose parent is epic `e-1`
- WHEN its source epic is found
- THEN it is `e-1`

#### Scenario: Linked to an epic
- GIVEN bug `b-2` discovered from epic `e-2`, a child of epic `e-1`
- WHEN its source epic is found
- THEN it is `e-2`

#### Scenario: The link wins over the parents
- GIVEN bug `b-3`, a child of epic `e-1`, discovered from a track of epic `e-2`
- WHEN its source epic is found
- THEN it is `e-2`

#### Scenario: First link that reaches an epic
- GIVEN bug `b-4` discovered from `t-0`, which has no parent, from `t-5`, which is not in the project, and from `t-9`, a track of epic `e-3`
- WHEN its source epic is found
- THEN it is `e-3`

#### Scenario: Discovered from another bug
- GIVEN bug `b-5` discovered from bug `b-6`, a child of epic `e-1`, and bug `b-7` discovered from bug `b-8`, which has no parent and is discovered from a track of `e-1`
- WHEN their source epics are found
- THEN `b-5` has `e-1` and the source of `b-7` is unknown

#### Scenario: Parents only
- GIVEN bug `b-9` without links, a child of a task of epic `e-1`
- WHEN its source epic is found
- THEN it is `e-1`

#### Scenario: Unknown and cycle
- GIVEN bug `b-10` without links and parents, and beads `t-1` and `t-2`, each the parent of the other, with bug `b-11` a child of `t-1`
- WHEN their source epics are found
- THEN both sources are unknown

### REQ-REPORTS-041: Bug figures and weeks
Type: business-rule
The server SHALL take the dates of a bug as local dates, and SHALL count in `figures`:
- `total`: every bug of the project;
- `opened`: the bugs whose `created_at` is in the period (REQ-REPORTS-039);
- `closed`: the closed bugs whose `closed_at` is in the period;
- `open_now`: the bugs that are not closed, deferred ones included, whatever the period;
- `oldest_open_days`: the days from the earliest `created_at` of the open bugs to `today`, or `null` when none is open;
- `median_close_days`: the median of the days from `created_at` to `closed_at`, at least 0, over the bugs that `closed` counts, rounded to one decimal, or `null` when it counts none.

`weeks` SHALL hold one entry per ISO week (Monday to Sunday) that has a day in the period, in date order, with `start` (its Monday) and the `opened` and `closed` bugs of its days inside the period, so that the weeks add up to `figures.opened` and `figures.closed`. A closed bug without `closed_at` SHALL be in no `closed` count.

#### Scenario: Figures
- GIVEN `today` 2026-11-25, the period 2026-11-18 to 2026-11-25, and bugs created on 10, 19 and 20 Nov, of which the first closed on 20 Nov, the second on 20 Nov, and the third is deferred
- WHEN the bugs report is built
- THEN `total` is 3, `opened` 2, `closed` 2, `open_now` 1, `oldest_open_days` 5 and `median_close_days` 5.5

#### Scenario: Nothing open and nothing closed
- GIVEN one bug created and closed before the period
- WHEN the bugs report is built
- THEN `total` is 1, `opened`, `closed` and `open_now` are 0, and `oldest_open_days` and `median_close_days` are `null`

#### Scenario: Weeks of a period
- GIVEN the period 2026-11-18 (a Wednesday) to 2026-11-25, a bug created on 2026-11-17, one on 2026-11-18 and one on 2026-11-24, and the one of 2026-11-18 closed on 2026-11-24
- WHEN the bugs report is built
- THEN `weeks` is 2026-11-16 with 1 opened and 0 closed, and 2026-11-23 with 1 opened and 1 closed

#### Scenario: Week without bugs across a year end
- GIVEN the period 2026-12-21 to 2027-01-08 with one bug created on 2026-12-22 and one on 2027-01-05
- WHEN the bugs report is built
- THEN `weeks` starts are 2026-12-21, 2026-12-28 and 2027-01-04, and the one of 2026-12-28 has 0 opened and 0 closed

#### Scenario: Odd close dates
- GIVEN a closed bug without `closed_at`, and a bug created on 2026-11-20 whose `closed_at` is 2026-11-19, in the period
- WHEN the bugs report is built
- THEN `closed` is 1, `open_now` is 0 and `median_close_days` is 0

### REQ-REPORTS-042: Bug rows by epic and open bugs
Type: business-rule
The server SHALL return:
- `epics`: one row per source epic (REQ-REPORTS-040), and one with `id` `null` for the bugs of unknown source, with `title`, `opened`, `closed` and `open_now` counted over its bugs as REQ-REPORTS-041 counts them. It SHALL leave out a row whose three counts are 0, and SHALL sort by `opened` + `closed` (largest first), then `open_now` (largest first), then id, with the row of unknown source last;
- `open`: every bug that is not closed, whatever the period, with `id`, `title`, `priority`, `assignee`, `age_days` (the days from `created_at` to `today`) and `epic` (`id` and `title` of the source epic, or `null`), sorted by `age_days` (largest first), then priority, then id.

#### Scenario: Rows sorted with unknown last
- GIVEN epic `e-1` with 1 bug opened, `e-2` with 2 opened and 1 closed, `e-3` with 1 bug open since before the period, and 9 bugs of unknown source opened
- WHEN the bugs report is built
- THEN `epics` is `e-2`, `e-1`, `e-3` and the row with `id` `null`, and the sum of `opened` over the rows is `figures.opened`

#### Scenario: Row left out
- GIVEN epic `e-4` whose bugs were all opened and closed before the period
- WHEN the bugs report is built
- THEN `epics` has no row for `e-4`

#### Scenario: Open bugs
- GIVEN `today` 2026-11-25 and a P2 bug created 2026-10-13 and deferred, a P1 and a P3 bug created 2026-11-22, and a closed bug
- WHEN the bugs report is built for any scope
- THEN `open` is the bug of 2026-10-13 with `age_days` 43, then the P1 and the P3 bug with 3, and not the closed bug

### REQ-REPORTS-043: Bugs section
The Bugs section (`/reports/bugs`) SHALL show, in this order:
- the figures Opened, Closed, Open now, "Oldest open" (`<n> d`) and "Median days to close", "—" for `null`, each with a tooltip (REQ-UI-132) that says what it counts and in which scope. The tooltips of Opened and Closed SHALL say that the bugs of every source count, unlike "Bugs found later" of the Rework section, which counts the bugs linked to closed beads;
- "Bugs per week": a bar per week labelled with its Monday, with its opened and closed bugs as two segments, a legend naming the segments, and the counts as text ("<n> opened, <m> closed");
- "Bugs by epic": a table with the columns Epic (its title linking to its bead page, or "Source unknown"), Opened, Closed and Open now, and, WHEN bugs of unknown source were opened in the scope, the note "<share> of the bugs opened in this scope have no source epic", with `<share>` their share of `figures.opened`;
- "Open bugs": the note "All open bugs of <project>, whatever the scope" and a table with the columns Bug (its title linking to its bead page, with the id under it), Priority (`P<priority>`), Assignee (or "Unassigned"), Age (`<n> d`) and Epic (its title linking to its bead page, or "Source unknown"), in the order of REQ-REPORTS-042. It SHALL show 20 rows, then a "Show all <n>" control while more remain.

WHILE the window is narrower than a table, the table SHALL scroll sideways inside its frame and the page SHALL NOT.

#### Scenario: Figures
- GIVEN a bugs report with `opened` 13, `closed` 11, `open_now` 25, `oldest_open_days` 43 and `median_close_days` 0.5
- WHEN the Bugs section is shown
- THEN the figures read "13", "11", "25", "43 d" and "0.5 d", and the tooltip of Opened names "Bugs found later"

#### Scenario: Weeks
- GIVEN the weeks 2026-11-16 with 5 opened and 3 closed, and 2026-11-23 with none
- WHEN the Bugs section is shown
- THEN two bars are listed, the first says "5 opened, 3 closed", the second "0 opened, 0 closed", and the legend names Opened and Closed

#### Scenario: Epic rows
- GIVEN rows for `e-2` and for unknown source with 8 of the 13 opened bugs, in project `alpha`
- WHEN the Bugs section is shown and the user clicks the title of `e-2`
- THEN the table ends with "Source unknown", the note says "62% of the bugs opened in this scope have no source epic", and the page `/beads/alpha/e-2` is shown

#### Scenario: Show all
- GIVEN 25 open bugs
- WHEN the Bugs section is shown and the user presses "Show all 25"
- THEN 20 rows were shown before and 25 after, and the control is gone

#### Scenario: Phone
- GIVEN a window 390px wide and an open bug with a long title
- WHEN the Bugs section is shown
- THEN the page has no horizontal scroll

### REQ-REPORTS-044: Bugs section states
The Bugs section SHALL:
- show a loading state while the bugs report loads, the error with a Retry button IF it fails (REQ-UI-093), and no late answer for a scope that is no longer selected;
- WHEN `figures.total` is 0, show "No bugs in <project>" in place of the figures, the bars and the tables;
- WHEN `figures.opened` and `figures.closed` are both 0, show "No bugs in this scope" in place of the bars, and WHEN `epics` is empty, in place of the epic table;
- WHEN `open` is empty, show "No open bugs" in place of the open bugs table.

#### Scenario: Project without bugs
- GIVEN project `beta` with beads and no bug
- WHEN `/reports/bugs?project=beta&days=30` is shown
- THEN the section shows only the scope select and "No bugs in beta"

#### Scenario: Only old open bugs
- GIVEN project `alpha` with one bug of epic `e-1`, open since before the period
- WHEN the Bugs section is shown
- THEN "Bugs per week" says "No bugs in this scope", "Bugs by epic" lists `e-1` with 0, 0 and 1, and "Open bugs" lists the bug

#### Scenario: Not started
- GIVEN the bugs report of a milestone that has not started, whose `period` is `null`, and no open bug
- WHEN the Bugs section is shown
- THEN "Bugs per week" and "Bugs by epic" say "No bugs in this scope" and "Open bugs" says "No open bugs"

#### Scenario: Failure
- GIVEN `/api/reports/bugs` answers 502
- WHEN the user presses Retry and the next answer is 200
- THEN the Bugs section shows the report

#### Scenario: Late answer
- GIVEN the bugs report for 30 days is loading and the user picks "Last 7 days"
- WHEN the answer for 30 days arrives after the one for 7 days
- THEN the section keeps the report for 7 days

## MODIFIED

### REQ-REPORTS-033: One scope for every report section
<!-- base: 43896a637c2cd2dba550f6d641062dc2a46055b80c6376ac582f75f4996bc4a9 -->
Every report section SHALL show, at its top, "Every report uses" and one select, listing the milestones of the team report (REQ-REPORTS-008) in the groups Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), then "Last 7 days", "Last 30 days" and "Last 90 days". The page SHALL request the team report whatever the section. The URL SHALL hold the scope as `milestone=<id>` or as `days=<7|30|90>`, and the frontend SHALL, without adding a history entry:
- drop `days` WHEN both are given;
- write the team report's `milestone` WHEN neither is given, or WHEN `milestone` differs from it, or `days=30` WHEN `milestones` is empty;
- drop `sprint`.

Choosing an option SHALL replace the other key, add a history entry, and clear `member` and `status`. The scope SHALL stay when the section changes. Status, Team, Delivery, Rework and Bugs SHALL request their reports for the scope (REQ-REPORTS-020, REQ-REPORTS-008, REQ-REPORTS-001, REQ-REPORTS-039), and Velocity SHALL mark the selected milestone (REQ-REPORTS-018). The select SHALL be no wider than the panel, a long option cut short with its full text as its `title`.
Source: `../ui/assets/2026-11-22/index.html#reports`

#### Scenario: Scope kept across sections
- GIVEN `/reports/team?project=alpha&milestone=m1`
- WHEN the user opens Delivery
- THEN the URL is `/reports/delivery?project=alpha&milestone=m1` and the report for `m1` is requested

#### Scenario: Pick a period
- GIVEN `/reports/delivery?project=alpha&milestone=m1`
- WHEN the user picks "Last 7 days"
- THEN the URL becomes `/reports/delivery?project=alpha&days=7`, with a history entry, and the report for 7 days is requested

#### Scenario: Default scope in the URL
- GIVEN `/reports/status?project=alpha`, whose team report selects `m2`
- WHEN the page loads
- THEN the URL becomes `/reports/status?project=alpha&milestone=m2` without a history entry

#### Scenario: Old link with a sprint and both keys
- GIVEN `/reports/delivery?project=alpha&days=7&milestone=m1&sprint=s7`
- WHEN the page loads
- THEN the URL becomes `/reports/delivery?project=alpha&milestone=m1` without a history entry

#### Scenario: No milestones
- GIVEN project `beta` without milestones
- WHEN `/reports/team?project=beta` loads
- THEN the URL becomes `/reports/team?project=beta&days=30` and the select lists only the three periods

#### Scenario: Picking clears the member
- GIVEN `/reports/team?project=alpha&milestone=m2&member=ann&status=closed`
- WHEN the user picks `m1`
- THEN the URL becomes `/reports/team?project=alpha&milestone=m1`

### REQ-UI-063: Page title
<!-- base: ed6ecc69759d38f7cdc053f1caae30be32426415cb41ef76eabb8f055b25a6d0 -->
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Overview · gin-console`, `Beads · <project> · gin-console`, `My work · <project> · gin-console`, `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console` with `<section>` one of Status, Team, Delivery, Velocity, Rework and Bugs, `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

#### Scenario: Bead page
- GIVEN the bead `a-1` titled "Team checkout" in project `example`
- WHEN its page has loaded
- THEN the document title is `Team checkout · example · gin-console`

#### Scenario: Reports section
- GIVEN `/reports/rework?project=example`
- WHEN the page loads
- THEN the document title is `Reports · Rework · example · gin-console`

#### Scenario: My work
- GIVEN `/my-tasks?project=example`
- WHEN the page loads
- THEN the document title is `My work · example · gin-console`

#### Scenario: Loading
- GIVEN a milestone page whose milestone is still loading
- WHEN the page is shown
- THEN the document title is `gin-console`

#### Scenario: Overview
- GIVEN two configured projects
- WHEN `/` is shown
- THEN the document title is `Overview · gin-console`

### REQ-UI-095: Report tabs
<!-- base: c0140122c0b1889de2e7b53207759c19df97036df79b7d352b13b2f41e3cd260 -->
The Reports page SHALL have the sections Status, Team, Delivery, Velocity, Rework and Bugs, in that order, each at its own path: `/reports/status`, `/reports/team`, `/reports/delivery`, `/reports/velocity`, `/reports/rework` and `/reports/bugs`. WHILE the sections are not listed in the sidebar (REQ-UI-129), the page SHALL show them as a row of links labelled "Report sections", the current one marked `aria-current="page"`, each link going to its path with the same query. Under each section name it SHALL show a headline:
- Status: the verdict of REQ-REPORTS-027, with a warning icon for "At risk", "Late" and "Finished <n> d late"; no headline for a period.
- Team, from the team report:
  - for a milestone: "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone; "Starts <start>" before its start; "<closed> of <scope> done, late" with a warning icon when the milestone is late (REQ-MILESTONE-UI-023); otherwise "<closed> of <scope> done, on pace", or ", behind pace" with a warning icon when `pace_needed` is above `pace`;
  - for a period: "<n> members", counting `members` without `Unassigned`.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> days per point" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Milestones list has loaded; no headline when `days_per_point` is `null`.
- Rework: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Bugs, from the bugs report (REQ-REPORTS-039): "<n> open bugs" ("1 open bug"), where `<n>` is `figures.open_now`, or "No open bugs" when it is 0.

The page SHALL request the team report, the status report, the bugs report and the Milestones list (REQ-MILESTONE-UI-008, for the forecast `finish` of REQ-MILESTONE-UI-023 and for the Velocity section) whatever the section, and SHALL request the Milestones list at most once per project and refresh. WHILE the Milestones list is loading or after it failed, the Status and Team headlines SHALL apply REQ-MILESTONE-UI-023 without the forecast. It SHALL show no headline for a section while its report loads or after it failed to load. WHEN the path is `/reports`, the page SHALL go to `/reports/status`, and WHEN the URL has `tab`, to the section it names, `quality` naming Rework and any other value, the retired `usage` and `coverage` included, naming Status, in both cases dropping `tab`, keeping the rest of the query and adding no history entry. A path under `/reports/` naming no section SHALL show the page of REQ-UI-125. Changing the section SHALL keep the project, the scope, the member and the status. WHILE the window is narrower than the row of links, the row SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden links.
Source: `assets/2026-11-12/mockup/index.html`, `../ui/assets/2026-11-22/index.html#reports`

#### Scenario: shared link
- GIVEN the URL `/reports/rework?project=alpha&days=7`
- WHEN the page loads
- THEN Rework is marked current and its panel shows the report for `alpha` and 7 days

#### Scenario: old tab links
- GIVEN the URLs `/reports?project=alpha&days=7&tab=quality`, `/reports?project=alpha&tab=coverage` and `/reports?project=alpha`
- WHEN each page loads
- THEN the URLs become `/reports/rework?project=alpha&days=7`, `/reports/status?project=alpha` and `/reports/status?project=alpha`, without a history entry

#### Scenario: unknown section
- GIVEN the URL `/reports/nope?project=alpha`
- WHEN the page loads
- THEN the page of REQ-UI-125 is shown

#### Scenario: change section
- GIVEN the Reports page for `alpha`, 90 days and the Delivery section
- WHEN the user opens Rework
- THEN the URL becomes `/reports/rework?project=alpha&days=90` without a reload and no new report is requested

#### Scenario: velocity section
- GIVEN the Reports page for `alpha` on the Delivery section, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user opens Velocity
- THEN the path is `/reports/velocity`, `GET /api/milestones?project=alpha` has been requested once, and the Velocity headline reads "1.4 days per point"

#### Scenario: headlines
- GIVEN a report with 41 closed beads and rework rate 0.09, and a status report whose verdict is "At risk"
- WHEN the page is shown for a milestone
- THEN the headlines read "At risk" with a warning icon, "41 beads closed" and "9% rework", and no section is named Quality, AI usage or Data coverage

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- WHEN the page is shown on the Delivery section
- THEN the Team headline reads "27 of 64 done, on pace" without a warning icon

#### Scenario: late milestone headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed whose forecast `finish` is after its `end`
- WHEN the page is shown
- THEN the Team headline reads "27 of 64 done, late" with a warning icon

#### Scenario: period headlines
- GIVEN `/reports/delivery?project=alpha&days=30` with a team report of members `ann`, `bao` and `Unassigned`
- WHEN the page is shown
- THEN Status has no headline and Team reads "2 members"

#### Scenario: bugs section and headline
- GIVEN `/reports/rework?project=alpha&days=30` with a bugs report whose `figures.open_now` is 25
- WHEN the user opens Bugs
- THEN the URL becomes `/reports/bugs?project=alpha&days=30`, no new report is requested, and the Bugs headline reads "25 open bugs" without a warning icon

#### Scenario: Hidden links are hinted
- GIVEN the Reports page at a window 360px wide where Bugs does not fit
- WHEN the page is shown
- THEN the right edge of the row fades, and scrolling it to the end removes the right fade and shows a left one

### REQ-UI-129: Report sections in the sidebar
<!-- base: 7be2b291411042612da13e5c8c75c8c8a6d9c678b3fb583c9633760deb584109 -->
WHILE a Reports page is shown in a window 1024px wide or more with the sidebar expanded, the Main navigation SHALL list the report sections of REQ-UI-095 under the Reports link, each as a link with the section name and its headline, SHALL mark the selected section with `aria-current="page"`, and each link SHALL go to the path of its section with the same query. WHILE the window is narrower or the sidebar is collapsed, the sidebar SHALL list no sections and the page SHALL show the row of section links of REQ-UI-095. The Reports link SHALL be marked current on every path under `/reports`. The section links SHALL NOT show on other pages.
Source: `../ui/assets/2026-11-22/index.html#reports`, `../ui/assets/2026-11-22/reports-light.png`

#### Scenario: Sections in the sidebar
- GIVEN a window 1440px wide, the sidebar expanded and `/reports/delivery?project=a&milestone=m2`
- WHEN the page is shown
- THEN the sidebar lists Status, Team, Delivery, Velocity, Rework and Bugs under Reports with their headlines, Delivery is marked current, and the page shows no row of section links

#### Scenario: Change section
- GIVEN the Reports page at `/reports/delivery?project=a&days=7` with sections in the sidebar
- WHEN the user clicks Rework in the sidebar
- THEN the URL becomes `/reports/rework?project=a&days=7` and the Rework panel is shown

#### Scenario: Narrow window
- GIVEN a window 900px wide
- WHEN the Reports page is shown
- THEN the sidebar lists no sections and the page shows its row of section links
