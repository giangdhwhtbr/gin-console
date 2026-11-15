# Spec Delta: UI polish

## ADDED

### REQ-UI-107: Long text
The frontend SHALL break a word that does not fit its box at any character in bead titles, ids on a page, assignees, owners and comments; SHALL show an id longer than 24 characters, wherever it is cut to fit a row, a card, a node or a Gantt label, as its first 14 characters, "…" and its last 9 characters, with the full id as `title`; SHALL give every text it cuts short with an ellipsis the full text as `title`; and SHALL keep every page from scrolling sideways at 360px and wider, a table or code block scrolling inside its own box.

#### Scenario: Long id
- GIVEN the bead `ex-payments-provider-migration-and-reconciliation-2026.2.1`
- WHEN its row, card or node is shown
- THEN its id reads `ex-payments-pr…-2026.2.1` with the full id as `title`

#### Scenario: Short id
- GIVEN the bead `ex-e4.1`
- WHEN its row is shown
- THEN its id reads `ex-e4.1` in full

#### Scenario: Unbroken title on a card
- GIVEN a bead titled "Handle PaymentReconciliationServiceTimeoutExceptionHandlerFactoryProviderBean in the worker"
- WHEN its Board card is shown at 1440px
- THEN the title wraps inside the card and the page does not scroll sideways

#### Scenario: Unbroken title on a phone
- GIVEN the same bead
- WHEN its bead page is shown at 390px
- THEN the heading wraps inside the window and the page does not scroll sideways

#### Scenario: Wide table on a phone
- GIVEN a bead whose description holds a table with five wide columns and a long code line
- WHEN its bead page is shown at 390px
- THEN the table and the code block scroll inside their own boxes and the page does not scroll sideways

#### Scenario: Cut text has a tooltip
- GIVEN a milestone titled with 120 characters
- WHEN the Milestones list cuts it short
- THEN the full title is its `title`

## MODIFIED

### REQ-UI-044: List rows
<!-- base: eb99ab67e2c326ab97366c142b78d389295adb22bbfee5454681cd861c561e3c -->
The List view SHALL show for each row an open/close control when it has children, its id in the monospace face shortened as REQ-UI-107 describes, its title as a link to `/beads/<project>/<id>` cut short with the full title as `title` and never narrower than 8rem while the row is at least 360px wide, its state as REQ-UI-064 describes, its type as REQ-UI-067 describes, `P<n>`, the indicators of REQ-UI-066, its assignee or owner, up to three labels from 768px, and its last update, SHALL show for an epic with a track how many of its tracks are closed with a progress bar, SHALL show for an epic with prep tasks (REQ-BEADS-002) "Prep x/y", where x is its closed prep tasks and y all its prep tasks, SHALL show a "Prep" chip on the row of a prep task, SHALL open only the root level at first unless branches were remembered (REQ-UI-074), SHALL open and close a branch when its control is used, SHALL offer "Expand all" and "Collapse all", SHALL show at most 2000 rows and say how many more are not shown, and SHALL draw a row on two lines under 768px.

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

#### Scenario: Long id keeps the title
- GIVEN the epic `ex-payments-provider-migration-and-reconciliation-2026` with an open task and the title "Migrate every checkout payment to the new provider"
- WHEN the List view is shown at 1440px and at 390px with the epic open
- THEN each of the two rows shows its open/close control when it has children, its shortened id and at least the start of its title

### REQ-UI-048: Dependency layers
<!-- base: c1583dee3e283872423d6c94cceaa4763bb248819f74914daac482aa934b74da -->
The Dependencies page SHALL place each node one layer below its furthest blocker, so that nodes without blockers are in the first layer at the top, SHALL order the nodes of a layer by the average position of their blockers in the layers above to limit crossing arrows, SHALL draw an arrow from each blocker down to the node it blocks, and SHALL place the nodes without any arrow apart, below the layers, in rows of at most 3 nodes under the heading "n without dependencies".

#### Scenario: Chain
- GIVEN tasks `a`, `b`, `c` where `b` is blocked by `a` and `c` by `b`
- WHEN the epic is drawn
- THEN `a`, `b`, `c` are in layers 0, 1, 2 from the top, with arrows `a`→`b` and `b`→`c`

#### Scenario: Diamond
- GIVEN `d` blocked by `b` and `c`, both blocked by `a`
- WHEN the epic is drawn
- THEN `a` is in layer 0, `b` and `c` in layer 1 and `d` in layer 2

#### Scenario: Order inside a layer
- GIVEN `a` and `b` in layer 0, `x` blocked by `b` and `y` blocked by `a`, and `a` placed before `b`
- WHEN the epic is drawn
- THEN `y` is placed before `x` in layer 1, so that the arrows do not cross

#### Scenario: No relations
- GIVEN an epic with 7 tasks that block none of each other
- WHEN the epic is drawn
- THEN the 7 nodes are placed in rows of 3, 3 and 1 under "7 without dependencies", and the note "No blocking relations between these tasks" is shown

#### Scenario: Linked and unlinked
- GIVEN `b` blocked by `a`, and `c`, `d`, `e`, `f` without blockers that block nothing
- WHEN the epic is drawn
- THEN `a` and `b` are in layers 0 and 1, and `c`, `d`, `e` then `f` are placed below them in rows of 3 under "4 without dependencies"

### REQ-UI-049: Node content
<!-- base: 4f311f6460b33940db7b3df0b4fc842b62b248dfba9c234f653adbc63f16b624 -->
The Dependencies page SHALL show on each node the content of a card: the bead id in the monospace face shortened as REQ-UI-107 describes and `P<n>` on the first line, its title on one line with the full title as `title`, and its state as REQ-UI-064 describes on one line, the state label cut short before "n of m done" is, with the 4px left edge in the colour of the state, and on a node with children an icon that says it can be opened, with "n of m done" over its tracks (REQ-BEADS-002) when it has a track. The node of a prep task SHALL show a "Prep" chip.

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

#### Scenario: Long state line
- GIVEN an in-progress epic with 2 of 5 tracks done and a title of 80 characters
- WHEN its node is drawn
- THEN its id, title and state each take one line inside the node, and "2 of 5 done" is shown in full

### REQ-UI-065: Card anatomy
<!-- base: dcc613109ec708dfd36214bb46f238f46a6594edf4e997247df7619d44c27935 -->
A bead card of the Board and Focus views SHALL show on its first line the id in the monospace face shortened as REQ-UI-107 describes and `P<n>`, below it the title as a link to `/beads/<project>/<id>`, and on its last line the state mark of REQ-UI-064, the type badge of REQ-UI-067, the indicators of REQ-UI-066 and the assignee when there is one, the title and the assignee wrapping inside the card (REQ-UI-107).

#### Scenario: Full card
- GIVEN a ready P1 task assigned to alice with 2 comments and 1 dependency
- WHEN its card is shown
- THEN it shows the id and `P1`, the title link, "Ready", the type "task", a comment indicator 2, a dependency indicator 1 and alice

#### Scenario: Bare card
- GIVEN a bead with no assignee, no comments and no dependencies
- WHEN its card is shown
- THEN the last line shows only the state and the type

### REQ-MILESTONE-UI-001: Milestones list
<!-- base: 01cfde214decf25d2729e1494a0fb143cca0396da4fefb5e4c22d0630d0d6930 -->
gin-console SHALL show a Milestones entry in the sidebar that opens a per-project list of milestones with title, status, start and end (and kickoff when set), lanes, forecast finish, epic progress, and warning count, from `gin milestone list --all --json`. Lanes SHALL read "<n> lanes" ("1 lane" when `<n>` is 1), or "–" when the entry has no `lanes`. The forecast finish SHALL read "Finishes <date>" when the entry's `finish` is set, in the warning color when it is after the entry's `end`. gin-console SHALL show a list entry's `error` in place of its progress and warnings, SHALL show "No dates" in place of the period of an entry whose `start` or `end` is `null`, SHALL cut a long title short with the full title as `title`, and SHALL NOT show the `unassigned_epics` count, which REQ-MILESTONE-UI-010 replaces with a list.
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

#### Scenario: milestone without dates
- GIVEN project P whose `milestone list` reports M1 (active) and M4 with `start: null`, `end: null` and `error` "M4 has no start/end metadata"
- WHEN the user opens Milestones for P
- THEN M1 is shown normally, and M4 shows "No dates" and that error

### REQ-MILESTONE-UI-008: Milestones API
<!-- base: a716114930d88a8945a8ec166faa4f3aaed23181126d9b531bfbf1065e8b7928 -->
WHEN a client requests `GET /api/milestones?project=<name>` or `GET /api/milestones/{project}/{id}` with an optional `start=YYYY-MM-DD`, the server SHALL return the output of `gin milestone list --all --json` or `gin milestone show <id> [--start <date>] --json` run in the project directory, including the list's `forecast` and the `lanes` of each list entry and of the shown milestone, with `null` for each of them that the output lacks, and SHALL accept a list entry whose `start` and `end` are `null` and return them as `null`. It SHALL cache a response without `start` for 5 seconds and never cache one with `start`, SHALL respond 404 for an unknown project or missing directory, 422 without running any command for a `start` that is not an ISO date, and IF the command fails or its output is not `schema: 1`, THEN SHALL respond 502 with `error` and `cause` set to `outdated` (no `milestone` command), `tracking` (project not on Beads tracking), `schema` (schema not 1), or `null`.

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

### REQ-MILESTONE-UI-013: Readable Gantt rows
<!-- base: 707f050aa8e61f26f6a84ac0ec53a3860cbdb895695313f1f8ecb3a97c1a4e1f -->
Each epic row of the Gantt SHALL show, in a label column that stays visible while the chart scrolls, the status icon and title on one line and the epic id (linking to its bead page), period and estimate on the next, each line cut short with an ellipsis instead of wrapping and the full title available on hover, except that under 1024px the items of the second line (id, period and estimate, closed tracks, prep, spec) wrap onto further lines rather than being cut, followed by the epic's warnings; WHEN at least 90 px of chart are left after an epic's bar, the row SHALL also show the epic's title after the bar.

#### Scenario: long id
- GIVEN epic `gin-workflow-rm-process-hygiene` titled "Process hygiene: consistent skills, rules that bind where it matters"
- WHEN the Gantt is shown on a phone
- THEN the title takes one line cut short with an ellipsis, and the id, period and closed tracks wrap onto the following lines, none of them cut to less than its first word

#### Scenario: title after the bar
- GIVEN epic A whose bar ends on the first day of a 10-day plan shown as `Whole milestone`
- WHEN the Gantt is shown
- THEN A's title is shown after its bar

### REQ-REPORTS-012: Team tab
<!-- base: a1aed608495fd9c669dc5406f102bb2a11b86a84fad2a31f97a8d29e1f9f1c94 -->
WHILE a single project is selected, the Team tab of the Reports page SHALL request REQ-REPORTS-008 with the URL's `milestone`, and SHALL show:
- A Milestone select with the groups Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), set to the answer's `milestone`.
- A Member select with "All members (<n>)" and each row of `members` as "<member> · <scope>".
- A "Clear member" control while a member is selected.
- A link "Open Gantt" to the milestone page.
- The milestone line:
  - the title;
  - a status chip: Active, Scheduled, Planned, "Closed · on time", or "Closed · <n> d late", where `<n>` is the working days from `end` to `closed_on`;
  - "<start> – <end>";
  - "working day <elapsed> of <working_days> · <days_left> left" while the period holds `today`, "starts in <n> working days" before `start`, or "finished <closed_on>" once closed.
- WHEN `undated` is above 0, the note "<undated> milestones without start and end dates are not listed".

Its selects SHALL be no wider than the panel, a long option cut short. It SHALL keep the milestone, member and bead status in the URL query (`milestone`, `member`, `status`). It SHALL put the answer's `milestone` in the URL when it differs. It SHALL select All members when `member` is not one of `members`. A change of milestone SHALL clear the member and status. The tab SHALL NOT show the period or sprint choice, and SHALL keep `days` and `sprint` in the URL for the other tabs.
Source: `assets/2026-11-12/mockup/index.html`, `assets/2026-11-12/team-active.png`

#### Scenario: shared link
- GIVEN the URL `/reports?project=alpha&tab=team&milestone=m1&member=ann&status=closed`
- WHEN the page loads
- THEN milestone `m1`, member `ann` and the Closed list are shown

#### Scenario: default milestone in the URL
- GIVEN the URL `/reports?project=alpha&tab=team`
- WHEN the answer's `milestone` is `m2`
- THEN the URL becomes `/reports?project=alpha&days=30&tab=team&milestone=m2` without a reload

#### Scenario: change milestone
- GIVEN the Team tab for `m2` with member `ann` and the Closed list
- WHEN the user picks `m1`
- THEN the team report for `m1` is requested, All members is selected and the default list of REQ-REPORTS-016 is shown

#### Scenario: no period choice
- GIVEN the Team tab is selected
- WHEN the panel is shown
- THEN no period buttons and no sprint field are shown

#### Scenario: long options on a phone
- GIVEN a milestone titled with 120 characters and a member `nguyen.thi.thanh.huong.payments-team@example-company.com.vn`
- WHEN the Team tab is shown at 390px
- THEN both selects fit inside the window and the page does not scroll sideways

## REMOVED
