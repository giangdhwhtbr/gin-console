# Spec Delta: Navigation shell

## ADDED

### REQ-UI-123: Project switcher
The frontend SHALL show a project switcher labelled "Project" that names the current project (REQ-UI-124): at the top of the sidebar from 1024px while the sidebar is expanded, as a button holding the first letter of the project in the icon rail (from 768px up to 1023px, or while the sidebar is collapsed), and in the top bar below 768px. Opening it SHALL list every configured project whose directory exists, from `GET /api/projects/beads`, with the favorite first, each with a star button labelled "Make <name> the favorite" or, on the favorite, "Remove <name> as favorite", marked with `aria-pressed`. WHEN the user chooses a project, the frontend SHALL make it the current project and SHALL then:
- on the Beads, Milestones or Reports page, stay on that page with `project` replaced, keeping `view`, `closed`, `tab`, `days` and `q`, and dropping `milestone`, `select`, `scope`, `member`, `status`, `sprint` and the other filters;
- on a bead page, open the Beads page of the chosen project; on a milestone page, open the Milestones page of the chosen project;
- on the Projects or My Tasks page, stay on the page unchanged.

#### Scenario: Choose on the Beads page
- GIVEN the Beads page at `/beads?project=a&view=board&milestone=m1&status=open`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/beads?project=b&view=board` and the Board of `b` is shown

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

### REQ-UI-124: Current project
The frontend SHALL take the current project, in this order: from the `project` query of the URL when it names a configured project whose directory exists; else the project last chosen in this browser tab; else the favorite project; else the first configured project. It SHALL remember as last chosen, for the browser tab, the project the Beads, Milestones, Reports, bead or milestone page shows and a single project chosen in the switcher or in the project select of the Reports or My Tasks page ("All projects" changes nothing), and SHALL remember the favorite across tabs and visits. The Main navigation links Beads, Milestones and Reports SHALL carry `?project=<current project>`, and the links Projects and My Tasks SHALL NOT. WHEN the Beads, Milestones or Reports page opens without `project`, it SHALL show the current project and write it into the URL without adding a history entry. A remembered or favorite project that is no longer configured SHALL be skipped. IF the browser refuses to store a choice, THEN the choice SHALL last for the visit without an error.

#### Scenario: Links carry the project
- GIVEN the current project is `b`
- WHEN any page is shown
- THEN the Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b`, Reports to `/reports?project=b`, and My Tasks to `/my-tasks`

#### Scenario: Last chosen beats the favorite
- GIVEN the favorite is `a` and the user chose `b` earlier in this tab
- WHEN the user opens `/milestones`
- THEN the Milestones page of `b` is shown and the URL becomes `/milestones?project=b`

#### Scenario: Favorite in a new tab
- GIVEN the favorite is `c`
- WHEN the user opens `/beads` in a new browser tab
- THEN the Beads page of `c` is shown

#### Scenario: Removed project
- GIVEN the favorite `old` is no longer configured and nothing was chosen in this tab
- WHEN the user opens `/beads`
- THEN the first configured project is shown

#### Scenario: My Tasks keeps all projects
- GIVEN the current project is `b`
- WHEN the user opens My Tasks from the navigation
- THEN My Tasks shows "All projects"

#### Scenario: Storage refused
- GIVEN the browser throws when a choice is stored
- WHEN the user chooses project `b` and opens Milestones
- THEN the Milestones page of `b` is shown and no error is shown

### REQ-UI-125: Page not found
WHEN the path matches no page of the console, including the retired `/sessions`, `/sessions/<project>/<id>` and `/quota`, the frontend SHALL show the heading "Page not found", the path, and links to Projects and to the Beads page of the current project, SHALL set the document title to `Page not found · gin-console`, and SHALL mark no link of the Main navigation.

#### Scenario: Unknown path
- GIVEN the current project is `a`
- WHEN the user opens `/nope`
- THEN the page shows "Page not found", `/nope`, a link to `/` and a link to `/beads?project=a`

#### Scenario: Retired address
- GIVEN any configured projects
- WHEN the user opens `/sessions/alpha/s-1`
- THEN the page shows "Page not found" and no navigation link has `aria-current="page"`

### REQ-UI-126: Unknown project
WHEN the URL names a project that is not configured, in the `project` query of the Beads, Milestones or Reports page or in the path of a bead or milestone page, the frontend SHALL show "No project <name> is configured" with one link per configured project to the same page for that project, instead of another project's data, and SHALL NOT remember the name as the current project. The Reports value `all` is not a project name.

#### Scenario: Beads query
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/beads?project=a` and `/beads?project=b`, and shows no beads

#### Scenario: Bead path
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads/zzz/z-1`
- THEN the page says "No project zzz is configured" and the current project is unchanged

### REQ-UI-127: Back to your place
WHEN the user comes back with the browser Back or Forward button to the Projects, Beads, My Tasks, Milestones, milestone or Reports page, the frontend SHALL scroll the page to where it was when the user left it, once the page shows its data, and WHEN the user left it by opening a bead, SHALL move the keyboard focus to that bead's row, card or node and mark it as last opened for 2 seconds, without motion WHILE the user asks for reduced motion. A page opened by a link or by its address SHALL start at the top. IF the browser refuses to store the position, THEN the page SHALL start at the top without an error.

#### Scenario: Back to a long list
- GIVEN the List view of the Beads page scrolled 1,200px down
- WHEN the user opens a bead from it and then uses the browser Back button
- THEN the List view shows at 1,200px down

#### Scenario: Last opened card
- GIVEN the Board of the Beads page
- WHEN the user opens the card `a-7` and comes back with the browser Back button
- THEN the card `a-7` has the keyboard focus and is marked as last opened

#### Scenario: Link starts at the top
- GIVEN the Beads page was left scrolled down
- WHEN the user opens it again from the navigation
- THEN it starts at the top

#### Scenario: Storage refused
- GIVEN the browser throws when the position is stored
- WHEN the user comes back with the browser Back button
- THEN the page starts at the top and no error is shown

### REQ-UI-128: Skip link
Every page SHALL start with a link "Skip to content" that is the first element to take the keyboard focus, is visible only while it has the focus, and moves the focus to the main content.

#### Scenario: Skip the navigation
- GIVEN any page has just loaded
- WHEN the user presses Tab and then Enter
- THEN the focus is on the main content and the navigation was skipped

### REQ-UI-129: Report sections in the sidebar
WHILE a Reports page is shown in a window 1024px wide or more with the sidebar expanded, the Main navigation SHALL list the report sections of REQ-UI-095 under the Reports link, each as a link with the section name and its headline, SHALL mark the selected section with `aria-current="page"`, and each link SHALL go to the same URL with `tab` set to its section. WHILE the window is narrower or the sidebar is collapsed, the sidebar SHALL list no sections and the page SHALL show the tab list of REQ-UI-095. The section links SHALL NOT show on other pages.

#### Scenario: Sections in the sidebar
- GIVEN a window 1440px wide, the sidebar expanded and `/reports?project=a&tab=delivery`
- WHEN the page is shown
- THEN the sidebar lists Team, Delivery, Velocity, AI usage, Quality and Data coverage under Reports with their headlines, Delivery is marked current, and the page shows no tab list

#### Scenario: Change section
- GIVEN the Reports page at `/reports?project=a&days=7&tab=delivery` with sections in the sidebar
- WHEN the user clicks Quality in the sidebar
- THEN the URL becomes `/reports?project=a&days=7&tab=quality` and the Quality panel is shown

#### Scenario: Narrow window
- GIVEN a window 900px wide
- WHEN the Reports page is shown
- THEN the sidebar lists no sections and the page shows its tab list

## MODIFIED

### REQ-UI-023: Project choice
<!-- base: 3b9a5087f7e4a2f5f7b15313100cf446208a677a0e674a5bd8ae2d4aa18d74db -->
The bead list SHALL show the beads of the current project (REQ-UI-124), kept in the `?project=` query, SHALL NOT show a project select of its own (the switcher of REQ-UI-123 changes the project), and WHEN no project exists SHALL say that no projects are configured.

#### Scenario: Current project
- GIVEN two projects and the current project is the second
- WHEN the list opens without `?project=`
- THEN the second project's beads are shown and the URL gets `?project=<second>`

#### Scenario: No projects
- GIVEN `/api/projects/beads` returns an empty list
- WHEN the list opens
- THEN it says no projects are configured

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN the list opens
- THEN no request goes to `/api/projects`

### REQ-UI-055: Main navigation
<!-- base: 0e51e9de57970e2379478b3a70b91613f3b2e818a2a85bcc98ddbce953df6b0d -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Projects (`/`), Beads, My Tasks (`/my-tasks`), Milestones and Reports, in that order, where Beads, Milestones and Reports go to `/beads`, `/milestones` and `/reports` with `?project=<current project>` (REQ-UI-124).

#### Scenario: Five links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Projects, Beads, My Tasks, Milestones and Reports, one each, going to `/`, `/beads?project=a`, `/my-tasks`, `/milestones?project=a` and `/reports?project=a`

### REQ-UI-057: Current destination
<!-- base: 611e3da460d55b7a63833803c36336713a82e0829279cf222b2d5171553ac34b -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight: Projects on `/`, Beads on `/beads`, My Tasks on `/my-tasks`, Milestones on `/milestones` and `/milestones/<project>/<id>`, Reports on `/reports`. On a bead page it SHALL mark the link of the page the user opened the bead from in this browser tab (REQ-UI-073: My Tasks, Milestones, Reports or Projects), and Beads when the bead was opened from the Beads page, another bead page, or by its address. It SHALL mark no link on the page of REQ-UI-125 and SHALL mark no other link.

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
- GIVEN the Projects page is shown
- WHEN the user clicks "Reports"
- THEN only the Reports link has `aria-current="page"`

### REQ-UI-063: Page title
<!-- base: 0478253eb6fafd4268dde3ba7cd96f233b2bd968a4540c7e6f877b517abfe394 -->
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Projects · gin-console`, `Beads · <project> · gin-console`, `My Tasks · gin-console` (with the project when one is selected), `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console` (without the project while "All projects" is selected), `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

#### Scenario: Bead page
- GIVEN the bead `a-1` titled "Team checkout" in project `example`
- WHEN its page has loaded
- THEN the document title is `Team checkout · example · gin-console`

#### Scenario: Reports section
- GIVEN `/reports?project=example&tab=quality`
- WHEN the page loads
- THEN the document title is `Reports · Quality · example · gin-console`

#### Scenario: Loading
- GIVEN a milestone page whose milestone is still loading
- WHEN the page is shown
- THEN the document title is `gin-console`

### REQ-UI-072: Breadcrumb
<!-- base: 1fc49d22aac9d1531268304294a154d144c23fdc09cb1f6cfd7ff82f68e3d737 -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, "· N filters" where N counts them, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "My Tasks", "Reports" or "Projects"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` titled "Fix login" is shown
- THEN the breadcrumb reads "Beads › Board · 2 filters" then "Fix login", and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

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
- THEN the breadcrumb reads "Checkout v2 › Board · 1 filter" then the title of `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

#### Scenario: From My Tasks
- GIVEN the My Tasks page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My Tasks" then the title of `a-1`, and "My Tasks" goes to `/my-tasks?project=a`

### REQ-UI-073: Remembered place
<!-- base: 21bc1bf0bd22437acfcc1f11794da3a7a04b5fb40f4f85cd66d52c94bcb5a068 -->
The Projects page, the Beads page, the My Tasks page, the Reports page and the milestone page (any tab) SHALL remember their path and URL query for the current browser tab, the one shown last replacing the others, SHALL use it for the first link of the breadcrumb (REQ-UI-072) and the marked navigation link (REQ-UI-057) when it is not tied to another project than the bead's (Projects, My Tasks and Reports with "All projects" fit any project) and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

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

#### Scenario: My Tasks with all projects
- GIVEN My Tasks was last shown with "All projects"
- WHEN the user opens a bead of project `b` from it
- THEN the first link reads "My Tasks" and goes back to My Tasks with "All projects"

### REQ-UI-088: Reports page
<!-- base: a924faa87e816a125f132009e6c73bf0a7b6320ac79efd799dfa7413853eb6d9 -->
The frontend SHALL show the Reports page at `/reports`, loaded as its own chunk. The page header SHALL hold the project choice: each configured project and "All projects", with the current project (REQ-UI-124) as the default; choosing a project there makes it the current project. The panels of the Delivery, AI usage, Quality and Data coverage tabs (REQ-UI-095) SHALL hold a period choice (7, 30 or 90 days, default 30) and a sprint field, which apply to those four tabs. The Team tab has its own choices (REQ-REPORTS-012). The page SHALL keep the choices in the URL query, so that a reload, the back button and a shared link show the same report. Each tab SHALL open with its own row of figures (REQ-UI-089 to REQ-UI-091, REQ-REPORTS-013). The page SHALL label every cost "estimated" and SHALL show "no price" where a cost is absent.

#### Scenario: shared link
- GIVEN the URL `/reports?project=all&days=7&tab=delivery`
- WHEN the page loads
- THEN "All projects" and 7 days are selected and the report for them is requested

#### Scenario: change period
- GIVEN the Reports page for `alpha`, 30 days and the Delivery tab
- WHEN the user picks 90 days
- THEN the URL becomes `/reports?project=alpha&days=90&tab=delivery` without a reload and the report is requested again

#### Scenario: period kept across tabs
- GIVEN the Reports page for `alpha` with 7 days picked on the Delivery tab
- WHEN the user picks the Team tab and then the Quality tab
- THEN 7 days is selected in the Quality panel

### REQ-UI-095: Report tabs
<!-- base: bf1627ffe8aaa99420818a1201588b4defe75a6c1691489d77083e0713d692e6 -->
WHILE the report sections are not listed in the sidebar (REQ-UI-129), the Reports page SHALL show the tabs Team, Delivery, Velocity, AI usage, Quality and Data coverage, in that order, as a WAI-ARIA tab list in which Left and Right move between tabs. Under each tab name it SHALL show a headline:
- Team, from the team report of the selected milestone:
  - "Finished on time", or "Finished <n> d late" with a warning icon, for a closed milestone;
  - "Starts <start>" before its start;
  - "<closed> of <scope> closed · on pace", or "· behind pace" with a warning icon when `pace_needed` is above `pace`;
  - "<closed> of <scope> closed · past end" with a warning icon when `late_open` is above 0;
  - "No milestones" when the project has none;
  - no headline while "All projects" is selected.
- Delivery: "<closed> beads closed", where `<closed>` is `totals.closed`.
- Velocity: "<x> d/pt" from the selected project's `days_per_point` (REQ-REPORTS-018), with "assumed" when it is assumed, once the Velocity tab has loaded it; no headline while "All projects" is selected or when `days_per_point` is `null`.
- AI usage: "<tokens> tokens, <cost>", with "no price" in place of `<cost>` when `totals.cost` is absent.
- Quality: "<rate> rework", with "—" in place of `<rate>` when `totals.rework_rate` is absent.
- Data coverage: "<n> gaps" ("1 gap" when `<n>` is 1), with a warning icon when `<n>` is above 0. `<n>` is the sum of five counts: beads not collected, beads with unreadable usage, models without a price, beads with incomplete logs (`coverage.sources`), and projects under `errors`.

The page SHALL request the team report whenever a single project is selected, whatever the tab, so that the Team headline shows, and SHALL request the Milestones list for the Velocity tab only once that tab has been selected. It SHALL show no headline for a tab while its report loads or after it failed to load. It SHALL keep the selected tab in the URL query `tab` (`team`, `delivery`, `velocity`, `usage`, `quality` or `coverage`), SHALL select Team when `tab` is missing or holds another value, and SHALL keep the project, period, sprint, milestone and member when the tab changes. WHILE the window is narrower than the tab list, the tab list SHALL scroll sideways instead of widening the page and SHALL fade its edge on each side that has hidden tabs.
Source: `assets/2026-11-12/mockup/index.html`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&days=7&tab=quality`
- WHEN the page loads
- THEN the Quality tab is selected and its panel shows the report for `alpha` and 7 days

#### Scenario: unknown tab
- GIVEN the URL `/reports?project=alpha&tab=nope`
- WHEN the page loads
- THEN the Team tab is selected

#### Scenario: change tab
- GIVEN the Reports page for `alpha`, 90 days and the Delivery tab
- WHEN the user picks the AI usage tab
- THEN the URL becomes `/reports?project=alpha&days=90&tab=usage` without a reload and no new report is requested

#### Scenario: velocity tab
- GIVEN the Reports page for `alpha` on the Delivery tab, whose milestones list has `days_per_point: {value: 1.4, measured_epics: 6, assumed: false}`
- WHEN the user picks the Velocity tab
- THEN the URL has `tab=velocity`, `GET /api/milestones?project=alpha` is requested once, and the Velocity headline reads "1.4 d/pt"

#### Scenario: headlines
- GIVEN a report with 41 closed beads, 12,400,000 tokens, cost 38.2, rework rate 0.09, 3 beads not collected, 1 unreadable bead and 1 unpriced model
- WHEN the page is shown
- THEN the headlines read "41 beads closed", "12.4M tokens, $38.20", "9% rework" and "5 gaps", and the Data coverage headline has a warning icon

#### Scenario: no gaps
- GIVEN a report with no coverage gaps and no failed project
- WHEN the page is shown
- THEN the Data coverage headline reads "0 gaps" without a warning icon

#### Scenario: team headline
- GIVEN the team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4
- WHEN the page is shown on the Delivery tab
- THEN the Team headline reads "27 of 64 closed · on pace" without a warning icon

#### Scenario: keyboard
- GIVEN the Delivery tab is selected and has focus
- WHEN the user presses Right
- THEN the Velocity tab is selected and has focus

#### Scenario: Hidden tabs are hinted
- GIVEN the Reports page at a window 768px wide where Data coverage does not fit
- WHEN the page is shown
- THEN the right edge of the tab list fades, and scrolling it to the end removes the right fade and shows a left one

## REMOVED
