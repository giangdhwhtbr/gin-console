# Spec Delta: Browse

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin-workflow specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin-workflow specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...". -->

## ADDED

### REQ-BEADS-001: Bead list
WHEN a client requests `GET /api/beads?project=<name>`, the server SHALL return the beads of that configured project, each with `id`, `title`, `status`, `priority`, `issue_type`, `labels`, `owner`, `assignee`, `parent`, `created_at`, `updated_at`, `dependency_count`, `dependent_count` and `comment_count` and without the description, SHALL leave out closed beads unless the request has `closed=1`, and SHALL respond 404 when the project is not configured or its directory does not exist.

#### Scenario: Open beads by default
- GIVEN a project with 3 open, 1 in-progress and 4 closed beads
- WHEN a client requests `GET /api/beads?project=<name>`
- THEN 4 beads are returned and none is closed

#### Scenario: Closed beads on request
- GIVEN the same project
- WHEN a client requests `GET /api/beads?project=<name>&closed=1`
- THEN all 8 beads are returned

#### Scenario: Unknown project
- GIVEN no project named `nope`
- WHEN a client requests `GET /api/beads?project=nope`
- THEN the response is 404

#### Scenario: Missing directory
- GIVEN a configured project whose directory does not exist
- WHEN a client requests its beads
- THEN the response is 404

### REQ-BEADS-002: Bead detail
WHEN a client requests `GET /api/beads/{project}/{id}`, the server SHALL return the bead with the fields of REQ-BEADS-001 plus `description`, `dependencies` and `dependents` (each with `id`, `title`, `status` and `type`, where `type` is `blocks` or `parent-child`) and, for an epic, `children` (each with `id`, `title`, `status`, closed children included), and SHALL respond 404 when the project or the bead does not exist.

#### Scenario: Dependencies and dependents
- GIVEN a bead blocked by one bead and blocking another
- WHEN a client requests its detail
- THEN `dependencies` lists the first with type `blocks` and `dependents` lists the second

#### Scenario: Epic children
- GIVEN an epic with 3 children, one of them closed
- WHEN a client requests its detail
- THEN `children` lists all 3 with their statuses

#### Scenario: Unknown bead
- GIVEN a configured project without a bead `x-1`
- WHEN a client requests `GET /api/beads/<project>/x-1`
- THEN the response is 404

### REQ-BEADS-003: Safe, read-only commands
The server SHALL run only read-only `bd` commands with fixed arguments in the project directory, SHALL accept a bead `id` only when it matches `[A-Za-z0-9][A-Za-z0-9._-]*` and respond 404 otherwise, SHALL treat any `closed` value other than `1` as absent without failing the request, and SHALL never create, update, close or delete a bead.

#### Scenario: Option-like id
- GIVEN a request for the bead `--help` or `../x`
- WHEN the server handles it
- THEN the response is 404 and no `bd` command ran

#### Scenario: Odd closed value
- GIVEN a request with `closed=../x` or `closed=true`
- WHEN the server handles it
- THEN the response is 200 and closed beads are left out

### REQ-BEADS-004: Short-lived cache
The server SHALL reuse a successful list for 5 seconds per project and closed setting and a successful detail for 5 seconds per project and bead, SHALL run the command for one key at most once at a time when requests overlap, and SHALL NOT keep an error result.

#### Scenario: Reused
- GIVEN a list fetched 2 seconds ago
- WHEN the same list is requested
- THEN `bd` is not run again

#### Scenario: Expired
- GIVEN a list fetched 6 seconds ago
- WHEN the same list is requested
- THEN `bd` runs again

#### Scenario: Different key
- GIVEN a list fetched without closed beads
- WHEN the list with `closed=1` is requested
- THEN `bd` runs for it

#### Scenario: Overlapping requests
- GIVEN two identical requests arrive while `bd` runs
- WHEN both complete
- THEN `bd` ran once

#### Scenario: Errors are not kept
- GIVEN the last run failed
- WHEN the same request is made again
- THEN `bd` runs again

### REQ-BEADS-005: Failures
IF `bd` is not found, times out after 30 seconds, exits with a non-zero status, prints invalid JSON or JSON of an unexpected shape, THEN the server SHALL respond 502 with a JSON body whose `error` says which happened, and SHALL leave out of a list any bead whose fields have the wrong types instead of failing the list.

#### Scenario: bd missing
- GIVEN no `bd` command can be found
- WHEN a client requests a list
- THEN the response is 502 and `error` says the command was not found

#### Scenario: Timeout
- GIVEN `bd` runs longer than 30 seconds
- WHEN a client requests a list
- THEN the response is 502 and `error` says it timed out

#### Scenario: One malformed bead
- GIVEN `bd` prints 3 beads of which one has a numeric `title`
- WHEN a client requests the list
- THEN the 2 valid beads are returned

### REQ-BEADS-006: Clean strings
The server SHALL replace lone surrogate characters in every string it returns.

#### Scenario: Lone surrogate in a title
- GIVEN a bead whose title contains a lone surrogate escape
- WHEN a client requests the list and its detail
- THEN both responses are 200 with the character replaced

### REQ-UI-022: Beads navigation
The sidebar SHALL contain a "Beads" link, and the frontend SHALL show the bead list at `/beads` and a bead at `/beads/<project>/<id>` without a full reload, following the browser back and forward buttons, and a route segment that cannot be decoded SHALL show the Projects page.

#### Scenario: Open the list
- GIVEN the Projects page is shown
- WHEN the user clicks "Beads"
- THEN the URL is `/beads` and the bead list is shown without a reload

#### Scenario: Back button
- GIVEN the user opened a bead from the list
- WHEN the user presses back
- THEN the list is shown with the same filters

### REQ-UI-023: Project choice
The bead list SHALL offer the configured projects whose directory exists in a select kept in the `?project=` query, SHALL default to the first of them, and WHEN no project exists SHALL say that no projects are configured.

#### Scenario: Default and choice
- GIVEN two projects
- WHEN the list opens without `?project=`
- THEN the first project is selected and its beads are shown, and choosing the other changes the URL and the list

#### Scenario: No projects
- GIVEN `/api/projects` returns an empty list
- WHEN the list opens
- THEN it says no projects are configured

### REQ-UI-024: Bead list
The bead list SHALL show for each bead its id, a title linking to the bead, its type, status, priority written as `P<n>`, labels, assignee or owner, and last update, ordered by priority and then by last update, newest first, and SHALL show how many of the loaded beads match the current search and filters.

#### Scenario: Row content and order
- GIVEN a P2 bead updated yesterday and a P1 bead updated last week
- WHEN the list loads
- THEN the P1 bead is first, and both show id, title, type, status, `P<n>`, labels and update time

#### Scenario: Count
- GIVEN 83 loaded beads of which 5 match the filters
- WHEN the list is shown
- THEN it says 5 of 83

#### Scenario: Empty
- GIVEN no bead matches
- WHEN the list is shown
- THEN it says no beads match

### REQ-UI-025: Search and filters
The bead list SHALL offer a search box that matches the id, title and labels case-insensitively, and filters for status, priority, label and type, SHALL combine them with AND, and SHALL keep them in the URL query (`q`, `status`, `priority`, `label`, `type`) so that a reload or a shared link restores them.

#### Scenario: Search
- GIVEN beads titled "Fix login" and "Add search"
- WHEN the user types "LOGIN"
- THEN only "Fix login" remains

#### Scenario: Combined filters
- GIVEN open P1 beads and in-progress P1 beads
- WHEN the user filters status "open" and priority "P1"
- THEN only open P1 beads remain and the URL holds both filters

#### Scenario: Restored from the URL
- GIVEN the URL has `?project=a&status=open&q=fix`
- WHEN the page loads
- THEN the filters are applied and shown in their controls

### REQ-UI-026: Closed beads
The bead list SHALL leave closed beads out by default, SHALL offer a "Show closed" control kept in the URL as `closed=1` that requests the list with `closed=1`, and SHALL apply search and filters to the closed beads too.

#### Scenario: Show closed
- GIVEN the list shows 4 beads
- WHEN the user turns on "Show closed"
- THEN the list is requested with `closed=1` and shows all 8, and the URL has `closed=1`

### REQ-UI-027: Bead list refresh
WHILE the page is visible, the bead list SHALL reload every 10 seconds without replacing the list by a loading state, WHILE the page is hidden it SHALL not poll and SHALL reload when visible again, and IF a refresh fails, THEN it SHALL keep the last data and show the error with a retry button.

#### Scenario: Silent refresh
- GIVEN the list is shown and 10 seconds pass
- WHEN it reloads
- THEN the list stays on screen and shows the new values

#### Scenario: Hidden tab
- GIVEN the tab becomes hidden
- WHEN 10 seconds pass
- THEN no request is made, and one request is made when the tab becomes visible

#### Scenario: Refresh failure
- GIVEN the list is shown and the next refresh fails
- WHEN the failure is received
- THEN the old list stays visible with an error message and a retry button

### REQ-UI-028: Bead detail
The bead page SHALL show the bead's id, title, status, priority, type, labels, owner, assignee, creation and update times and comment count, its description as plain text with line breaks, its dependencies and the beads it blocks (each with id, title and status, linking to that bead in the same project), and for an epic its children with a progress bar of closed children over all children.

#### Scenario: Fields and description
- GIVEN a bead with a description containing `<script>` and Markdown
- WHEN the page loads
- THEN the characters are shown as typed and no element is created from them

#### Scenario: Relations link inside the console
- GIVEN a bead with one dependency
- WHEN the page loads
- THEN the dependency shows its id, title and status and links to `/beads/<project>/<its id>`

#### Scenario: Epic progress
- GIVEN an epic with 4 children of which 3 are closed
- WHEN the page loads
- THEN the children are listed and a progress bar reads 3 of 4

### REQ-UI-029: Bead errors
IF a request for the list or a bead fails, THEN the page SHALL show the error and a retry button that repeats the request, IF the server answers 404 for a bead, THEN the page SHALL say "Bead not found" with a link back to the list, and IF a response has an unexpected shape, THEN the page SHALL show an error instead of failing.

#### Scenario: List error and retry
- GIVEN the first list request fails and the second succeeds
- WHEN the user clicks retry
- THEN the error disappears and the list is shown

#### Scenario: Unknown bead
- GIVEN the server answers 404 for a bead
- WHEN the bead page loads
- THEN it says "Bead not found" and links back to the list

#### Scenario: Unexpected response
- GIVEN the response is not the expected shape
- WHEN the page loads
- THEN an error and a retry button are shown, not a blank page

## MODIFIED

### REQ-UI-005: Scotty deep links
<!-- base: 3a8fc6a1c7f7127bfeb639ca02db888b6f256dc7dd5220b4ba57a557db0cd6f5 -->
WHERE a project has a `scotty_url`, the Projects page SHALL link the project name to it in a new tab with `rel="noopener noreferrer"` and SHALL render no link for a project without one, and SHALL link each active epic to the console's own bead page `/beads/<project>/<id>` whether or not the project has a `scotty_url`.

#### Scenario: Project link present
- GIVEN a project with `scotty_url` `https://h/p/scotty`
- WHEN the Projects page loads
- THEN the project name links to `https://h/p/scotty` in a new tab

#### Scenario: No Scotty id
- GIVEN a project with `scotty_url` null
- WHEN the Projects page loads
- THEN the name is plain text

#### Scenario: Epics open the console's bead page
- GIVEN a project named `scotty` with active epic `scotty-1`, with or without a `scotty_url`
- WHEN the Projects page loads
- THEN the epic links to `/beads/scotty/scotty-1` inside the console

## REMOVED
