# Spec Delta: My work

## ADDED

### REQ-BEADS-025: Next command of a bead
Type: business-rule
WHEN given a bead, the signed-in email, and, for an epic, the workflow stage reported by `gin state --workflow-id <epic>` (REQ-UI-120), the console SHALL name one next command or none, by the first rule that matches:
- none when the bead is closed or deferred, is blocked (REQ-BEADS-021), is a milestone, or is a merge gate (REQ-BEADS-019);
- for an epic, `/gin:<stage> <id>` when the stage is `discuss`, `plan`, `orchestrate` or `ship`, `/gin:execute <id>` when the stage is `execute`, else none (an unknown, missing or failed stage);
- `gin task update <id> --claim` when the bead is ready and has no assignee or is assigned to the same person (REQ-BEADS-023) as the email;
- `/gin:execute <id>` when the bead is in progress or hooked and assigned to the same person as the email;
- none otherwise, including a bead in progress for another person.

#### Scenario: Ready and unclaimed
- GIVEN a ready task `t-1` without an assignee and the email `ann@x.com`
- WHEN its next command is named
- THEN it is `gin task update t-1 --claim`

#### Scenario: Ready and mine
- GIVEN a ready task `t-2` assigned to `ann` and the email `ann@x.com`
- WHEN its next command is named
- THEN it is `gin task update t-2 --claim`

#### Scenario: In progress and mine
- GIVEN an in-progress task `t-3` assigned to `ANN@other.com` and the email `ann@x.com`
- WHEN its next command is named
- THEN it is `/gin:execute t-3`

#### Scenario: In progress for another person
- GIVEN an in-progress task `t-4` assigned to `bob` and the email `ann@x.com`
- WHEN its next command is named
- THEN there is none

#### Scenario: Ready but assigned to another person
- GIVEN a ready task `t-5` assigned to `bob` and the email `ann@x.com`
- WHEN its next command is named
- THEN there is none

#### Scenario: Blocked
- GIVEN a task `t-6` whose status is `in_progress`, assigned to `ann`, with an open blocker
- WHEN its next command is named
- THEN there is none

#### Scenario: Epic by stage
- GIVEN an open epic `e-1` whose workflow stage is `plan`
- WHEN its next command is named
- THEN it is `/gin:plan e-1`, and with the stage `execute` it is `/gin:execute e-1`, and with the stage `progress` or an unknown stage there is none

#### Scenario: Merge gate and milestone
- GIVEN a merge gate `g-1` and a milestone `m-1`
- WHEN their next commands are named
- THEN there is none for either

### REQ-UI-150: My work groups
Type: business-rule
WHEN the My work page (REQ-UI-099) shows the beads of the current project, the frontend SHALL put each bead in at most one group, in this order, taking the first group whose rule matches and leaving out epics, milestones, merge gates (REQ-BEADS-019) and beads whose state (REQ-UI-049) is Deferred; a group's beads SHALL be ordered as in REQ-UI-100:
- `Next up: Assigned to me`: state Ready and assigned to the same person (REQ-BEADS-023) as the signed-in email;
- `Next up: Unclaimed`: state Ready, no assignee, and not a prep task (a bead labelled `prep` without a `track:` or `req:` label);
- `In progress`: state In progress and assigned to me;
- `Blocked`: state Blocked and assigned to me;
- `Waiting on me`: not closed, not assigned to me, and blocked (REQ-BEADS-021) by at least one bead assigned to me that is not closed, naming that bead.
A bead assigned to me that is blocked and also blocks another person's bead SHALL be in `Blocked` and its blocked bead in `Waiting on me`. WHEN at least one group holds a bead, a group without beads SHALL show its heading and the text "Nothing here"; WHEN no group holds one, the page SHALL show the message of REQ-UI-100 instead of the groups.

#### Scenario: Each group
- GIVEN the signed-in email `ann@x.com` and project beads: ready `t-1` assigned to `ann`, ready `t-2` without an assignee, in-progress `t-3` assigned to `ann`, `t-4` assigned to `ann` and blocked by open `t-5` of `bob`, and open `t-6` assigned to `bob` and blocked by `t-3`
- WHEN My work opens
- THEN `t-1` is in Assigned to me, `t-2` in Unclaimed, `t-3` in In progress, `t-4` in Blocked, `t-6` in Waiting on me naming `t-3`, and `t-5` is in no group

#### Scenario: Prep task
- GIVEN an unassigned ready bead labelled `prep` and another labelled `prep` and `track:2` without an assignee
- WHEN My work opens
- THEN the first is in no group and the second is in Unclaimed

#### Scenario: Epic left out
- GIVEN a ready epic without an assignee
- WHEN My work opens
- THEN it is in no group

#### Scenario: Empty group
- GIVEN one ready bead assigned to me and no other bead of mine
- WHEN My work opens
- THEN `Assigned to me` lists it and `In progress` shows "Nothing here"

#### Scenario: Deferred only
- GIVEN the only bead assigned to me is deferred
- WHEN My work opens
- THEN no group lists it and the page shows the message of REQ-UI-100

### REQ-UI-151: Next command in the bead header
WHILE a bead shown as a page or in a details panel has a next command (REQ-BEADS-025), its header SHALL show the label "Next" and the command with a Copy button, above the "View in graph" button (REQ-UI-053), and SHALL show nothing in its place when there is none. Copy SHALL write the exact command to the clipboard and read "Copied" for 2 seconds. An epic's command SHALL be shown only on its page, once its workflow has loaded, and never in a details panel.

#### Scenario: Ready task
- GIVEN the bead page of a ready task `t-1` without an assignee
- WHEN the page loads
- THEN the header shows "Next" with `gin task update t-1 --claim` and a Copy button above "View in graph"

#### Scenario: Copy
- GIVEN that header
- WHEN the user clicks Copy
- THEN the clipboard holds `gin task update t-1 --claim` and the button reads "Copied" for 2 seconds

#### Scenario: Epic stage
- GIVEN the page of epic `e-1` whose workflow stage is `plan`
- WHEN its workflow loads
- THEN the header shows `/gin:plan e-1`, and nothing while it loads or when the workflow request fails

#### Scenario: No command
- GIVEN the bead page of a closed task, and the details panel of an epic
- WHEN they are shown
- THEN neither header shows "Next"

### REQ-UI-152: Blocked by on the bead header
WHILE a bead is blocked (REQ-BEADS-021) and has open blockers, its page and details panel SHALL show a line "Blocked by" in the header naming each open blocker, ordered by id, its title as a link to its page, and SHALL show no next command (REQ-BEADS-025). IF a bead is blocked without any open blocker listed, THEN the header SHALL show only its Blocked state.

#### Scenario: Two blockers
- GIVEN task `t-1` whose dependencies hold open `t-2` titled "Set up CI" and open `t-3` titled "Design tokens", and a closed blocker `t-4`
- WHEN its page loads
- THEN the header reads "Blocked by Set up CI, Design tokens", each a link to its bead page, and `t-4` is not named

#### Scenario: Blocked status only
- GIVEN a bead with status `blocked` and no dependency
- WHEN its page loads
- THEN the header shows its Blocked state and no "Blocked by" line

### REQ-UI-153: My work cards on phones
WHILE the window is under 768px wide, the My work page SHALL show the beads of each group (REQ-UI-150) as cards instead of a table, each card showing the id and `P<n>`, the title as a link to `/beads/<project>/<id>`, the state mark of REQ-UI-064, and, for a bead in `Blocked` or `Waiting on me`, the blocker text of REQ-UI-100, and SHALL leave out the type and updated columns; at 768px and wider it SHALL show a table as in REQ-UI-100.

#### Scenario: Phone
- GIVEN a window 390px wide and a ready bead `t-1` titled "Set up CI" assigned to me
- WHEN My work opens
- THEN a card shows `t-1`, `P<n>`, the link "Set up CI" and "Ready", the page has no table and no horizontal scroll

#### Scenario: Wide window
- GIVEN a window 1024px wide and the same bead
- WHEN My work opens
- THEN a table row shows it and there is no card

### REQ-UI-154: Jump palette
WHEN the user presses Ctrl+K or Cmd+K on any page after login, the frontend SHALL prevent the browser's own action and open a dialog labelled "Jump to a bead" whose search field has the focus, also while another field has the focus, and SHALL close it on Escape. The dialog SHALL list up to 20 beads of all configured projects whose directory exists (closed beads included, merge gates left out) whose id contains the typed text or whose title contains it, ignoring case, with an exact id first, then open beads before closed ones, then by id, each showing the id, the title, the state mark of REQ-UI-064 and the project; WHEN the text is empty it SHALL list none and say "Type an id or a title", and WHEN no bead matches it SHALL say "No beads match". ArrowDown and ArrowUp SHALL move the selection, Enter SHALL open the selected bead's page, and a click SHALL open the clicked bead's page. The first opening SHALL load the beads of every configured project whose directory exists, closed ones included, SHALL say "Loading beads…" until they answer, and SHALL keep them until "Refresh data" (REQ-UI-096); IF a project's beads request fails, THEN the dialog SHALL say "Could not load <project>" and still list the beads of the others.

#### Scenario: Find by title and open
- GIVEN projects `a` and `b` with a bead `b-7` titled "Fix login redirect" in `b`
- WHEN the user presses Ctrl+K, types `login` and presses Enter with `b-7` selected
- THEN the page of `b-7` at `/beads/b/b-7` opens and the dialog closes

#### Scenario: Exact id first
- GIVEN beads `a-1` titled "Build" and `a-10` titled "a-1 follow-up", both open
- WHEN the user types `a-1`
- THEN `a-1` is the first result

#### Scenario: Open before closed
- GIVEN closed bead `a-2` and open bead `a-3`, both with "cache" in their title
- WHEN the user types `cache`
- THEN `a-3` is listed before `a-2`

#### Scenario: One project fails
- GIVEN projects `a` and `b`, where the beads request of `b` fails
- WHEN the user opens the palette and types an id of `a`
- THEN the bead of `a` is listed and the dialog says "Could not load b"

#### Scenario: Cached until Refresh
- GIVEN the palette was opened once
- WHEN the user opens it again and then presses "Refresh data" and opens it once more
- THEN the second opening sends no beads requests and the third one sends them again

#### Scenario: Escape and empty text
- GIVEN the palette is open with no text typed
- WHEN it is shown and then the user presses Escape
- THEN it lists no beads, says "Type an id or a title", and closes

## MODIFIED

### REQ-UI-055: Main navigation
<!-- base: 38d488fb8fcaca785f43544cdc88eaa2890127c281521db0455df075d4ddf939 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Beads, My work, Milestones and Reports, in that order, going to `/beads`, `/my-tasks`, `/milestones` and `/reports` with `?project=<current project>` (REQ-UI-124), and no link to `/`.

#### Scenario: Four links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Beads, My work, Milestones and Reports, one each, going to `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a` and `/reports?project=a`, and no link goes to `/`

### REQ-UI-057: Current destination
<!-- base: e16f2d59d77de8001399d690738683889530b927533802ea11d8bc625e315b5f -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight: Beads on `/beads`, My work on `/my-tasks`, Milestones on `/milestones` and `/milestones/<project>/<id>`, Reports on `/reports`. On a bead page it SHALL mark the link of the page the user opened the bead from in this browser tab (REQ-UI-073: My work, Milestones or Reports), and Beads when the bead was opened from the Beads page, another bead page, or by its address. It SHALL mark no link on the page of REQ-UI-125 and SHALL mark no other link.

#### Scenario: Bead page by address
- GIVEN the URL `/beads/alpha/a-1` opened in a new tab
- WHEN the page loads
- THEN only the Beads link has `aria-current="page"`

#### Scenario: Bead page from My work
- GIVEN the user opened `a-1` from the My work page
- WHEN the bead page is shown
- THEN only the My work link has `aria-current="page"`

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
- GIVEN the My work page is shown
- WHEN the user clicks "Reports"
- THEN only the Reports link has `aria-current="page"`

### REQ-UI-063: Page title
<!-- base: df8c5fba77a0d9d56ed042f702ab06de954f884f85462c4fdabeb57e1f757a61 -->
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Beads · <project> · gin-console`, `My work · <project> · gin-console`, `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console` with `<section>` one of Status, Team, Delivery, Velocity and Rework, `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

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

### REQ-UI-072: Breadcrumb
<!-- base: 1fd8a2f3d5dfc237dddcfd7815a48cb2df2d32dd884f3540ab4495e6409d14f9 -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a filter is active (REQ-UI-143), ", N filters" where N counts the active filters, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "My work" or "Reports"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

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

#### Scenario: From My work
- GIVEN the My work page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My work" then the title of `a-1`, and "My work" goes to `/my-tasks?project=a`

#### Scenario: Show closed and the milestone
- GIVEN the Beads page was last at `?project=a&view=list&closed=1&milestone=all&kind=technical`, and `a` has a current milestone
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads › List, 2 filters" then the title of `a-1`

### REQ-UI-099: My work navigation
<!-- base: 00ea3e463b6e585119acb52c67dec583a080af2d1ed8779d77d40f1da95c1961 -->
The "Main" navigation SHALL contain a "My work" link after "Beads", and the frontend SHALL show the My work page (the page at `/my-tasks`, called "My Tasks" in requirements that do not restate its name) without a full reload, marking the link as current there, and SHALL replace the address `/` with `/my-tasks?project=<current project>` (REQ-UI-124), or with `/my-tasks` while no project is configured, without adding a history entry.

#### Scenario: Open My work
- GIVEN the Beads page of project `a` is shown
- WHEN the user clicks "My work"
- THEN the URL is `/my-tasks?project=a`, the My work page is shown without a reload and "My work" is the current link

#### Scenario: Home address
- GIVEN the current project is `a`
- WHEN the user opens `/`
- THEN the URL becomes `/my-tasks?project=a`, the My work page of `a` is shown, and the browser Back button does not return to `/`

#### Scenario: Home address without projects
- GIVEN no project is configured
- WHEN the user opens `/`
- THEN the URL becomes `/my-tasks` and the page says no projects are configured

### REQ-UI-100: My work list
<!-- base: 14d1209a425d027dab01d7f18164d8f076e66d7e8fe69286f6bac3d919869471 -->
WHEN the My work page opens, the frontend SHALL request `GET /api/projects/beads`, then `GET /api/beads?project=<name>` for the current project (REQ-UI-124) only, leaving out beads matched only by `owner`, and SHALL show the beads of that project in the groups of REQ-UI-150, each group with a heading and the number of beads it holds. Each row SHALL show the id, the title, the state, the type, `P<n>` and the updated time, and SHALL link to `/beads/<project>/<id>`; a row of `Blocked` SHALL show "Blocked by <title>" naming its first open blocker by id (its id when the bead is not loaded), followed by "+<n>" for n further open blockers, and a row of `Waiting on me` SHALL show "Waits on <title>" naming my bead that blocks it, the first by id. Rows of a group SHALL be ordered by priority ascending, then by `updated_at` newest first, then by id. The page SHALL show how many beads it lists, and WHEN no group, Closed included, holds a bead, SHALL say "No work for <email>" and offer a link "Open the Beads page" to `/beads?project=<current project>`, and WHEN no project exists, SHALL say that no projects are configured. The Refresh control (REQ-UI-096) SHALL load the list again.

#### Scenario: Match by email or name
- GIVEN the signed-in email `giangdhwhtbr@gmail.com`, project A with ready beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned ready bead owned by `giangdhwhtbr@gmail.com`
- WHEN My work opens
- THEN `Assigned to me` holds the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com`, `Unclaimed` holds the unassigned one, and the bead assigned to `alice` is in no group

#### Scenario: Same handle at another domain
- GIVEN the signed-in email `giangdhwhtbr@gmail.com` and a ready bead assigned to `giangdhwhtbr@other.example`
- WHEN My work opens
- THEN that bead is in `Assigned to me`

#### Scenario: Order
- GIVEN the current project is A, which has a P2 ready bead assigned to me updated today and a P1 ready bead assigned to me updated last week
- WHEN My work opens
- THEN the P1 bead is first in `Assigned to me`, no row has a project column, and clicking the P2 bead opens `/beads/A/<id>`

#### Scenario: Other projects left out
- GIVEN projects A and B, the current project is A, and a ready bead assigned to me in each
- WHEN My work opens
- THEN only the bead of A is listed and no beads request goes to B

#### Scenario: Blocker named
- GIVEN a bead of mine blocked by open `t-9` titled "Set up CI" and open `t-10`
- WHEN My work opens
- THEN its row in `Blocked` shows "Blocked by Set up CI" and "+1", and a bead of `bob` blocked by a bead of mine titled "Design tokens" shows "Waits on Design tokens" in `Waiting on me`

#### Scenario: Nothing assigned
- GIVEN the current project is `a` and none of its beads is in any group for `giangdhwhtbr@gmail.com`
- WHEN My work opens
- THEN the page says "No work for giangdhwhtbr@gmail.com" and a link "Open the Beads page" goes to `/beads?project=a`

#### Scenario: Missing project directory
- GIVEN project C is configured but its directory does not exist
- WHEN My work opens
- THEN no beads request is sent for C

#### Scenario: No projects
- GIVEN `GET /api/projects/beads` returns an empty list
- WHEN My work opens
- THEN the page says no projects are configured

#### Scenario: Not the full projects list
- GIVEN two projects
- WHEN My work opens
- THEN no request goes to `/api/projects`

### REQ-UI-101: My work closed beads
<!-- base: 3ebbeeeb1fb6fbb1df422b7ed5939d76df465e0d411905eafe9082c08c4422bc -->
The My work page SHALL leave closed beads out by default, and SHALL offer a "Show closed" control kept in the URL as `closed=1` that requests the beads with `closed=1` and shows the closed beads assigned to the signed-in person, newest first, in a group "Closed" after the others.

#### Scenario: Closed hidden
- GIVEN 3 open and 2 closed beads assigned to me, the open ones ready
- WHEN My work opens at `/my-tasks`
- THEN the Assigned to me group holds 3, there is no Closed group and every beads request lacks `closed=1`

#### Scenario: Show closed
- GIVEN the same beads in project A
- WHEN the user turns on "Show closed"
- THEN the URL is `/my-tasks?project=A&closed=1`, the beads are requested with `closed=1` and the Closed group holds 2

### REQ-UI-065: Card anatomy
<!-- base: ca7034829bb89d3191ee7938a9a0983bdb9993f5c00ff18a99987ef4e8d39277 -->
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face shortened as REQ-UI-107 describes and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type of REQ-UI-067 for a bug, the size of REQ-UI-110 when the bead has `points` or `estimate_minutes`, the indicators of REQ-UI-066 and the assignee as REQ-UI-135 describes, each as text (REQ-UI-140), the title and the assignee wrapping inside the card (REQ-UI-107), and, WHEN the bead is blocked (REQ-BEADS-021), SHALL show on a line of its own "Blocked by <title>" naming its first open blocker by id, taken from the loaded beads or the id itself when that bead is not loaded, followed by "+<n>" for n further open blockers.

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with an owner, no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and "Unassigned" in the muted color

#### Scenario: Card with points
- GIVEN an in-progress epic with `points: 8`
- WHEN its Board card is shown
- THEN its last line shows the state, the size "8 pt" as text and the assignee or "Unassigned"

#### Scenario: Blocked card
- GIVEN a blocked task with open blockers `t-1` titled "Set up CI" and `t-2`, both loaded
- WHEN its Board card is shown
- THEN it shows "Blocked by Set up CI" and "+1"

## REMOVED
