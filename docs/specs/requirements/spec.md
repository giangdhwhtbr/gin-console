# Requirements

## Purpose

## Diagrams

- [changes-activity](diagrams/changes-activity.md)
- [matrix-activity](diagrams/matrix-activity.md)
- [mockups-activity](diagrams/mockups-activity.md)

## Use Cases

- [open-a-mockup](use-cases/open-a-mockup.md)
- [read-a-change](use-cases/read-a-change.md)
- [trace-a-requirement](use-cases/trace-a-requirement.md)

## Requirements

### REQ-REQUIREMENTS-001: Requirements list
WHEN a client requests `GET /api/requirements?project=<name>`, the server SHALL return every requirement of `gin specs trace --all --format json` (run in the project directory, `schema` 1) with its id, title, capability, state (`living`, `proposed` or `removed`), status (REQ-REQUIREMENTS-002), sign-off (REQ-REQUIREMENTS-003), changes, beads, cases and test files, and SHALL return the layout, the warnings and the skipped entries of the trace. `beads` and `cases` that the trace gives as null SHALL stay null.

#### Scenario: Living and removed
- GIVEN a trace with one living and one removed requirement
- WHEN the list is requested
- THEN both are returned with their state, and the removed one has no status

#### Scenario: Trace warning
- GIVEN a trace whose `beads` are null and whose warnings hold `beads: bd exited 1`
- WHEN the list is requested
- THEN the response is 200, `beads` is null and the warning is returned

#### Scenario: Legacy layout
- GIVEN a project whose trace has the layout `legacy` and no requirements
- WHEN the list is requested
- THEN the response is 200 with the layout `legacy` and an empty list

### REQ-REQUIREMENTS-002: Requirement status
Type: business-rule
The server SHALL give each living or proposed requirement the first status that applies: `failing` when a case has the effective result `failed`; `building` when the requirement is proposed or a bead of it is not closed; `unknown` when its cases are null; `covered` when it has at least one case and every case has the effective result `passed`; else `untested`. A status other than `covered` SHALL come with its reasons: `failed`, `proposed`, `open beads`, `cases unknown`, `no case`, `not run`, `outdated`. An effective result the server does not know SHALL count as not passed and be its own reason. Test files SHALL NOT change the status.

#### Scenario: Covered
- GIVEN a living requirement with closed beads and two passed cases
- WHEN the status is computed
- THEN it is `covered`

#### Scenario: Outdated case
- GIVEN a living requirement with one passed and one outdated case
- WHEN the status is computed
- THEN it is `untested` with the reason `outdated`

#### Scenario: No case
- GIVEN a living requirement with no case and one test file
- WHEN the status is computed
- THEN it is `untested` with the reason `no case`

#### Scenario: Failing beats building
- GIVEN a requirement with a failed case and an open bead
- WHEN the status is computed
- THEN it is `failing`

#### Scenario: Cases unknown
- GIVEN a living requirement with closed beads and null cases
- WHEN the status is computed
- THEN it is `unknown`

#### Scenario: Beads unknown
- GIVEN a living requirement with null beads and one passed case
- WHEN the status is computed
- THEN it is `covered`

### REQ-REQUIREMENTS-003: Requirement sign-off
The server SHALL give each requirement the sign-off of the trace as one of: `none` when it is null; `waived` when it is waived; `current` when its `current` is true; `changed` when false; `unknown version` when null; each but `none` with its actor, time, change, evidence and source.

#### Scenario: Changed after sign-off
- GIVEN a sign-off whose `current` is false
- WHEN the list is requested
- THEN the sign-off is `changed` with its actor, time and change

#### Scenario: Hash not recorded
- GIVEN a sign-off whose `current` is null and which is not waived
- WHEN the list is requested
- THEN the sign-off is `unknown version`

#### Scenario: Waived
- GIVEN a sign-off with `waived` true
- WHEN the list is requested
- THEN the sign-off is `waived` with the reason held in `evidence`

### REQ-REQUIREMENTS-004: Requirement scenarios
WHEN a client requests `GET /api/requirements/reqs/<project>/<req-id>`, the server SHALL return the title, the source and the scenarios of that requirement from `gin specs reqs --format json`, taking the entry of the living spec before one of an open change, and SHALL respond 404 for a requirement that is not there.

#### Scenario: Scenarios
- GIVEN `REQ-AUTH-001` with two scenarios
- WHEN its detail is requested
- THEN both are returned with their given, when and then lines

#### Scenario: Removed requirement
- GIVEN a requirement that only the trace knows
- WHEN its detail is requested
- THEN the response is 404

### REQ-REQUIREMENTS-005: Requirements errors
The requirements endpoints SHALL respond 404 for a project that is not configured or whose directory is missing, and 502 with `error` and `cause` WHEN gin fails, does not answer in 30 seconds, or prints what the server does not understand: the cause `outdated` when this gin has no `specs trace --all`, `schema` when the trace schema is not 1, else null. A failure of one gin command SHALL NOT fail an endpoint that does not need it.

#### Scenario: Old gin
- GIVEN a gin whose `specs trace` requires `--change` and rejects `--all`
- WHEN the list is requested
- THEN the response is 502 with the cause `outdated`

#### Scenario: Timeout
- GIVEN a trace that does not answer in 30 seconds
- WHEN the list is requested
- THEN the response is 502 with an error naming the timeout

#### Scenario: Scenarios fail alone
- GIVEN `specs reqs` fails and the trace answers
- WHEN the list is requested
- THEN the response is 200

#### Scenario: Unknown project
- GIVEN no project named `nope`
- WHEN any requirements endpoint is requested for it
- THEN the response is 404

### REQ-REQUIREMENTS-006: Requirements cache
Type: non-functional
Category: performance
The server SHALL keep the answers of `gin specs trace --all` and `gin specs reqs` for 60 seconds per project, SHALL run at most one of each per project at a time, SHALL NOT keep a failure, and SHALL forget them on `POST /api/refresh`.

#### Scenario: Two readers
- GIVEN no kept answer
- WHEN two clients request the list of the same project at once
- THEN the trace runs once and both get its answer

#### Scenario: Refresh
- GIVEN a kept answer
- WHEN `POST /api/refresh` is sent and the list is requested
- THEN the trace runs again

#### Scenario: Failure
- GIVEN a trace that failed
- WHEN the list is requested again
- THEN the trace runs again

### REQ-REQUIREMENTS-007: Change list
WHEN a client requests `GET /api/requirements/changes?project=<name>`, the server SHALL return every change folder of `docs/changes` (open) and `docs/changes/archive` (archived, with the date prefix of the folder), open first by name and then archived from the newest date, with the folder name, the epic id of the `Epic:` line and the title of its proposal, and, from the trace, the sign-off and the number of requirements added, modified and removed. IF the trace fails, THEN the list SHALL be returned with null sign-offs and counts and the error. A change the trace does not name SHALL have null counts and sign-off.

#### Scenario: Open and archived
- GIVEN one open and two archived changes
- WHEN the list is requested
- THEN the open one comes first and the newest archived one second

#### Scenario: Trace fails
- GIVEN a failing trace
- WHEN the list is requested
- THEN the response is 200 with the changes, null sign-offs and the error

#### Scenario: No changes folder
- GIVEN a project without `docs/changes`
- WHEN the list is requested
- THEN the response is 200 with an empty list

### REQ-REQUIREMENTS-008: Change content
WHEN a client requests `GET /api/requirements/changes/<project>/<change>`, the server SHALL return the Markdown text of the proposal, spec delta, design, plan and tests files that exist in that folder, named with or without the prefixes `01-` to `05-`, with its epic, title and archived date, and SHALL respond 404 for an unknown change.

#### Scenario: Numbered
- GIVEN a folder with `01-proposal.md` to `05-tests.md`
- WHEN it is requested
- THEN the five texts are returned

#### Scenario: Not numbered
- GIVEN a folder with `proposal.md` and `spec-delta.md`
- WHEN it is requested
- THEN the two texts are returned and no other

#### Scenario: Unknown
- GIVEN no folder named `nope`
- WHEN it is requested
- THEN the response is 404

### REQ-REQUIREMENTS-009: Confirmed mockups
WHEN a client requests `GET /api/requirements/mockups?project=<name>`, the server SHALL return each folder `docs/specs/<capability>/assets/<YYYY-MM-DD>/` whose `description.md` has a line `Confirmed: <YYYY-MM-DD>` and which holds at least one HTML or image file, newest first within each capability, with the capability, the date, the confirmation date, the person of `Confirmed by:` when given, the description text, the HTML and image file paths, and the ids of the living requirements whose `Source:` line points into the folder. Folders that are not confirmed SHALL be left out.

#### Scenario: Not confirmed
- GIVEN a folder with `Confirmed: no`
- WHEN the list is requested
- THEN it is not returned

#### Scenario: Used by
- GIVEN `REQ-UI-129` whose `Source:` names `../ui/assets/2026-11-22/index.html#reports`
- WHEN the list is requested
- THEN the folder `2026-11-22` of `ui` lists `REQ-UI-129`

#### Scenario: No HTML
- GIVEN a confirmed folder with only PNG files
- WHEN the list is requested
- THEN it is returned with its images

### REQ-REQUIREMENTS-010: Safe project files
Type: non-functional
Category: security
The server SHALL read project files for the requirements endpoints only inside the change folders of `docs/changes` and the asset folders under the specs folder `docs/specs/<capability>/assets/`, plus the `Source:` lines of `docs/specs/<capability>/spec.md` for the requirement ids of REQ-REQUIREMENTS-009 (returning no other text of it), after resolving symbolic links, and SHALL respond 404 for any other path, including one with `..`, an absolute path, a NUL byte, or a link that leads outside. `GET /api/requirements/mockups/<project>/files/<capability>/<date>/<path>` SHALL serve only files of a confirmed folder with the extension html, css, js, json, png, jpg, jpeg, gif, svg, webp or woff2.

#### Scenario: Parent path
- GIVEN the path `ui/2026-11-22/..%2f..%2fspec.md`
- WHEN it is requested
- THEN the response is 404

#### Scenario: Link outside
- GIVEN a link in a confirmed folder to a file outside it
- WHEN it is requested
- THEN the response is 404

#### Scenario: Folder not confirmed
- GIVEN a file of a folder with `Confirmed: no`
- WHEN it is requested
- THEN the response is 404

#### Scenario: NUL byte
- GIVEN a path holding `%00`
- WHEN it is requested
- THEN the response is 404

### REQ-REQUIREMENTS-011: Mockup isolation
Type: non-functional
Category: security
Every mockup file response SHALL carry `X-Content-Type-Options: nosniff` and the header `Content-Security-Policy` with `sandbox allow-scripts`, `connect-src 'none'`, `form-action 'none'` and `frame-src 'none'`. The frontend SHALL show a mockup only in an iframe whose `sandbox` attribute is exactly `allow-scripts`.

#### Scenario: Script calls the API
- GIVEN a mockup whose script fetches `/api/projects/beads` and posts to `/api/refresh`
- WHEN it is shown in the console or opened in its own tab
- THEN both calls are blocked and no refresh runs

#### Scenario: Interactive
- GIVEN a self-contained mockup with an inline script
- WHEN the user clicks its controls
- THEN it reacts

#### Scenario: SVG
- GIVEN an SVG file of a confirmed folder
- WHEN it is requested
- THEN its response carries the same headers

### REQ-REQUIREMENTS-012: Requirements sections
The frontend SHALL offer the sections Matrix, Changes and Mockups at `/requirements/matrix`, `/requirements/changes` and `/requirements/mockups`, and SHALL replace `/requirements` with the Matrix section keeping the query. From 1024px with the sidebar expanded, the sidebar SHALL list the sections under Requirements with the number of requirements that are not covered, the number of open changes and the number of mockup folders, leaving a number out while it is unknown; otherwise the page SHALL show them as a scrollable row of links. The selected one SHALL have `aria-current="page"`. An unknown path under `/requirements` SHALL show the page of REQ-UI-125.

#### Scenario: Wide
- GIVEN a window 1440px wide and the sidebar expanded
- WHEN `/requirements/changes?project=a` is shown
- THEN the sidebar lists the three sections, Changes is current, and the page shows no row of section links

#### Scenario: Phone
- GIVEN a window 390px wide
- WHEN the same page is shown
- THEN the row of section links is shown and the page does not scroll sideways

#### Scenario: Redirect
- GIVEN the current project is `a`
- WHEN the user opens `/requirements?project=a`
- THEN the URL becomes `/requirements/matrix?project=a` without a history entry

#### Scenario: Unknown section
- GIVEN any project
- WHEN the user opens `/requirements/nope`
- THEN the page of REQ-UI-125 is shown

### REQ-REQUIREMENTS-013: Traceability matrix
The Matrix section SHALL show the number of requirements per status, each a control that sets the status filter, and a table grouped by capability with one row per requirement: id, title, status with its reasons in words, sign-off, closed and total beads, passed and total cases. Unknown beads or cases SHALL read "unknown". Removed requirements SHALL show only while "Show removed" is on and SHALL read "Removed" instead of a status.

#### Scenario: Row
- GIVEN an untested requirement with one passed and one outdated case and two closed beads
- WHEN the matrix is shown
- THEN its row reads "Untested", "outdated", "2/2" beads and "1/2" cases

#### Scenario: Beads unknown
- GIVEN a trace with null beads
- WHEN the matrix is shown
- THEN the bead cells read "unknown"

#### Scenario: Removed
- GIVEN one removed requirement
- WHEN "Show removed" is turned on
- THEN its row is listed and the status counts do not change

### REQ-REQUIREMENTS-014: Matrix filters
The Matrix section SHALL offer one line of filters: status, capability, sign-off and a text that matches the id or the title ignoring case; a requirement SHALL be listed when it matches all of them. The filters and "Show removed" SHALL be kept in the URL as `status`, `capability`, `signoff`, `q` and `removed=1`; an unknown value SHALL be ignored.

#### Scenario: Shared link
- GIVEN `/requirements/matrix?project=a&status=untested&capability=ui`
- WHEN the page loads
- THEN only untested requirements of `ui` are listed

#### Scenario: No match
- GIVEN a text that matches nothing
- WHEN the matrix is shown
- THEN it says "No requirements match" with a control that clears the filters

### REQ-REQUIREMENTS-015: Requirement details
WHEN the user selects a row, the frontend SHALL open a details panel for it and keep `req=<id>` in the URL, showing the scenarios, the sign-off (state, person, time, change, evidence), the changes as links to their pages, the beads with title and state mark as links to their pages, the cases with their results, and the test files. IF the scenarios fail to load, THEN the panel SHALL say so and show the rest.

#### Scenario: Shared link
- GIVEN `/requirements/matrix?project=a&req=REQ-AUTH-001`
- WHEN the page loads
- THEN the panel of `REQ-AUTH-001` is open

#### Scenario: Scenarios fail
- GIVEN the scenarios request fails
- WHEN the panel is open
- THEN it says the scenarios could not be loaded and lists the beads and cases

#### Scenario: Unknown requirement
- GIVEN `req=REQ-NOPE-001`
- WHEN the page loads
- THEN the panel says the requirement was not found and the matrix is shown

### REQ-REQUIREMENTS-016: Changes section
The Changes section SHALL list the open changes and then the archived ones, each with its title, epic as a link to the bead, sign-off (person and time, "Waived", "None" or "Unknown"), and the numbers added, modified and removed, and SHALL link each to `/requirements/changes/<change>?project=<project>`.

#### Scenario: Signed off
- GIVEN an open change signed off by `ba`
- WHEN the section is shown
- THEN its row names `ba` and the time

#### Scenario: Trace failed
- GIVEN the list has the trace error
- WHEN the section is shown
- THEN the changes are listed, sign-offs read "Unknown" and the error is shown

### REQ-REQUIREMENTS-017: Change page
The change page SHALL show the title, the epic, the archived date or "Open", the sign-off, and one tab per existing file among Proposal, Spec delta, Design, Plan and Tests, the selected one kept in the URL as `tab`, rendering its Markdown without raw HTML. It SHALL be read-only.

#### Scenario: Missing plan
- GIVEN a change without a plan file
- WHEN its page is shown
- THEN there is no Plan tab

#### Scenario: Script in Markdown
- GIVEN a proposal holding `<script>alert(1)</script>`
- WHEN its page is shown
- THEN no script runs

#### Scenario: Unknown change
- GIVEN no change named `nope`
- WHEN the user opens its page
- THEN it says the change was not found and links to the Changes section

### REQ-REQUIREMENTS-018: Mockups section
The Mockups section SHALL list the confirmed folders grouped by capability with their date, confirmation date, person and requirement ids as links to the matrix details, and, WHEN one is selected (kept in the URL as `mockup=<capability>/<date>`), SHALL show its description, a control per HTML file that shows it in the isolated frame (REQ-REQUIREMENTS-011), a link that opens it in a new tab, and its images.

#### Scenario: Show a mockup
- GIVEN a confirmed folder with `mockup/index.html`
- WHEN the user selects it
- THEN the description and the mockup in the frame are shown

#### Scenario: Images only
- GIVEN a confirmed folder with two PNG files
- WHEN the user selects it
- THEN both images are shown and there is no frame

### REQ-REQUIREMENTS-019: Empty and failed requirements
The sections SHALL say why they are empty: for the legacy layout that requirements have no ids there, else that the project has no requirements, no changes or no confirmed mockups yet. They SHALL show the trace warnings above the matrix, and on failure the error, with the command that updates gin WHEN the cause is `outdated`.

#### Scenario: Legacy
- GIVEN a project with the legacy layout
- WHEN the Matrix section is shown
- THEN it says the project uses the legacy layout, which has no requirement ids

#### Scenario: Warning
- GIVEN a trace warning `beads: bd exited 1`
- WHEN the Matrix section is shown
- THEN the warning is shown above the table

#### Scenario: Old gin
- GIVEN the cause `outdated`
- WHEN the Matrix section is shown
- THEN it says gin is too old and shows the command that updates it
