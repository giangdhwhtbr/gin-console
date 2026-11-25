# Spec Delta: Overview for leads

## ADDED

### REQ-OVERVIEW-001: Overview request
WHEN a client requests `GET /api/overview`, the server SHALL return `generated_at`, `aging_days` (REQ-CONFIG-007) and `projects`, the configured projects in config order, each with `name`, `error` and, when `error` is `null`, `stale` (REQ-BEADS-013), `milestone` (REQ-OVERVIEW-006), `blocked` (REQ-OVERVIEW-002), `aging` (REQ-OVERVIEW-003), `unassigned` (REQ-OVERVIEW-004), `in_progress` (REQ-OVERVIEW-005) and `epics` (the epics with status `in_progress`, by `id`, with `id` and `title`), read from each project's `bd export` snapshot (REQ-BEADS-012), and SHALL NOT start any process. IF the beads of a project cannot be read (REQ-BEADS-005) or its directory does not exist, THEN its `error` SHALL hold the message and the other projects SHALL be returned as usual.

#### Scenario: No process
- GIVEN two existing projects with `.beads/issues.jsonl`
- WHEN a client requests `GET /api/overview`
- THEN the response is 200 with both projects in config order and no `gin` or `bd` process was started

#### Scenario: One project unreadable
- GIVEN project `a` without `.beads/issues.jsonl` and project `b` with one
- WHEN a client requests `GET /api/overview`
- THEN `a` has an `error` message and `b` has its lists

#### Scenario: Missing directory
- GIVEN a project whose directory does not exist
- WHEN a client requests `GET /api/overview`
- THEN its `error` says the directory does not exist

### REQ-OVERVIEW-002: Blocked work
Type: business-rule
`blocked` SHALL hold every blocked bead of the project by the rule of REQ-BEADS-021 without prep tasks, milestones and merge gates, longest wait first and then by `id`, each with `id`, `title`, `assignee`, `days` (its wait in working days, worked out as for REQ-REPORTS-025) and `blocker`, found by the rule of REQ-REPORTS-025 with the blocker's assignee as `person`, or `null` when no open blocker is in the project's export.

#### Scenario: Blocker and its person
- GIVEN bead `t-3` waiting 4 working days on open bead `t-8` assigned to `bao@example.com`
- WHEN the overview is built
- THEN `t-3` has `days` 4 and the blocker `t-8` with `person` `bao`

#### Scenario: Blocked through its parent
- GIVEN epic `e-1` blocked by open bead `a-1`, and its open child `e-1.1` without blockers of its own
- WHEN the overview is built
- THEN `e-1` and `e-1.1` are both listed with the blocker `a-1`

#### Scenario: No blocker to show
- GIVEN a bead with status `blocked` and no blocker
- WHEN the overview is built
- THEN it is listed with `blocker` `null`

### REQ-OVERVIEW-003: Work in progress too long
Type: business-rule
`aging` SHALL hold the beads with status `in_progress` that are not blocked, not prep tasks, milestones or merge gates, and not epics split into tracks, whose `days`, the working days after the day of `started_at`, or of `updated_at` when it has no `started_at`, up to today, is above `aging_days`, longest first and then by `id`, each with `id`, `title`, `assignee` and `days`.

#### Scenario: Above the threshold
- GIVEN `aging_days` 3 and beads started on Monday 16 Nov and Wednesday 18 Nov 2026, today Friday 20 Nov 2026
- WHEN the overview is built
- THEN only the first is listed, with `days` 4

#### Scenario: Weekend not counted
- GIVEN `aging_days` 3 and a bead started on Thursday 19 Nov 2026, today Tuesday 24 Nov 2026
- WHEN the overview is built
- THEN its wait is 3 working days and it is not listed

#### Scenario: Blocked and split epics left out
- GIVEN a blocked in-progress bead and an in-progress epic with tracks, both started 10 working days ago
- WHEN the overview is built
- THEN neither is in `aging`

#### Scenario: No start recorded
- GIVEN an in-progress bead without `started_at` updated 5 working days ago, and `aging_days` 3
- WHEN the overview is built
- THEN it is listed with `days` 5

### REQ-OVERVIEW-004: Unassigned ready work
Type: business-rule
`unassigned` SHALL hold the beads that are ready (REQ-BEADS-007) and have no `assignee`, leaving out prep tasks, milestones, merge gates and epics split into tracks, by `priority` and then by `id`, each with `id`, `title` and `priority`; the `owner` SHALL NOT count as an assignee.

#### Scenario: Owner is not assignee
- GIVEN a ready bead with `owner` `lead@example.com` and no `assignee`, and a ready bead assigned to `ann`
- WHEN the overview is built
- THEN only the first is listed

#### Scenario: Split epic
- GIVEN ready epic `e-1` without assignee whose ready track `e-1.1` has no assignee
- WHEN the overview is built
- THEN `e-1.1` is listed and `e-1` is not

### REQ-OVERVIEW-005: Work in progress per member
Type: business-rule
`in_progress` SHALL hold the beads with status `in_progress` that are not blocked, leaving out prep tasks, milestones, merge gates and epics split into tracks, each with `id`, `title` and `assignee`. The Overview page SHALL group these beads of all projects by person (REQ-BEADS-023), showing for each the total, the number per project and the beads, highest total first and then by name, with "Unassigned" last when a bead has no assignee.

#### Scenario: One person in two projects
- GIVEN an in-progress bead assigned to `ann` in project `a` and two assigned to `ann@example.com` in project `b`
- WHEN the Overview page is shown
- THEN one row reads `ann` with total 3, 1 in `a` and 2 in `b`

#### Scenario: Unassigned last
- GIVEN 1 in-progress bead of `ann` and 4 without assignee
- WHEN the Overview page is shown
- THEN `ann` comes first and "Unassigned" last

### REQ-OVERVIEW-006: Milestone of a project
Type: business-rule
`milestone` SHALL be the `id` and `title` of the first that exists among the project's open milestones listed by REQ-REPORTS-008: the one past its `end` with the earliest `end`, whether or not it was kicked off; else the current milestone of REQ-BEADS-015; else `null`. A closed milestone SHALL never be chosen.

#### Scenario: Overdue and never kicked off
- GIVEN planned milestone `m1` ended yesterday and active milestone `m2` ends next month
- WHEN the overview is built
- THEN `milestone` is `m1`

#### Scenario: Only closed milestones
- GIVEN a project whose only milestone is closed
- WHEN the overview is built
- THEN `milestone` is `null`

### REQ-OVERVIEW-007: Milestone verdicts
The Overview page SHALL show one line per project without an error: the title of its milestone (REQ-OVERVIEW-006) as a link to the milestone page, with the verdict and sentence of REQ-REPORTS-027 from `GET /api/reports/status` for that milestone, or "No open milestone" when there is none. It SHALL show the verdict before the forecast `finish` is loaded with the note "Checking forecast", SHALL update it once `GET /api/milestones` answers, and IF that request fails, THEN SHALL keep the verdict without the forecast with the note "Forecast not loaded". IF the status request fails, THEN the line SHALL show its error and the other lines SHALL be shown as usual.

#### Scenario: Forecast changes the word
- GIVEN the verdict of `m1` is "On track" without a forecast
- WHEN the forecast answers with a `finish` after the `end` of `m1`
- THEN the line changes to "Late" and "Checking forecast" is gone

#### Scenario: Forecast fails
- GIVEN `GET /api/milestones?project=a` answers 502
- WHEN the Overview page is shown
- THEN the line of `a` keeps its verdict and says "Forecast not loaded"

#### Scenario: No open milestone
- GIVEN project `b` with `milestone` `null`
- WHEN the Overview page is shown
- THEN its line reads "No open milestone" and no status is requested for `b`

### REQ-OVERVIEW-008: Gates not met and waivers
Type: business-rule
After the overview has loaded, the page SHALL request `GET /api/beads/<project>/<epic>/workflow` for each of the `epics` of every project, at most 4 at a time, and SHALL list:
- under "Gates not met", each epic with `requirement_confirmed`, `plan_approved` or `orchestration_ready` `unmet`, or any gate `unknown`, naming those gates;
- under "Waivers", each gate whose value starts with `waived`, with its reason, and each review waiver, with its bead and reason.
WHILE requests are open, the page SHALL show "Checking <done> of <total>" in place of both counts. IF a request fails, THEN "Gates not met" SHALL hold the line "Could not read gates" with the epic and the error, which SHALL NOT be counted.

#### Scenario: Started before its plan
- GIVEN in-progress epic `e-1` with `plan_approved` `unmet`, and in-progress epic `e-2` with only `implementation_complete` and `shipped` `unmet`
- WHEN the gates are read
- THEN "Gates not met (1)" lists `e-1` with `plan_approved` and not `e-2`

#### Scenario: Waivers
- GIVEN in-progress epic `e-1` whose `plan_approved` is `waived(hotfix)` and which has a review waiver of `e-1.2` with the reason "no reviewer"
- WHEN the gates are read
- THEN "Waivers (2)" lists `plan_approved` with "hotfix" and `e-1.2` with "no reviewer"

#### Scenario: Still checking
- GIVEN 14 epics of which 5 have answered
- WHEN the page is shown
- THEN both sections read "Checking 5 of 14" and no count

#### Scenario: One epic fails
- GIVEN the request of `e-3` answers 502
- WHEN all requests have ended
- THEN "Could not read gates" names `e-3` and the error, and the count leaves it out

#### Scenario: Bounded requests
- GIVEN 14 epics
- WHEN the page asks for their gates
- THEN at most 4 workflow requests are open at any time

### REQ-OVERVIEW-009: Needs attention lists
The Overview page SHALL show, under "Needs attention", the sections "Blocked", "In progress > <aging_days> days", "Gates not met", "Waivers" and "Unassigned ready" in this order, over all projects, each with its count, its first 10 rows in the order of its list across projects and, when it has more, a "Show all" button. Each row SHALL name its project and link to its bead page, and show the assignee (REQ-UI-135) where the list has one; a Blocked row SHALL show its wait and its blocker, as a link, with the blocker's person. An empty section SHALL read "None". Each section heading, the workload heading and the milestones heading SHALL explain its rule in a tooltip (REQ-UI-132). The page SHALL hold no control that changes a project or a bead.

#### Scenario: More than ten
- GIVEN 12 blocked beads in three projects
- WHEN the Overview page is shown
- THEN "Blocked (12)" shows the 10 that waited longest, and "Show all" shows the other 2

#### Scenario: Nothing to do
- GIVEN no waiver on an in-progress epic
- WHEN the gates are read
- THEN "Waivers (0)" reads "None"

#### Scenario: Definition
- GIVEN `aging_days` is 3
- WHEN keyboard focus reaches the heading "In progress > 3 days"
- THEN a tooltip says which beads count, that days are working days, and that blocked beads are listed under Blocked

### REQ-OVERVIEW-010: Loading and errors
WHILE the Overview page is visible, it SHALL request `GET /api/overview` again every 10 seconds, and SHALL request verdicts, forecasts and gates only when the page opens, when "Refresh data" is used (REQ-UI-096), and for an epic or milestone that the overview did not name before. IF a later `GET /api/overview` fails, THEN the page SHALL keep what it shows and add the error. The page SHALL show one alert per project with an `error`, and for each project with `stale` `true` the note of REQ-UI-103 for that project. WHEN no project is configured, it SHALL say so.

#### Scenario: Project error
- GIVEN project `a` has an `error` and `b` has none
- WHEN the Overview page is shown
- THEN one alert names `a` and its error, and the lists hold the beads of `b`

#### Scenario: Poll does not run gin
- GIVEN the page is open and its gates and verdicts are loaded
- WHEN 10 seconds pass and the overview names the same epics and milestones
- THEN `/api/overview` is requested again and no workflow, status or milestones request is sent

#### Scenario: Later failure
- GIVEN the lists are shown
- WHEN the next `GET /api/overview` fails
- THEN the lists stay and an alert shows the error

#### Scenario: No projects
- GIVEN no project is configured
- WHEN the Overview page is shown
- THEN it says no projects are configured

### REQ-OVERVIEW-011: Overview on a phone
Type: non-functional
Category: usability
At a window width of 360px the Overview page SHALL show every fact of its rows without sideways scrolling of the page.

#### Scenario: Narrow window
- GIVEN a window 360px wide, a project name of 60 characters and a blocked bead with a blocker
- WHEN the Overview page is shown
- THEN the page's scroll width does not exceed its client width, and the row shows the bead, project, assignee, wait, blocker and the blocker's person

### REQ-CONFIG-007: Overview settings
The config SHALL accept an optional top-level `overview` section whose `aging_days` is an integer of at least 1, default 3; IF `aging_days` is anything else, THEN the console SHALL exit with a non-zero status and a message naming `overview.aging_days` (REQ-CONFIG-003).

#### Scenario: Default
- GIVEN a config without `overview`
- WHEN the console starts
- THEN `aging_days` is 3

#### Scenario: Set
- GIVEN a config with `overview: {aging_days: 5}`
- WHEN the console starts
- THEN `aging_days` is 5

#### Scenario: Invalid
- GIVEN a config with `overview: {aging_days: 0}`
- WHEN the console starts
- THEN it exits non-zero and the message names `overview.aging_days`

## MODIFIED

### REQ-UI-055: Main navigation
<!-- base: 38d488fb8fcaca785f43544cdc88eaa2890127c281521db0455df075d4ddf939 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Overview, Beads, My Tasks, Milestones and Reports, in that order, Overview going to `/` and the others to `/beads`, `/my-tasks`, `/milestones` and `/reports` with `?project=<current project>` (REQ-UI-124).

#### Scenario: Five links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Overview, Beads, My Tasks, Milestones and Reports, one each, going to `/`, `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a` and `/reports?project=a`


### REQ-UI-057: Current destination
<!-- base: e16f2d59d77de8001399d690738683889530b927533802ea11d8bc625e315b5f -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight: Overview on `/`, Beads on `/beads`, My Tasks on `/my-tasks`, Milestones on `/milestones` and `/milestones/<project>/<id>`, Reports on `/reports`. On a bead page it SHALL mark the link of the page the user opened the bead from in this browser tab (REQ-UI-073: Overview, My Tasks, Milestones or Reports), and Beads when the bead was opened from the Beads page, another bead page, or by its address. It SHALL mark no link on the page of REQ-UI-125 and SHALL mark no other link.

#### Scenario: Bead page by address
- GIVEN the URL `/beads/alpha/a-1` opened in a new tab
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Bead page from My Tasks
- GIVEN the user opened `a-1` from the My Tasks page
- WHEN the bead page is shown
- THEN only the My Tasks link has `aria-current="page"`

#### Scenario: Milestone page
- GIVEN the URL `/milestones/alpha/m-1`
- WHEN the page loads
- THEN only the Milestones link has `aria-current="page"`

#### Scenario: Reports page
- GIVEN the URL `/reports?project=alpha`
- WHEN the page loads
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Address of a retired page
- GIVEN the URL `/sessions/alpha/s-1`
- WHEN the page loads
- THEN the page of REQ-UI-125 is shown and no link has `aria-current="page"`

#### Scenario: Change page
- GIVEN the My Tasks page is shown
- WHEN the user clicks "Reports"
- THEN only the Reports link has `aria-current="page"`

#### Scenario: Bead page from Overview
- GIVEN the user opened `a-1` from the Overview page
- WHEN the bead page is shown
- THEN only the Overview link has `aria-current="page"`


### REQ-UI-063: Page title
<!-- base: df8c5fba77a0d9d56ed042f702ab06de954f884f85462c4fdabeb57e1f757a61 -->
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Overview · gin-console`, `Beads · <project> · gin-console`, `My Tasks · <project> · gin-console`, `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console` with `<section>` one of Status, Team, Delivery, Velocity and Rework, `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

#### Scenario: Bead page
- GIVEN the bead `a-1` titled "Team checkout" in project `example`
- WHEN its page has loaded
- THEN the document title is `Team checkout · example · gin-console`

#### Scenario: Reports section
- GIVEN `/reports/rework?project=example`
- WHEN the page loads
- THEN the document title is `Reports · Rework · example · gin-console`

#### Scenario: My Tasks
- GIVEN `/my-tasks?project=example`
- WHEN the page loads
- THEN the document title is `My Tasks · example · gin-console`

#### Scenario: Loading
- GIVEN a milestone page whose milestone is still loading
- WHEN the page is shown
- THEN the document title is `gin-console`

#### Scenario: Overview
- GIVEN two configured projects
- WHEN `/` is shown
- THEN the document title is `Overview · gin-console`


### REQ-UI-072: Breadcrumb
<!-- base: 1fd8a2f3d5dfc237dddcfd7815a48cb2df2d32dd884f3540ab4495e6409d14f9 -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a filter is active (REQ-UI-143), ", N filters" where N counts the active filters, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "Overview", "My Tasks" or "Reports"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` titled "Fix login" is shown
- THEN the breadcrumb reads "Beads › Board, 2 filters" then "Fix login", and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1` titled "Checkout"
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`

#### Scenario: No remembered place
- GIVEN no page was remembered in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then the title of `a-1`, and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

#### Scenario: From a milestone page
- GIVEN the Beads tab of milestone `m2` titled "Checkout v2" of project `a` was last at `?tab=beads&view=board&status=open`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Checkout v2 › Board, 1 filter" then the title of `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

#### Scenario: From My Tasks
- GIVEN the My Tasks page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My Tasks" then the title of `a-1`, and "My Tasks" goes to `/my-tasks?project=a`

#### Scenario: Show closed and the milestone
- GIVEN the Beads page was last at `?project=a&view=list&closed=1&milestone=all&kind=technical`, and `a` has a current milestone
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads › List, 2 filters" then the title of `a-1`

#### Scenario: From Overview
- GIVEN the Overview page was shown last
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "Overview" then the title of `a-1`, and "Overview" goes to `/`


### REQ-UI-073: Remembered place
<!-- base: 3fe05bd76f7c5e7d2328a7a6a8cd4e9a5742f755211f1319785d241fd06cf0d8 -->
The Overview page, the Beads page, the My Tasks page, the Reports page and the milestone page (any tab) SHALL remember their path and URL query for the current browser tab, the one shown last replacing the others, SHALL use it for the first link of the breadcrumb (REQ-UI-072) and the marked navigation link (REQ-UI-057) when it is the Overview page or of the bead's project and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

#### Scenario: Back to the Board with its filters
- GIVEN the Board with the filter status "open" is shown
- WHEN the user opens a card and then uses the first link of the breadcrumb
- THEN the Board is shown with the filter status "open"

#### Scenario: From bead to bead
- GIVEN the user came from the Board with filters and opens a related bead from the bead page
- WHEN the related bead is shown and the first link of the breadcrumb is used
- THEN the Board with the same filters is shown

#### Scenario: Other project
- GIVEN the remembered place is the Beads page of project `a`
- WHEN the bead page of a bead of project `b` is shown
- THEN the first link goes to `/beads?project=b`

#### Scenario: Reload
- GIVEN the Beads page was last at `view=focus` in this tab
- WHEN the bead page is reloaded
- THEN its breadcrumb still returns to the Focus view

#### Scenario: Storage refused
- GIVEN the browser throws when the place is stored
- WHEN the user opens a bead and uses the breadcrumb
- THEN the remembered place of this visit is used and no error is shown

#### Scenario: Milestone page last
- GIVEN the user opened the Beads page and then the Beads tab of milestone `m2` with the Graph view
- WHEN the user opens a node's bead page and uses the first link of the breadcrumb
- THEN the Graph view of the Beads tab of `m2` is shown

#### Scenario: My Tasks of another project
- GIVEN My Tasks was last at `/my-tasks?project=a`
- WHEN the bead page of a bead of project `b` is opened by its address
- THEN the first link reads "Beads" and goes to `/beads?project=b`

#### Scenario: Overview with beads of two projects
- GIVEN the Overview page was shown last and the current project is `a`
- WHEN the user opens a bead of project `b` from it
- THEN the first link reads "Overview" and goes to `/`


### REQ-UI-099: Home page and My Tasks navigation
<!-- base: 00ea3e463b6e585119acb52c67dec583a080af2d1ed8779d77d40f1da95c1961 -->
The "Main" navigation SHALL contain a "My Tasks" link after "Beads", and the frontend SHALL show the My Tasks page at `/my-tasks` without a full reload, marking the link as current there, and SHALL show the Overview page at `/` without changing the address.

#### Scenario: Open My Tasks
- GIVEN the Beads page of project `a` is shown
- WHEN the user clicks "My Tasks"
- THEN the URL is `/my-tasks?project=a`, the My Tasks page is shown without a reload and "My Tasks" is the current link

#### Scenario: Home address
- GIVEN the current project is `a`
- WHEN the user opens `/`
- THEN the Overview page is shown and the URL stays `/`

#### Scenario: Home address without projects
- GIVEN no project is configured
- WHEN the user opens `/`
- THEN the URL stays `/` and the page says no projects are configured


### REQ-UI-123: Project switcher
<!-- base: 4e5e7ee4d77c6363f757044dd340e93dca965bcb37e86c9897bd9238efc8b699 -->
The frontend SHALL show a project switcher labelled "Project" that names the current project (REQ-UI-124): at the top of the sidebar from 1024px while the sidebar is expanded, as a button holding the first letter of the project in the icon rail (from 768px up to 1023px, or while the sidebar is collapsed), and in the top bar below 768px. Opening it SHALL list every configured project whose directory exists, from `GET /api/projects/beads`, with the favorite first, each with a star button labelled "Make <name> the favorite" or, on the favorite, "Remove <name> as favorite", marked with `aria-pressed`. WHEN the user chooses a project, the frontend SHALL make it the current project and SHALL then:
- on the Overview page, stay on `/` with the same content, the links of the Main navigation following the chosen project;
- on the Beads, My Tasks, Milestones or Reports page, stay on that page with `project` replaced, keeping `view`, `closed`, `tab`, `days` and `q`, and dropping `milestone`, `select`, `scope`, `member`, `status`, `sprint` and the other filters;
- on a bead page, open the Beads page of the chosen project; on a milestone page, open the Milestones page of the chosen project.

#### Scenario: Choose on the Beads page
- GIVEN the Beads page at `/beads?project=a&view=board&milestone=m1&status=open`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/beads?project=b&view=board` and the Board of `b` is shown

#### Scenario: Choose on My Tasks
- GIVEN the My Tasks page at `/my-tasks?project=a&closed=1&milestone=m1`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/my-tasks?project=b&closed=1` and the tasks of `b` are shown

#### Scenario: Choose on a bead page
- GIVEN the bead page `/beads/a/a-1`
- WHEN the user chooses project `b`
- THEN the Beads page of `b` is shown

#### Scenario: Favorite first
- GIVEN projects `a`, `b` and `c`, and `c` is the favorite
- WHEN the user opens the switcher
- THEN `c` is listed first with its star pressed, then `a` and `b`

#### Scenario: Icon rail
- GIVEN a window 820px wide and the current project `qwikfone`
- WHEN any page is shown
- THEN the rail holds a button "Project: qwikfone" showing "q"

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN any page is shown
- THEN the switcher is in the top bar

#### Scenario: Choose on Overview
- GIVEN the Overview page is shown and the current project is `a`
- WHEN the user chooses project `b`
- THEN the URL stays `/`, the page shows the same lists, and the Beads link goes to `/beads?project=b`


### REQ-BEADS-023: One person for an email and its handle
<!-- base: 7ee5b1524e0a1c30399ff16aedd456b5e0ec3639a38bcc8d8d987846bdfafb0d -->
Type: business-rule
The console SHALL take two assignee values for the same person WHEN they are equal once each is trimmed, lower-cased and cut before its first `@`, SHALL name that person by that cut value (its handle), and SHALL apply this rule in the Assignee filter (REQ-UI-082), Group by assignee (REQ-UI-034), the assignee shown on beads (REQ-UI-135), My Tasks (REQ-UI-100), the members of the Team report (REQ-REPORTS-009) and the workload of the Overview page (REQ-OVERVIEW-005).

#### Scenario: Email and handle
- GIVEN beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `ann@example.com`
- WHEN the Assignee filter lists its options
- THEN it lists the people `ann` and `giangdhwhtbr` once each

#### Scenario: Same handle at two domains
- GIVEN beads assigned to `ann@a.example` and `ann@b.example`
- WHEN the team report is built
- THEN both count for the one member `ann`


### REQ-MILESTONE-UI-023: Late milestone
<!-- base: b9cc99e626b6f7f1db14a67beaf26d50b99d015afccd83e14d212d581585f205 -->
Type: business-rule
A milestone SHALL be late WHEN it is not closed and today is after its `end`, WHEN it is not closed and its forecast `finish` (REQ-MILESTONE-UI-008) is after its `end`, or WHEN it is closed and the day it closed is after its `end`. The Milestones list (REQ-MILESTONE-UI-001), the milestone card of a bead page and of an epic Overview (REQ-UI-120), the Team tab (REQ-REPORTS-012), the Team headline (REQ-UI-095) and the Overview page (REQ-OVERVIEW-007) SHALL mark a milestone late by this rule only, and "behind pace" SHALL describe the pace of closing only, never lateness.

#### Scenario: Forecast after the end
- GIVEN active milestone `m1` ending on 1 Dec 2026 with a forecast `finish` of 16 Feb 2027, shown on 21 Nov 2026
- WHEN the Milestones list, the Team tab and the milestone card of one of its epics are shown
- THEN each marks `m1` late

#### Scenario: Past the end without a forecast
- GIVEN active milestone `m2` ending on 20 Nov 2026 with no forecast `finish`, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN `m2` is marked late

#### Scenario: Closed on time and closed late
- GIVEN milestone `m3` ending on Friday 27 Nov 2026 and closed that day, and milestone `m4` with the same end closed on Tuesday 1 Dec 2026
- WHEN the Team tab is shown for each
- THEN `m3` reads "Closed, on time" and `m4` reads "Closed, 2 d late"

#### Scenario: Behind pace is not late
- GIVEN active milestone `m5` ending on 11 Dec 2026 with a forecast `finish` of 10 Dec 2026, `pace` 2.0 and `pace_needed` 3.4, shown on 21 Nov 2026
- WHEN the Team tab is shown
- THEN its headline says "behind pace" and nothing calls `m5` late
