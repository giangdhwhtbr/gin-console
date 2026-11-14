# Spec Delta: Prep tasks

## ADDED

## MODIFIED

### REQ-SERVER-006: Beads summary per project
<!-- base: 929457c02891ac09ed4544256c651972deb95309e36f512215ab1e68e2a3ecc0 -->
WHEN a client requests `GET /api/projects`, the server SHALL include for each existing project a `beads` object with the counts `open`, `in_progress`, `blocked` and `ready`, and an `epics` list of the epics that are `in_progress` or that are `open` and ready, each with `id` and `title`, taken from the project's `bd export` snapshot (REQ-BEADS-012) with readiness worked out as in REQ-BEADS-007, where `blocked` counts the beads that are not closed and blocked, and `ready` never counts a bead of type `milestone`. The counts `open`, `in_progress`, `blocked` and `ready` SHALL leave out prep tasks (REQ-BEADS-002). The `beads` object SHALL add `prep`, the number of prep tasks that are not closed.

#### Scenario: Counts and active epics
- GIVEN a project with 3 open, 1 in_progress and 2 ready issues, one in_progress epic and one ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads` has those counts and `epics` lists both epics

#### Scenario: No active epics
- GIVEN a project with no in_progress epic and no ready open epic
- WHEN a client requests `GET /api/projects`
- THEN `beads.epics` is an empty list

#### Scenario: Milestone not counted as ready
- GIVEN a project with 2 ready issues and an open milestone without blockers
- WHEN a client requests `GET /api/projects`
- THEN `beads.ready` is 2

#### Scenario: Prep tasks counted apart
- GIVEN a project whose only beads are the in_progress epic `e-1`, its open ready tracks `t-1` and `t-2`, its open prep task `p-1` labelled `prep` and `prep:mockup` without blockers, and its closed prep task `p-2` labelled `prep`
- WHEN a client requests `GET /api/projects`
- THEN `beads.open` is 2, `beads.in_progress` is 1, `beads.ready` is 2, `beads.blocked` is 0 and `beads.prep` is 1

### REQ-BEADS-002: Bead detail
<!-- base: 66f338326c15f527f3b80467d7e845d3b8fac746e0efec806204753677ccbb9d -->
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`), `bugs` (each bead of type `bug` that has a `discovered-from` dependency on this bead, open or closed, with `id`, `title`, `status` and `type` `discovered-from`) and, for an epic, `children` (each with `id`, `title`, `status` and `prep`, closed children included), and SHALL respond 404 when the project or the bead does not exist. A bead SHALL be a prep task when its `labels` hold `prep` and no label starts with `track:` or `req:`. The children of an epic that are not prep tasks are its tracks. The `prep` field of a child SHALL be true for a prep task and false for a track.

#### Scenario: Dependencies and dependents
- GIVEN a bead blocked by one bead and blocking another
- WHEN a client requests its detail
- THEN `dependencies` lists the first with type `blocks` and `dependents` lists the second

#### Scenario: Epic children
- GIVEN an epic with 3 children, one of them closed
- WHEN a client requests its detail
- THEN `children` lists all 3 with their statuses

#### Scenario: Bugs found
- GIVEN a bead with an open bug, a closed bug and an epic that each have a `discovered-from` dependency on it
- WHEN a client requests its detail
- THEN `bugs` lists the two bugs with type `discovered-from` and not the epic, and neither appears in `dependents` or `children`

#### Scenario: Unknown bead
- GIVEN a configured project without a bead `x-1`
- WHEN a client requests `GET /api/beads/<project>/x-1`
- THEN the response is 404

#### Scenario: Prep child
- GIVEN epic `e-1` with tracks `t-1` and `t-2`, prep task `p-1` labelled `prep` and `prep:mockup`, and child `t-3` labelled `prep` and `track:api`
- WHEN a client requests the detail of `e-1`
- THEN `children` lists `t-1`, `t-2`, `t-3` and `p-1`, with `prep` true for `p-1` only

### REQ-REPORTS-003: AI usage section
<!-- base: 7168315d8cdf81fbe7d6a9413db9a3362083e7ecb63c8fbc09f7110c03a81e50 -->
The report SHALL hold the following, over the own shares of the selected closed beads:
- Totals: tokens, cost, closed beads, tokens per closed bead, the cache ratio `cache_read / (input + cache_read + cache_write)` summed over the models of every own share (absent when the denominator is 0), and the rework rate of REQ-REPORTS-005.
- One row per member, keyed by `assignee` (beads without one fall under `Unassigned`). Each row holds closed beads, tokens, cost, tokens per closed bead, tokens per stage, and the cache ratio.
- The 10 epics with the most tokens. An epic's tokens are its own share plus those of its selected descendants. Each epic row holds its project, `ai_usage.budget` when present, its closed and total tracks as `closed_children` and `children`, and its closed and total prep tasks (REQ-BEADS-002) as `closed_prep_children` and `prep_children`. Prep tasks still count toward the epic's tokens and cost.
- The 10 beads with the largest own share.
- Tokens and cost per stage.
- Tokens and cost per model and role.

#### Scenario: member rows
- GIVEN `ann` closed two beads of 100 and 300 tokens and an unassigned bead of 50 tokens closed
- WHEN the report is built
- THEN `ann` has 2 closed beads, 400 tokens and 200 tokens per bead, and `Unassigned` has 1 bead and 50 tokens

#### Scenario: open epic with closed children
- GIVEN open epic `a-1` without `ai_usage` and two closed children of 200 tokens each
- WHEN the report is built
- THEN `a-1` is in the epic list with 400 tokens and 2 of 2 children closed

#### Scenario: total cache ratio
- GIVEN two closed beads whose own shares hold model tokens of input 100, cache_read 300, cache_write 0, and input 100, cache_read 0, cache_write 0
- WHEN the report is built
- THEN `totals.cache_ratio` is 0.6

#### Scenario: epic with a prep task
- GIVEN open epic `e-1` without `ai_usage`, its closed track `t-1` of 200 tokens, its open track `t-2`, and its closed prep task `p-1` labelled `prep` and `prep:mockup` of 100 tokens
- WHEN the report is built
- THEN `e-1` is in the epic list with 300 tokens, `closed_children` 1, `children` 2, `closed_prep_children` 1 and `prep_children` 1

### REQ-REPORTS-009: Team scope and bead rows
<!-- base: 45d47ef9d520a1a5eadffd46192ef35750186281e8dbe1ead0c0537875f9225c -->
The scope of a milestone SHALL be every bead that is not a milestone, whose chain of parents (itself included) holds an epic whose parent is the milestone, that is not a prep task (REQ-BEADS-002), and that is either not an epic or an epic that has no track.

Each scope bead SHALL fall in one bucket:
- `closed` for status `closed`;
- `in_progress` for status `in_progress`;
- `open` for any other status.

Its member SHALL be its `assignee`, or `Unassigned` when it has none.

The response SHALL hold `beads`, one row per scope bead, with:
- `id`, `title`, `issue_type`, `status`, `bucket`, `assignee`, `priority` and `created_at`;
- `epic`: the `id` and `title` of the nearest epic among the bead and its chain of parents;
- `started_at` and `closed_at`;
- `cycle_days`, as the cycle time of REQ-REPORTS-004, or `null`;
- `age_days`: for an in-progress bead, the days since `started_at` (else `updated_at`); otherwise `null`;
- `late_days`: for a closed bead, the working days (Monday to Friday) after the milestone's `end` up to the date of `closed_at`, 0 when it closed on or before `end`; otherwise `null`;
- `rework`: the bead's own reopens plus bugs found later (REQ-REPORTS-002), or `null` when it has no readable `ai_usage`.

#### Scenario: nested beads
- GIVEN milestone `m2` with epic `e1`, whose child `e1.1` has child `e1.1.1`, and epic `e9` under milestone `m3` with child `e9.1`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` and `e1.1.1` with epic `e1`, and neither `e1` nor `e9.1`

#### Scenario: epic not yet split into tasks
- GIVEN milestone `m2` with epics `e2`, `e3` and `e4` without child beads, all assigned to `ann`, and epic `e5` whose only child, a closed task, is assigned to `ann`
- WHEN the team report for `m2` is built
- THEN `beads` holds `e2`, `e3`, `e4` and the task, each of `e2`, `e3` and `e4` with itself as its epic, `e5` is not in `beads`, and `ann`'s row has scope 4 and closed 1

#### Scenario: nested epic without children
- GIVEN milestone `m2` with epic `e1` whose only child is epic `e1.1` without child beads
- WHEN the team report for `m2` is built
- THEN `beads` holds `e1.1` with itself as its epic, and not `e1`

#### Scenario: buckets and members
- GIVEN scope beads with status `blocked` and no assignee, `deferred` assigned to `ann`, and `in_progress` assigned to `bao`
- WHEN the team report is built
- THEN their buckets are `open`, `open` and `in_progress`, and their members are `Unassigned`, `ann` and `bao`

#### Scenario: late close
- GIVEN milestone `m2` ending on Friday 2026-11-27 and a scope bead closed on Tuesday 2026-12-01
- WHEN the team report is built
- THEN its `late_days` is 2

#### Scenario: prep tasks left out
- GIVEN milestone `m2` with epic `e-1` whose tracks are `t-1` and `t-2`, and whose prep task is `p-1` labelled `prep` and `prep:mockup`, and epic `e-2` whose only child is prep task `p-2` labelled `prep`
- WHEN the team report for `m2` is built
- THEN `beads` holds `t-1`, `t-2` and `e-2`, with `e-2` as its own epic, and neither `e-1`, `p-1` nor `p-2`

### REQ-UI-004: Beads summary display
<!-- base: 1f2af6cdacf8cef8456b1cac87ed1f94fdf4c734e4f772b642e53924baf030ea -->
The Projects page SHALL show, for each project with `beads` data, the counts open, in progress, blocked and ready, the count `prep` as "prep <n>" when it is above 0, and the active epics as `id` and `title`, or a "no active epics" note when the list is empty.

#### Scenario: Counts and epics
- GIVEN a project with the counts 3, 1, 0, 2 and one active epic
- WHEN the Projects page loads
- THEN the card shows all four counts and the epic id and title

#### Scenario: Prep count
- GIVEN a project with the counts 3, 1, 0, 2 and `prep` 2, and a project with `prep` 0
- WHEN the Projects page loads
- THEN the first card shows the four counts and "prep 2", and the second card shows no prep count

### REQ-UI-028: Bead detail
<!-- base: 7b7ec867a9d74a6b03465b6ceae3d7a002d7bff90d3fcc3c7857a715b7d48c88 -->
The bead page SHALL show the bead's id, title, status, priority, type, labels, owner, assignee, creation and update times and comment count, its description rendered as GitHub-flavored Markdown (headings, emphasis, lists, task lists, inline code, code blocks, tables, block quotes and links), its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with a progress bar of closed tracks over all tracks when it has a track. WHEN an epic has prep tasks (REQ-BEADS-002), the bead page SHALL show "Prep x/y" next to the progress bar, where x is its closed prep tasks and y all its prep tasks, and SHALL mark each prep task in the children list with a "Prep" chip. Raw HTML in the description SHALL be shown as text and SHALL NOT create elements, a link SHALL open in a new tab with `rel="noreferrer"`, and a link whose URL is not `http`, `https` or `mailto` SHALL be shown as text.
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

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the page of `e-1` loads
- THEN the progress bar reads 1 of 2, "Prep 1/1" is shown next to it, and the children list shows `t-1`, `t-2` and `p-1`, with a "Prep" chip on `p-1` only

### REQ-UI-044: List rows
<!-- base: 3deb5b7332b2b049d65b760172216ad209adff073a06433e655b109490683247 -->
The List view SHALL show for each row an open/close control when it has children, its id in the monospace face, its title as a link to `/beads/<project>/<id>`, its state as REQ-UI-064 describes, its type as REQ-UI-067 describes, `P<n>`, the indicators of REQ-UI-066, its assignee or owner, up to three labels from 768px, and its last update, SHALL show for an epic with a track how many of its tracks are closed with a progress bar, SHALL show for an epic with prep tasks (REQ-BEADS-002) "Prep x/y", where x is its closed prep tasks and y all its prep tasks, SHALL show a "Prep" chip on the row of a prep task, SHALL open only the root level at first unless branches were remembered (REQ-UI-074), SHALL open and close a branch when its control is used, SHALL offer "Expand all" and "Collapse all", SHALL show at most 2000 rows and say how many more are not shown, and SHALL draw a row on two lines under 768px.

#### Scenario: Row content
- GIVEN a blocked P1 bug assigned to alice with 2 comments
- WHEN the List view is shown
- THEN its row shows the id, the title link, "Blocked", the pill "bug", `P1`, a comment indicator 2 and alice

#### Scenario: Open a branch
- GIVEN the List view with a collapsed epic
- WHEN the user opens it
- THEN its children are shown, and closing it hides them again

#### Scenario: Expand all and collapse all
- GIVEN a hierarchy with several levels
- WHEN the user chooses "Expand all", then "Collapse all"
- THEN every branch opens, then only the roots are shown

#### Scenario: Epic progress
- GIVEN an epic with 5 children of which 3 are closed
- WHEN the List view is shown with "Show closed" on
- THEN the epic says "3/5 closed" with a progress bar

#### Scenario: Epic with a prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the List view is shown with "Show closed" on and `e-1` open
- THEN `e-1` says "1/2 closed" with a progress bar and "Prep 0/1", and the row of `p-1` shows a "Prep" chip while the rows of `t-1` and `t-2` do not

#### Scenario: Plain text
- GIVEN a title containing `<script>x</script>`
- WHEN the List view is shown
- THEN it appears as text and no `script` element exists

#### Scenario: Two lines on a phone
- GIVEN a window 390px wide
- WHEN a row is shown
- THEN the title is on the first line and the state, type and indicators on the second

#### Scenario: Row limit
- GIVEN 2100 root beads
- WHEN the List view is shown
- THEN 2000 rows are shown and a line says "100 more not shown"

### REQ-UI-049: Node content
<!-- base: 65fc9235404fa10e40c24188ef056490c9c9ab628a43b17a548ee9f49b92eeb4 -->
The Dependencies page SHALL show on each node the content of a card: the bead id in the monospace face and `P<n>` on the first line, its title on one line with the full title as `title`, and its state as REQ-UI-064 describes, with the 4px left edge in the colour of the state, and on a node with children an icon that says it can be opened, with "n of m done" over its tracks (REQ-BEADS-002) when it has a track. The node of a prep task SHALL show a "Prep" chip.

#### Scenario: Node with children
- GIVEN epic `e-1` without a parent with 3 tasks, 1 of them closed
- WHEN the project page is shown
- THEN the node `e-1` reads "1 of 3 done" with the open icon

#### Scenario: State label
- GIVEN a ready task and a blocked task
- WHEN the epic is drawn
- THEN the first node reads "Ready" with its icon and the second "Blocked" with its icon

#### Scenario: Closed bead
- GIVEN a closed task
- WHEN the epic is drawn
- THEN it is drawn as "Done", whatever "Show closed" says on the Beads page

#### Scenario: Node with a prep task
- GIVEN epic `e-1` without a parent with tracks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN the project page is shown, and then the page of `e-1`
- THEN the node `e-1` reads "1 of 2 done" with the open icon, and on the page of `e-1` the node `p-1` shows a "Prep" chip while `t-1` and `t-2` do not

### REQ-UI-075: Dependencies page
<!-- base: b842c673650a039dc2c607e6b0adc2923e254c3ff08f3d625dba8c24bd99e99a -->
The frontend SHALL show the Dependencies page of a scope, the project at `/beads/<project>/graph` or a bead at `/beads/<project>/<id>/graph`; WHERE the scope is the project or a bead with at least one child (found through `parent`), the page SHALL draw as nodes the beads of the project without a parent, or the direct children of the bead, with the arrows REQ-UI-079 describes, and a heading bar with the project's name or the bead's id as a link to its bead page and its title, "n of m done" over the nodes that are not prep tasks (REQ-BEADS-002), and for a bead the beads that block it and the beads it blocks as links to their Dependencies pages; WHERE the scope is a bead without children, the page SHALL draw the bead itself, every bead that blocks it directly or not above it and every bead it blocks directly or not below it; and the page SHALL draw beads outside the scope as REQ-UI-050 describes, SHALL say "No dependencies" with a link to the bead when there is nothing to draw, "No beads in this project" for an empty project, "Bead not found" when the bead does not exist, and the error with a Retry button when the beads cannot be loaded, and SHALL refresh as REQ-UI-027 does.

#### Scenario: Epic
- GIVEN epic `e-1` with tasks `a` and `b`, `b` blocked by `a`
- WHEN `/beads/p/e-1/graph` is shown
- THEN the heading bar names `e-1` and "0 of 2 done", `a` and `b` are nodes and an arrow goes from `a` to `b`

#### Scenario: Project
- GIVEN epics `r-1` and `r-2` without a parent, `r-2` blocked by `r-1`, and tasks under each
- WHEN `/beads/p/graph` is shown
- THEN `r-1` and `r-2` are the nodes, their tasks are not, and an arrow goes from `r-1` to `r-2`

#### Scenario: Nested epics
- GIVEN epic `r` with the child epics `e-1` and `e-2`, each with tasks
- WHEN the page of `r` is shown
- THEN `e-1` and `e-2` are the nodes and their tasks are not

#### Scenario: Heading relations
- GIVEN epic `e-2` blocked by epic `e-1`
- WHEN the page of `e-2` is shown
- THEN the heading bar shows `e-1` as a blocker linking to `/beads/p/e-1/graph`

#### Scenario: Task
- GIVEN `a`→`b`→`c`, an unrelated `z`, and the page of `b`
- WHEN it is shown
- THEN `a`, `b` and `c` are drawn, `a` above `b` above `c`, and `z` is not

#### Scenario: Indirect
- GIVEN `a`→`b`→`c`→`d` and the page of `c`
- WHEN it is shown
- THEN `a` and `b` are drawn above `c` and `d` below it

#### Scenario: Nothing to draw
- GIVEN a task without blockers and blocking nothing
- WHEN its Dependencies page is shown
- THEN it says "No dependencies" and links to the bead

#### Scenario: Empty project
- GIVEN a project without beads
- WHEN `/beads/p/graph` is shown
- THEN it says "No beads in this project"

#### Scenario: Not found
- GIVEN a bead id that does not exist
- WHEN its Dependencies page is shown
- THEN it says "Bead not found"

#### Scenario: Load error
- GIVEN the request for the beads fails
- WHEN the page is shown
- THEN the error and a Retry button are shown, and the last graph stays when a later refresh fails

#### Scenario: Prep task in the scope
- GIVEN epic `e-1` with tasks `t-1` (closed) and `t-2` (open), and the open prep task `p-1` labelled `prep` and `prep:mockup`
- WHEN `/beads/p/e-1/graph` is shown
- THEN `t-1`, `t-2` and `p-1` are nodes and the heading bar reads "1 of 2 done"

### REQ-UI-089: AI usage view
<!-- base: af40eebeb7c308e3e02e83fb10fe2d6ce17050215174f9259ac0a453c9964edd -->
The AI usage tab SHALL show, in this order:
- A row of figures: tokens, estimated cost, tokens per closed bead, and cache reads (`totals.cache_ratio` as a percentage).
- A horizontal bar chart of tokens per member, stacked by stage, with each member's total at the end of the bar. Each bar SHALL show, on hover and on focus, the member's closed beads, tokens, cost, tokens per bead and cache ratio.
- A 100% bar of tokens per stage, with each stage's share written as text.
- A table of the top epics. Each row SHALL link to the epic's bead page and show its tokens, its closed and total tracks (`closed_children` and `children`), "Prep x/y" from `closed_prep_children` and `prep_children` when `prep_children` is above 0, and one of three budget states:
  - with a budget and a cost: a meter of `budget.cost` against `budget.budget_usd`, with the percentage, in the warning color above 100%;
  - with a budget but no cost: "no price";
  - without a budget: "No budget".
- A table of the top beads.
- A table of tokens and cost per model and role.

#### Scenario: member bar
- GIVEN a report with members `ann` and `Unassigned`
- WHEN the page is shown and the user focuses `ann`'s bar
- THEN the chart has one bar per member, stacked by stage, and `ann`'s beads, tokens, cost, tokens per bead and cache ratio are shown

#### Scenario: budget meter
- GIVEN top epics `a-1` with budget 10 and cost 11.7, and `a-2` without a budget
- WHEN the AI usage tab is shown
- THEN `a-1` shows a meter at 117% in the warning color and `a-2` shows "No budget"

#### Scenario: epic with prep tasks
- GIVEN top epics `e-1` with `closed_children` 1, `children` 2, `closed_prep_children` 1 and `prep_children` 1, and `e-2` with `prep_children` 0
- WHEN the AI usage tab is shown
- THEN the row of `e-1` shows "1/2" and "Prep 1/1", and the row of `e-2` shows no prep count

### REQ-MILESTONE-UI-015: Child beads on the Gantt
<!-- base: f33e39037b5977681613bf0af42dada3adce4b823b3aed0d0541daac88be3dba -->
The Gantt SHALL load the project's beads, open and closed, and for each epic with beads whose `parent` is that epic SHALL show an expand button in its row, with "N/M closed" (closed tracks over all tracks) when it has a track and "Prep x/y" (closed prep tasks over all prep tasks, REQ-BEADS-002) when it has a prep task; WHEN the user expands an epic, the Gantt SHALL show under it one row per child, prep tasks included, ordered by id, with the child's status icon, its id (linking to its bead page), its title, a "Prep" chip for a prep task, and "closed <date>" from `closed_at` for a closed child or its status otherwise, and SHALL shade the parent epic's period in those rows without drawing bars for them. Epics SHALL start collapsed, and expanding or collapsing one SHALL leave the others as they are. IF the beads cannot be loaded, THEN the Gantt SHALL be drawn without expand buttons or counts.

#### Scenario: expand
- GIVEN epic `gin-workflow-rm-cost-control` with four closed children, closed on 2026-11-01
- WHEN the user expands it
- THEN four rows `.1` to `.4` are shown under it, each with "closed 1 Nov", and the epic row shows "4/4 closed"

#### Scenario: no children
- GIVEN epic A with no bead whose `parent` is A
- WHEN the Gantt is shown
- THEN A has no expand button and no closed count

#### Scenario: open child
- GIVEN epic B with child `B.2` in status `in_progress`
- WHEN the user expands B
- THEN the row of `B.2` reads "In progress" and has no closing date

#### Scenario: beads unavailable
- GIVEN the request for the project's beads fails
- WHEN the user opens the Gantt tab
- THEN the epics, bars and arrows are drawn and no epic has an expand button

#### Scenario: prep task
- GIVEN epic `e-1` with tracks `t-1` (closed) and `t-2` (open), and the closed prep task `p-1` labelled `prep` and `prep:mockup`, and epic `e-2` whose only child is the open prep task `p-2` labelled `prep`
- WHEN the user expands `e-1` and `e-2`
- THEN `e-1` shows "1/2 closed" and "Prep 1/1" with rows `p-1`, `t-1` and `t-2`, `e-2` shows "Prep 0/1" and no closed count with the row `p-2`, and only `p-1` and `p-2` have a "Prep" chip

## REMOVED
