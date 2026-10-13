# Ui

## Purpose

## Requirements

### REQ-UI-001: Projects page
WHEN the Projects page loads, the frontend SHALL list every project from `/api/projects` with its name and path, and SHALL mark each project whose `exists` is false with a "missing" badge.

#### Scenario: List with a missing project
- GIVEN `/api/projects` returns one existing and one missing project
- WHEN the Projects page loads
- THEN both rows show name and path, and only the missing one shows a "missing" badge

#### Scenario: No projects
- GIVEN `/api/projects` returns an empty list
- WHEN the Projects page loads
- THEN the page says no projects are configured and names the config file

### REQ-UI-002: API error with retry
IF the request to `/api/projects` fails, THEN the Projects page SHALL show an error message and a retry button that repeats the request.

#### Scenario: Failure then retry
- GIVEN the first request to `/api/projects` fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the project list is shown

### REQ-UI-003: Workflow state display
The Projects page SHALL show, for each project with `workflow` data, the `stage` and one chip per gate whose text names the gate and its state.

#### Scenario: Stage and gates
- GIVEN a project with stage `plan` and gate `requirement_confirmed` satisfied
- WHEN the Projects page loads
- THEN the project's card shows `plan` and a chip naming `requirement_confirmed` as satisfied

### REQ-UI-004: Beads summary display
The Projects page SHALL show, for each project with `beads` data, the counts open, in progress, blocked and ready, and the active epics as `id` and `title`, or a "no active epics" note when the list is empty.

#### Scenario: Counts and epics
- GIVEN a project with the counts 3, 1, 0, 2 and one active epic
- WHEN the Projects page loads
- THEN the card shows all four counts and the epic id and title

### REQ-UI-005: Scotty deep links
WHERE a project has a `scotty_url`, the Projects page SHALL link the project name to it and each active epic to `<scotty_url>?bead=<id>`, in a new tab with `rel="noopener noreferrer"`, and SHALL render no link for a project without one.

#### Scenario: Link present
- GIVEN a project with `scotty_url` `https://h/p/scotty` and epic `scotty-1`
- WHEN the Projects page loads
- THEN the epic links to `https://h/p/scotty?bead=scotty-1`

#### Scenario: No Scotty id
- GIVEN a project with `scotty_url` null
- WHEN the Projects page loads
- THEN the name and epics are plain text

### REQ-UI-006: Automatic refresh
WHILE the page is visible, the Projects page SHALL reload `/api/projects` every 10 seconds without replacing the list by a loading state, and WHILE the page is hidden it SHALL not poll and SHALL reload when it becomes visible; IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN the page reloads the data
- THEN the list stays on screen and shows the new values

#### Scenario: Hidden tab
- GIVEN the tab becomes hidden
- WHEN 10 seconds pass
- THEN no request is made, and one request is made when the tab becomes visible

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-007: Per-block error display
IF a project's `workflow` or `beads` is an object with `error`, THEN the Projects page SHALL show that message in place of that block and SHALL still show the other block.

#### Scenario: Beads error
- GIVEN a project whose `beads` is `{"error": "bd not found"}` and whose `workflow` has data
- WHEN the Projects page loads
- THEN the card shows `bd not found` and the workflow stage
