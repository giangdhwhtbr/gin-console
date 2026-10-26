# Spec Delta: Filters multi select popovers

## ADDED

### REQ-UI-084: Responsive filter popovers and mobile sheet
The bead filter bar SHALL render filter controls as individual button triggers with popovers on viewport widths at or above 768px, displaying an active count badge on buttons that have active selections, and SHALL collapse filter controls into a single "Filters" button on viewport widths below 768px that opens a bottom sheet drawer containing all filter controls and a Clear button.

#### Scenario: Desktop popover view
- GIVEN a viewport width of 1024px and status filter containing "open" and "in_progress"
- WHEN the filter bar renders
- THEN the status filter button displays "Status 2" and clicking it toggles the popover panel

#### Scenario: Mobile sheet view
- GIVEN a viewport width of 500px and two active filters
- WHEN the filter bar renders
- THEN individual filter buttons are hidden, a "Filters 2" button is displayed, and clicking it opens the bottom sheet drawer

### REQ-UI-085: Multi-select labels filter with Any/All matching
The bead filter bar SHALL offer a "Labels" multi-select popover listing every unique label from loaded beads excluding `sprint:*` labels, with an Any/All match mode switch persisting in the URL query as `label_mode=all` when All is selected (omitted for default Any), and SHALL show beads having at least one selected label when Any is selected, or beads having all selected labels when All is selected.

#### Scenario: Any matching mode
- GIVEN a bead with label "ui" and another bead with label "backend"
- WHEN the user selects labels "ui" and "backend" with match mode "Any"
- THEN both beads remain visible and the URL query contains `label=ui,backend`

#### Scenario: All matching mode
- GIVEN a bead with labels ["ui", "backend"] and a bead with label ["ui"]
- WHEN the user selects labels "ui" and "backend" with match mode "All"
- THEN only the bead with both labels remains visible and the URL query contains `label=ui,backend&label_mode=all`

## MODIFIED

### REQ-UI-025: Search and filters
<!-- base: 0ccb547a07bb822aa69f31ff49b9b29d77ec1d8fbe78b4d3a3ac05e42adc4809 -->
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label, type, assignee and sprint, SHALL combine distinct filter categories with AND, SHALL serialize multi-select filters (`status`, `priority`, `label`, `assignee`) as comma-separated values in the URL query (`q`, `status`, `priority`, `label`, `label_mode`, `type`, `assignee`, `sprint`), and SHALL restore them on page load.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Multi-select combined filters
- GIVEN open P1 beads, in-progress P1 beads, and closed P2 beads
- WHEN the user filters status "open,in_progress" and priority "1"
- THEN only open and in-progress P1 beads remain and the URL query contains `status=open,in_progress&priority=1`

#### Scenario: Restored from the URL
- GIVEN the URL query has `?status=open,in_progress&priority=0,1&assignee=alice%40example.com&sprint=sprint-1`
- WHEN the page loads
- THEN the multi-select filters are restored and applied to the view

### REQ-UI-082: Assignee filter
<!-- base: 58cc7988301e60b31bb0543cea7ba8b836c8541b7a22f285b52c264a55554664 -->
The bead filter bar SHALL offer an "Assignee" multi-select filter listing "Unassigned" (when any loaded bead has no assignee) and every unique assignee of the loaded beads sorted alphabetically, kept in the URL query as comma-separated `assignee`, and SHALL show only beads whose assignee matches at least one selected assignee (or beads without an assignee when "Unassigned" is selected); when no assignee is selected, beads of all assignees SHALL be displayed.

#### Scenario: Filter by multiple assignees
- GIVEN beads assigned to "alice@example.com", "bob@example.com", and "carol@example.com"
- WHEN the user selects assignees "alice@example.com" and "bob@example.com"
- THEN only beads assigned to Alice or Bob remain visible and the URL query contains `assignee=alice%40example.com,bob%40example.com`

#### Scenario: Filter unassigned beads
- GIVEN beads assigned to "alice@example.com" and beads without an assignee
- WHEN the user selects assignee "Unassigned"
- THEN only beads without an assignee remain visible and the URL query contains `assignee=unassigned`

### REQ-UI-083: Sprint filter and past sprint visibility
<!-- base: 007a499b16b663f63cb2f9c3de0f45f08c5ee839e7830fc7b3ebab3dc6d0d97d -->
WHERE loaded beads or parent epics contain at least one `sprint:<name>` label, the bead filter bar SHALL offer a "Sprint" single-select control listing "All", "No sprint" (kept in the URL query as `sprint=none`), and every unique sprint name extracted from `sprint:<name>` labels sorted in descending alphanumeric order, kept in the URL query as `sprint`; IF no loaded beads or parent epics contain a `sprint:<name>` label, THEN the Sprint control SHALL be hidden; WHILE a named sprint is selected, closed beads SHALL be fetched and displayed for that sprint without requiring "Show closed" to be checked; and WHEN "No sprint" is selected, only beads lacking any direct or parent `sprint:<name>` label SHALL be displayed.

#### Scenario: Filter by sprint with direct and parent inheritance
- GIVEN an epic with label "sprint:sprint-1" and a child task without direct sprint label, and another epic with label "sprint:sprint-2"
- WHEN the user selects sprint "sprint-1"
- THEN the "sprint-1" epic and its child task remain visible, while the "sprint-2" epic is hidden, and the URL query contains `sprint=sprint-1`

#### Scenario: Filter by No sprint
- GIVEN an epic with label "sprint:sprint-1" and an independent bead without any sprint label
- WHEN the user selects sprint "No sprint"
- THEN only the bead without a sprint label remains visible and the URL query contains `sprint=none`

#### Scenario: Past sprint closed beads visibility
- GIVEN a previous sprint "sprint-0" where all beads are closed, and "Show closed" is off
- WHEN the user selects sprint "sprint-0"
- THEN the closed beads for "sprint-0" are fetched and displayed on the board

## REMOVED
