# Spec Delta: Requirements

## ADDED

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

## MODIFIED

### REQ-UI-055: Main navigation
<!-- base: 01d60eecfaa54f1c0b60fd89bd3ff438c02cf6b7b8451545c2d6e25624407281 -->
The frontend SHALL show one navigation landmark labelled "Main" on every page, holding exactly one link each to Overview, Beads, My work, Milestones, Requirements and Reports, in that order, Overview going to `/` and the others to `/beads`, `/my-tasks`, `/milestones`, `/requirements` and `/reports` with `?project=<current project>` (REQ-UI-124).

#### Scenario: Six links
- GIVEN any page is shown and the current project is `a`
- WHEN the page loads
- THEN the "Main" navigation holds the links Overview, Beads, My work, Milestones, Requirements and Reports, one each, going to `/`, `/beads?project=a`, `/my-tasks?project=a`, `/milestones?project=a`, `/requirements?project=a` and `/reports?project=a`

#### Scenario: Short label
- GIVEN a window 390px wide, or the icon rail
- WHEN any page is shown
- THEN the Requirements link shows "REQs", has the accessible name "REQs (Requirements)", and no label is cut off or overlaps another

### REQ-UI-057: Current destination
<!-- base: b5f69a5b42762463df7d97f3fe5e5925128de2a1c33d7e9b050714af45308bfd -->
The "Main" navigation SHALL mark the link of the page being shown with `aria-current="page"` and a visible highlight: Overview on `/`, Beads on `/beads`, My work on `/my-tasks`, Milestones on `/milestones` and `/milestones/<project>/<id>`, Requirements on every path under `/requirements`, Reports on `/reports`. On a bead page it SHALL mark the link of the page the user opened the bead from in this browser tab (REQ-UI-073: Overview, My work, Milestones, Requirements or Reports), and Beads when the bead was opened from the Beads page, another bead page, or by its address. It SHALL mark no link on the page of REQ-UI-125 and SHALL mark no other link.

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

#### Scenario: Bead page from Overview
- GIVEN the user opened `a-1` from the Overview page
- WHEN the bead page is shown
- THEN only the Overview link has `aria-current="page"`

#### Scenario: Bead page from Requirements
- GIVEN the user opened `a-1` from the Matrix section
- WHEN the bead page is shown
- THEN only the Requirements link has `aria-current="page"`

### REQ-UI-063: Page title
<!-- base: ed6ecc69759d38f7cdc053f1caae30be32426415cb41ef76eabb8f055b25a6d0 -->
The frontend SHALL set the document title to the name of what the page shows, then the project when the page shows one project, then `gin-console`, joined by ` · `: `Overview · gin-console`, `Beads · <project> · gin-console`, `My work · <project> · gin-console`, `Milestones · <project> · gin-console`, `<milestone title> · <project> · gin-console` on a milestone page, `Reports · <section> · <project> · gin-console` with `<section>` one of Status, Team, Delivery, Velocity and Rework, `Requirements · <section> · <project> · gin-console` with `<section>` one of Matrix, Changes and Mockups, `<change> · <project> · gin-console` on a change page, `<bead title> · <project> · gin-console` on a bead page, and `Page not found · gin-console` (REQ-UI-125). WHILE a name is loading, and on the login page, the title SHALL be `gin-console`.

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

#### Scenario: Overview
- GIVEN two configured projects
- WHEN `/` is shown
- THEN the document title is `Overview · gin-console`

#### Scenario: Requirements section
- GIVEN `/requirements/changes?project=example`
- WHEN the page loads
- THEN the document title is `Requirements · Changes · example · gin-console`

### REQ-UI-072: Breadcrumb
<!-- base: d77e4fb29413e5031f7d0556ebfd6ef4dbb9b3d54e6371176a506dc457489ba3 -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a filter is active (REQ-UI-143), ", N filters" where N counts the active filters, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "Overview", "My work", "Requirements" or "Reports"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

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

#### Scenario: From Overview
- GIVEN the Overview page was shown last
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "Overview" then the title of `a-1`, and "Overview" goes to `/`

#### Scenario: From Requirements
- GIVEN the Matrix section was last at `/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001`
- WHEN the user opens `a-1` from the details of `REQ-AUTH-001`
- THEN the breadcrumb reads "Requirements" then the title of `a-1`, and "Requirements" goes to `/requirements/matrix?project=a&status=untested&req=REQ-AUTH-001`

### REQ-UI-073: Remembered place
<!-- base: 747662fe22edb8b6d75adb65564c18b3396cffe2340a3029b4315f72c42262ff -->
The Overview page, the Beads page, the My Tasks page, the Reports page, the Requirements pages and the milestone page (any tab) SHALL remember their path and URL query for the current browser tab, the one shown last replacing the others, SHALL use it for the first link of the breadcrumb (REQ-UI-072) and the marked navigation link (REQ-UI-057) when it is the Overview page or of the bead's project and `/beads?project=<project>` otherwise, SHALL NOT change it when the user goes from bead to bead, and IF the browser refuses to store it, THEN SHALL keep it for the visit without an error.

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

#### Scenario: My Tasks of another project
- GIVEN My Tasks was last at `/my-tasks?project=a`
- WHEN the bead page of a bead of project `b` is opened by its address
- THEN the first link reads "Beads" and goes to `/beads?project=b`

#### Scenario: Overview with beads of two projects
- GIVEN the Overview page was shown last and the current project is `a`
- WHEN the user opens a bead of project `b` from it
- THEN the first link reads "Overview" and goes to `/`

### REQ-UI-123: Project switcher
<!-- base: 74fc3d512970ed21b8edb08e38ad6bbbf7a3a7415e4ef647c6e9b7e3eb854bf1 -->
The frontend SHALL show a project switcher labelled "Project" that names the current project (REQ-UI-124): at the top of the sidebar from 1024px while the sidebar is expanded, as a button holding the first letter of the project in the icon rail (from 768px up to 1023px, or while the sidebar is collapsed), and in the top bar below 768px. Opening it SHALL list every configured project whose directory exists, from `GET /api/projects/beads`, with the favorite first, each with a star button labelled "Make <name> the favorite" or, on the favorite, "Remove <name> as favorite", marked with `aria-pressed`. WHEN the user chooses a project, the frontend SHALL make it the current project and SHALL then:
- on the Overview page, stay on `/` with the same content, the links of the Main navigation following the chosen project;
- on the Beads, My Tasks, Milestones or Reports page, stay on that page with `project` replaced, keeping `view`, `closed`, `tab`, `days` and `q`, and dropping `milestone`, `select`, `scope`, `member`, `status`, `sprint` and the other filters;
- on a Requirements section, stay on that section with `project` replaced, keeping `q` and dropping the other keys; on a change page, open the Changes section of the chosen project;
- on a bead page, open the Beads page of the chosen project; on a milestone page, open the Milestones page of the chosen project.

#### Scenario: Choose on the Beads page
- GIVEN the Beads page at `/beads?project=a&view=board&milestone=m1&status=open`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/beads?project=b&view=board` and the Board of `b` is shown

#### Scenario: Choose on My Tasks
- GIVEN the My Tasks page at `/my-tasks?project=a&closed=1&milestone=m1`
- WHEN the user chooses project `b` in the switcher
- THEN the URL becomes `/my-tasks?project=b&closed=1` and the tasks of `b` are shown

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

#### Scenario: Choose on Overview
- GIVEN the Overview page is shown and the current project is `a`
- WHEN the user chooses project `b`
- THEN the URL stays `/`, the page shows the same lists, and the Beads link goes to `/beads?project=b`

#### Scenario: Choose on a change page
- GIVEN the change page `/requirements/changes/e1-login?project=a`
- WHEN the user chooses project `b`
- THEN the URL becomes `/requirements/changes?project=b`

### REQ-UI-124: Current project
<!-- base: e7f9eed58b5b306fdb5ea15357589e58942786287ab923ee8cc720853685fa89 -->
The frontend SHALL take the current project, in this order: from the `project` query of the URL when it names a configured project whose directory exists; else the project last chosen in this browser tab; else the favorite project; else the first configured project. It SHALL remember as last chosen, for the browser tab, the project the Beads, My Tasks, Milestones, Requirements, Reports, bead or milestone page shows and a project chosen in the switcher, and SHALL remember the favorite across tabs and visits. The Main navigation links Beads, My Tasks, Milestones, Requirements and Reports SHALL carry `?project=<current project>`. WHEN the Beads, My Tasks, Milestones, Requirements or Reports page opens without `project`, it SHALL show the current project and write it into the URL without adding a history entry. A remembered or favorite project that is no longer configured SHALL be skipped. IF the browser refuses to store a choice, THEN the choice SHALL last for the visit without an error.

#### Scenario: Links carry the project
- GIVEN the current project is `b`
- WHEN any page is shown
- THEN the Beads link goes to `/beads?project=b`, Milestones to `/milestones?project=b`, My Tasks to `/my-tasks?project=b`, Requirements to `/requirements?project=b`, and Reports to `/reports?project=b`

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

#### Scenario: My Tasks of the current project
- GIVEN the current project is `b`
- WHEN the user opens `/my-tasks`
- THEN the My Tasks page of `b` is shown and the URL becomes `/my-tasks?project=b`

#### Scenario: Storage refused
- GIVEN the browser throws when a choice is stored
- WHEN the user chooses project `b` and opens Milestones
- THEN the Milestones page of `b` is shown and no error is shown

### REQ-UI-126: Unknown project
<!-- base: a9ca80b7feceadc41d0d2006a1f8cb2dd2cd7a58adca900a5534a2096736c881 -->
WHEN the URL names a project that is not configured, in the `project` query of the Beads, My Tasks, Milestones, Requirements or Reports page or in the path of a bead or milestone page, the frontend SHALL show "No project <name> is configured" with one link per configured project to the same page for that project, instead of another project's data, and SHALL NOT remember the name as the current project. The Reports value `all` is not a project name.

#### Scenario: Beads query
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/beads?project=a` and `/beads?project=b`, and shows no beads

#### Scenario: My Tasks query
- GIVEN projects `a` and `b`
- WHEN the user opens `/my-tasks?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/my-tasks?project=a` and `/my-tasks?project=b`, and lists no tasks

#### Scenario: Bead path
- GIVEN projects `a` and `b`
- WHEN the user opens `/beads/zzz/z-1`
- THEN the page says "No project zzz is configured" and the current project is unchanged

#### Scenario: Requirements query
- GIVEN projects `a` and `b`
- WHEN the user opens `/requirements/matrix?project=zzz`
- THEN the page says "No project zzz is configured" with links to `/requirements/matrix?project=a` and `/requirements/matrix?project=b`, and shows no requirements

## REMOVED
