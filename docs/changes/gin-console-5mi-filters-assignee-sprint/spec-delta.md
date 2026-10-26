# Spec Delta: Filters assignee sprint

## ADDED

### REQ-UI-082: Assignee filter
The bead filter bar SHALL offer an "Assignee" select listing "All", "Unassigned" (when any loaded bead has no assignee), and every unique assignee of the loaded beads sorted alphabetically, kept in the URL query as `assignee`, and SHALL show only the beads whose assignee matches the chosen value (or beads with no assignee when "Unassigned" is chosen).

#### Scenario: Filter by assignee
- GIVEN beads assigned to "alice@example.com" and "bob@example.com"
- WHEN the user selects assignee "alice@example.com"
- THEN only beads assigned to "alice@example.com" remain visible and the URL query contains `assignee=alice%40example.com`

#### Scenario: Filter unassigned beads
- GIVEN beads assigned to "alice@example.com" and beads without an assignee
- WHEN the user selects assignee "Unassigned"
- THEN only beads without an assignee remain visible and the URL query contains `assignee=unassigned`

### REQ-UI-083: Sprint filter and past sprint visibility
The bead filter bar SHALL offer a "Sprint" select listing "All" and every unique sprint name extracted from `sprint:<name>` labels among the loaded beads sorted in descending alphanumeric order, kept in the URL query as `sprint`, and SHALL show only the beads that directly carry `sprint:<name>` or whose parent epic carries `sprint:<name>`; WHILE a sprint filter is selected, closed beads SHALL be fetched and displayed for that sprint without requiring "Show closed" to be checked.

#### Scenario: Filter by sprint with direct and parent inheritance
- GIVEN an epic with label "sprint:sprint-1" and a child task without direct sprint label, and another epic with label "sprint:sprint-2"
- WHEN the user selects sprint "sprint-1"
- THEN the "sprint-1" epic and its child task remain visible, while the "sprint-2" epic is hidden, and the URL query contains `sprint=sprint-1`

#### Scenario: Past sprint closed beads visibility
- GIVEN a previous sprint "sprint-0" where all beads are closed, and "Show closed" is off
- WHEN the user selects sprint "sprint-0"
- THEN the closed beads for "sprint-0" are fetched and displayed on the board

## MODIFIED

### REQ-UI-025: Search and filters
<!-- base: 4891734374225fc23bdb65a99015a275d376001ad66685559a726d00eee545c9 -->
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label, type, assignee and sprint, SHALL combine them with AND, and SHALL keep them in the URL query (`q`, `status`, `priority`, `label`, `type`, `assignee`, `sprint`) so that a reload or a shared link restores them.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Combined filters
- GIVEN open P1 beads and in-progress P1 beads
- WHEN the user filters status "open" and priority "P1"
- THEN only open P1 beads remain and the URL holds both filters

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&status=open&q=fix&assignee=alice&sprint=1`
- WHEN the page loads
- THEN the filters are applied and shown in their controls

### REQ-UI-035: Recently finished
<!-- base: b12a2d9e59bbfcdb6a7ca38d76e276ced7208f5c8a9dbc6f61c847c389566791 -->
WHERE the user turns on "Recently finished" (kept in the URL as `finished=1`), the Focus view SHALL add a column with the 7 most recently closed beads that match the current search and filters, newest first, SHALL say how many are shown out of how many match, and SHALL offer "Show all N completed" and "Show latest 7".

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

### REQ-UI-043: List filters
<!-- base: 0174acf062f45e198063bc43d636f53850ee350f3a83339bc21b6f6a472695be -->
WHEN a search or a filter is active, the List view SHALL show only the beads that match them together with their ancestors in the hierarchy, with every branch that leads to a match open, and SHALL leave out closed beads unless "Show closed" is on or a sprint filter is active.

#### Scenario: Match with ancestors
- GIVEN an epic with a child titled "Fix login" and another titled "Add search"
- WHEN the user searches "login"
- THEN the epic and the "Fix login" child are shown, open, and "Add search" is not

#### Scenario: Closed beads
- GIVEN a closed child and "Show closed" off
- WHEN the List view is shown
- THEN the closed child is not shown, and it is shown after "Show closed" is turned on

#### Scenario: Filter by assignee
- GIVEN an epic with children assigned to "alice" and "bob"
- WHEN the user filters by assignee "alice"
- THEN the epic and the child assigned to "alice" are shown, and the child assigned to "bob" is not

### REQ-UI-072: Breadcrumb
<!-- base: 3fb417a166c03ec711eb8fdd1153f8ba296391491ab46d75d55d4abb78604ced -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of the link "Beads" followed by the name of the view of the remembered place (REQ-UI-073) and, when a search, a status, priority, label, type, assignee or sprint filter or "Show closed" is active, "· N filters" where N counts them, all as one link to the remembered place, then the parent of the bead as a link to its page when it has one, then the id of the bead marked `aria-current="page"`, or, on a Dependencies page, after the link to the remembered place, "Dependencies" as a link to the project page, then every ancestor of the scope bead from the top as a link to its Dependencies page, then the id of the scope bead, with the last item marked `aria-current="page"`, and under 640px SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads › Board · 2 filters" then `a-1`, and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1`
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link `a-1` to `/beads/a/a-1` before `a-2`

#### Scenario: No remembered place
- GIVEN the Beads page was not shown in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then `a-1` and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

## REMOVED

### REQ-UI-036: Lane
<!-- base: f6f3fa8c598466433127cd6363f065d19f12264694f9b4ff1b25478518873db8 -->
Reason: Lane was redundant with the Label filter; it is replaced by dedicated Assignee and Sprint filters.
