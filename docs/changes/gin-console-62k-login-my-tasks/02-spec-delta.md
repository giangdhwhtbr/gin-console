# Spec Delta: Login my tasks

## ADDED

### REQ-UI-097: Email login
WHILE the browser holds no email for the console, the frontend SHALL show, at every URL, a login screen with one email field and a "Continue" control instead of the navigation and the page; WHEN the user submits a value that, trimmed, has text before and after one `@` and no whitespace, the frontend SHALL keep it lower-cased in localStorage under `gin-console.email` and show the page of the current URL without a full reload; IF the value is not such an email, THEN the frontend SHALL keep the login screen and say the email is not valid; IF the browser refuses to store the email, THEN the frontend SHALL keep it for the current visit without an error. The email SHALL NOT be sent to the server.

#### Scenario: First visit
- GIVEN localStorage has no `gin-console.email`
- WHEN the user opens `/beads?project=gin-console`
- THEN the login screen is shown and no navigation is shown

#### Scenario: Sign in
- GIVEN the login screen is shown at `/beads?project=gin-console`
- WHEN the user submits " Giangdhwhtbr@Gmail.com "
- THEN localStorage holds `giangdhwhtbr@gmail.com`, the URL is unchanged and the Beads page is shown

#### Scenario: Invalid email
- GIVEN the login screen is shown
- WHEN the user submits "giang"
- THEN the login screen stays and says the email is not valid, and nothing is stored

#### Scenario: Remembered
- GIVEN localStorage holds `giangdhwhtbr@gmail.com`
- WHEN the user reloads any page
- THEN the page is shown without the login screen

#### Scenario: Storage refused
- GIVEN writing localStorage throws
- WHEN the user submits a valid email
- THEN the page is shown for this visit and no error is shown

### REQ-UI-098: Log out
WHILE an email is held, the frontend SHALL show it in the "Main" navigation's sidebar (its first letter only on the icon rail, the full email as the control's accessible name) with a "Log out" control, and WHEN the user activates "Log out", SHALL remove `gin-console.email` from localStorage and show the login screen without changing the URL.

#### Scenario: Email shown
- GIVEN the user signed in as `giangdhwhtbr@gmail.com`
- WHEN any page is shown at 1280px with the sidebar expanded
- THEN the sidebar shows `giangdhwhtbr@gmail.com` and a "Log out" control

#### Scenario: Log out
- GIVEN the user is signed in on `/my-tasks`
- WHEN the user activates "Log out"
- THEN localStorage has no `gin-console.email`, the URL is `/my-tasks` and the login screen is shown

### REQ-UI-099: My Tasks navigation
The "Main" navigation SHALL contain a "My Tasks" link after "Beads", and the frontend SHALL show the My Tasks page at `/my-tasks` without a full reload, marking the link as current there.

#### Scenario: Open My Tasks
- GIVEN the Projects page is shown
- WHEN the user clicks "My Tasks"
- THEN the URL is `/my-tasks`, the My Tasks page is shown without a reload and "My Tasks" is the current link

### REQ-UI-100: My Tasks list
WHEN the My Tasks page opens, the frontend SHALL request `GET /api/projects`, then `GET /api/beads?project=<name>` for each project whose directory exists, and SHALL list in one table the beads whose `assignee`, trimmed and ignoring case, equals the signed-in email or the part of the email before `@`, leaving out beads matched only by `owner`. Each row SHALL show the project, the id, the title, the state, the type, `P<n>` and the updated time, and SHALL link to `/beads/<project>/<id>`. Rows SHALL be ordered by priority ascending, then by `updated_at` newest first, then by project and id. The page SHALL show how many beads it lists, and WHEN none matches, SHALL say "No tasks assigned to <email>". The Refresh control (REQ-UI-096) SHALL load the list again.

#### Scenario: Match by email or name
- GIVEN the signed-in email `giangdhwhtbr@gmail.com`, project A with open beads assigned to `giangdhwhtbr`, `GiangDHWHTBR@gmail.com` and `alice`, and one unassigned open bead owned by `giangdhwhtbr@gmail.com`
- WHEN My Tasks opens
- THEN only the beads assigned to `giangdhwhtbr` and `GiangDHWHTBR@gmail.com` are listed, and the count is 2

#### Scenario: Across projects in order
- GIVEN project A has a P2 bead assigned to me updated today and project B has a P1 bead assigned to me updated last week
- WHEN My Tasks opens
- THEN the B bead is first, each row shows its project, and clicking the A bead opens `/beads/A/<id>`

#### Scenario: Nothing assigned
- GIVEN no bead in any project is assigned to `giangdhwhtbr@gmail.com` or `giangdhwhtbr`
- WHEN My Tasks opens
- THEN the page says "No tasks assigned to giangdhwhtbr@gmail.com"

#### Scenario: Missing project directory
- GIVEN project C is configured but its directory does not exist
- WHEN My Tasks opens
- THEN no beads request is sent for C

### REQ-UI-101: My Tasks closed beads
The My Tasks page SHALL leave closed beads out by default, and SHALL offer a "Show closed" control kept in the URL as `closed=1` that requests each project's beads with `closed=1` and lists the matching closed beads too.

#### Scenario: Closed hidden
- GIVEN 3 open and 2 closed beads assigned to me
- WHEN My Tasks opens at `/my-tasks`
- THEN 3 beads are listed and every beads request lacks `closed=1`

#### Scenario: Show closed
- GIVEN the same beads
- WHEN the user turns on "Show closed"
- THEN the URL is `/my-tasks?closed=1`, the beads are requested with `closed=1` and 5 beads are listed

### REQ-UI-102: My Tasks failures
IF `GET /api/projects` fails, THEN the My Tasks page SHALL show that the projects could not be loaded; IF the beads request of a project fails, THEN the page SHALL show an error naming that project and its message and SHALL still list the matching beads of the other projects; WHILE requests are pending, the page SHALL say it is loading.

#### Scenario: One project fails
- GIVEN projects A and B, where the beads request of B responds 500 and A has 2 beads assigned to me
- WHEN My Tasks opens
- THEN an error names B and the 2 beads of A are listed

#### Scenario: Projects fail
- GIVEN `GET /api/projects` responds 500
- WHEN My Tasks opens
- THEN the page says the projects could not be loaded and lists nothing

## MODIFIED

## REMOVED
