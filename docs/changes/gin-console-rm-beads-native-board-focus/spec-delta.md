# Spec Delta: Board and Focus

## ADDED

### REQ-BEADS-007: Readiness and closing time
WHEN a client requests the bead list, the server SHALL add to each bead `ready` (true when `bd ready` lists it), `blocked` (true when `bd blocked` lists it or its status is `blocked`) and `closed_at` (the time it was closed, absent for a bead that is not closed), SHALL ignore ids that `bd ready` or `bd blocked` list but `bd list` does not, SHALL use the same 5-second cache entry for all three commands, and IF `bd ready` or `bd blocked` fails or prints an unexpected shape, THEN SHALL respond 502 as in REQ-BEADS-005 instead of returning wrong flags.

#### Scenario: Flags
- GIVEN an open unblocked bead, an open bead with an unfinished blocker, an in-progress bead and a closed bead
- WHEN a client requests the list with `closed=1`
- THEN the first has `ready` true, the second `blocked` true, the third both false, and the fourth has `closed_at`

#### Scenario: Unknown id is ignored
- GIVEN `bd ready` lists an id that `bd list` does not
- WHEN a client requests the list
- THEN that id does not appear and the request succeeds

#### Scenario: Readiness command fails
- GIVEN `bd blocked` exits with a non-zero status
- WHEN a client requests the list
- THEN the response is 502 with an `error`, and the failure is not cached

#### Scenario: One cache entry
- GIVEN a list was returned less than 5 seconds ago
- WHEN a client requests the same list
- THEN none of the three commands runs again

### REQ-UI-030: Views
The Beads page SHALL offer the views List, Board and Focus kept in the URL as `view` (`list` when absent or unknown), SHALL load the beads once for all three views with the project, search, filters and "Show closed" of the list applying to each of them, and SHALL refresh them as in REQ-UI-027 without reloading the data when the view changes.

#### Scenario: Switch keeps filters
- GIVEN the List view with the filter status "open" and the search "fix"
- WHEN the user chooses Board
- THEN the URL has `view=board`, the filters are unchanged and no new request is made

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&view=focus`
- WHEN the page loads
- THEN the Focus view is shown for project `a`

#### Scenario: Unknown view
- GIVEN the URL has `view=graph`
- WHEN the page loads
- THEN the List view is shown

### REQ-UI-031: Board columns
The Board view SHALL show the columns Backlog (status `deferred`), Ready (`ready`), In Progress (status `in_progress` or `hooked`), Blocked (`blocked`) and Done (status `closed`), each with its number of beads, SHALL put a bead in the first of those columns that fits, SHALL leave out of the Board any bead that fits none, SHALL order a column by priority and then by last update, newest first, and SHALL show a card with the id, a title linking to the bead, the type, `P<n>`, the assignee, and the dependency and comment counts.

#### Scenario: Placement
- GIVEN a deferred bead, a ready bead, an in-progress bead, a blocked bead and a closed bead
- WHEN the Board is shown with closed beads
- THEN each is in its own column and each column says 1

#### Scenario: Pinned bead
- GIVEN a pinned bead that is not ready, blocked or closed
- WHEN the Board is shown
- THEN it is in no column and the List still shows it

#### Scenario: Card and link
- GIVEN a ready P1 bead assigned to alice
- WHEN the Board is shown
- THEN its card shows the id, title, type, `P1` and alice, and the title links to `/beads/<project>/<id>`

#### Scenario: Empty column
- GIVEN no bead is blocked
- WHEN the Board is shown
- THEN the Blocked column says "No beads"

### REQ-UI-032: Done column
The Done column SHALL show closed beads only while "Show closed" is on, ordered by closing time (`updated_at` when `closed_at` is absent) newest first, SHALL show the 20 most recent with the total, and SHALL offer "Show all N" to show every one and "Show latest 20" to go back.

#### Scenario: Short by default
- GIVEN 45 closed beads and "Show closed" on
- WHEN the Board is shown
- THEN Done lists 20 and says "20 of 45"

#### Scenario: Show all
- GIVEN the same board
- WHEN the user chooses "Show all 45"
- THEN Done lists 45 and offers "Show latest 20"

#### Scenario: Closed hidden
- GIVEN "Show closed" is off
- WHEN the Board is shown
- THEN Done is empty and tells how to show closed beads

### REQ-UI-033: Focus columns
The Focus view SHALL show the columns In flight (status `in_progress` or `hooked`), Blocked (`blocked`) and Next up (`ready` with priority P0 or P1), each with its count, SHALL not cap In flight or Blocked, and SHALL order each by priority and then by last update, newest first.

#### Scenario: Columns
- GIVEN an in-progress bead, a blocked bead, a ready P1 bead and a ready P3 bead
- WHEN the Focus view is shown
- THEN In flight, Blocked and Next up each hold one bead and the P3 bead is in no column

### REQ-UI-034: Group by assignee
WHERE the user chooses Group by "Assignee" (kept in the URL as `group=assignee`), the Focus view SHALL show one row per assignee with the three columns inside it, ordered by assignee name, SHALL put beads without an assignee in a last row "No assignee", and SHALL show the original columns again for "None".

#### Scenario: Rows
- GIVEN beads assigned to bob, to alice and to nobody
- WHEN the user groups by assignee
- THEN the rows are alice, bob and "No assignee"

#### Scenario: Back to none
- GIVEN the Focus view is grouped
- WHEN the user chooses "None"
- THEN the ungrouped columns return and the URL has no `group`

### REQ-UI-035: Recently finished
WHERE the user turns on "Recently finished" (kept in the URL as `finished=1`), the Focus view SHALL add a column with the 7 most recently closed beads that match the current search, filters and lane, newest first, SHALL say how many are shown out of how many match, and SHALL offer "Show all N completed" and "Show latest 7".

#### Scenario: Latest seven
- GIVEN 12 closed beads match and "Show closed" is on
- WHEN "Recently finished" is on
- THEN 7 are listed and the column says "7 of 12"

#### Scenario: Show all completed
- GIVEN the same view
- WHEN the user chooses "Show all 12 completed"
- THEN 12 are listed and "Show latest 7" is offered

#### Scenario: Needs closed beads
- GIVEN "Show closed" is off
- WHEN the user turns on "Recently finished"
- THEN the page turns "Show closed" on so that the column has data

### REQ-UI-036: Lane
The Board and Focus views SHALL offer a "Lane" select listing every label of the loaded beads and "All", kept in the URL as `lane`, and SHALL show only the beads that carry the chosen label, applied together with search and filters.

#### Scenario: Lane
- GIVEN beads labelled "frontend" and "backend"
- WHEN the user chooses the lane "frontend"
- THEN only the "frontend" beads remain on the Board and in Focus, and the URL has `lane=frontend`

#### Scenario: Unknown lane
- GIVEN the URL has `lane=gone` and no bead has that label
- WHEN the page loads
- THEN the views are empty and the lane select still shows "gone" so that the user can clear it

### REQ-UI-037: Keyboard
WHILE the Board or Focus view is shown and no text field has focus, `/` SHALL move focus to the search box, the arrow keys SHALL move focus between the cards, and `Enter` SHALL open the focused card; WHILE the search box has focus, `Esc` SHALL clear it when it has text and otherwise leave it.

#### Scenario: Search shortcut
- GIVEN the Board is shown and no field has focus
- WHEN the user presses `/`
- THEN the search box has focus and the key is not typed into it

#### Scenario: Move and open
- GIVEN the Board has several cards
- WHEN the user presses the arrow keys and then `Enter`
- THEN focus moves between cards and the focused bead opens

#### Scenario: Escape
- GIVEN the search box has focus and text
- WHEN the user presses `Esc`
- THEN the text is cleared, and a second `Esc` leaves the box
