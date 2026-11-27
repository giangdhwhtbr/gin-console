# Auth

## Purpose

## Diagrams

- [manage-users-activity](diagrams/manage-users-activity.md)
- [mockup-grant-activity](diagrams/mockup-grant-activity.md)
- [project-access-activity](diagrams/project-access-activity.md)
- [session-state](diagrams/session-state.md)
- [sign-in-activity](diagrams/sign-in-activity.md)

## Use Cases

- [manage-users](use-cases/manage-users.md)
- [sign-in](use-cases/sign-in.md)

## Requirements

### REQ-AUTH-001: Auth off by default
WHILE `auth.enabled` is `false`, the console SHALL serve every route as it does without the `auth` section, with no session and no cookie, and `GET /api/auth/me` SHALL answer `{"enabled": false, "user": null}`.

#### Scenario: No auth section
- GIVEN a config without `auth`
- WHEN a client calls `GET /api/projects/beads` without a cookie
- THEN the response is 200 and lists every configured project

#### Scenario: Me while off
- GIVEN auth off
- WHEN a client calls `GET /api/auth/me`
- THEN the response is 200 with `enabled` false and `user` null

#### Scenario: Login while off
- GIVEN auth off
- WHEN a client posts to `/api/auth/login`
- THEN the response is 404

### REQ-AUTH-002: Sign in
WHILE auth is on, WHEN a client posts `{"username", "password"}` to `/api/auth/login` and the password matches the user's hash, the console SHALL create a session for that user, set a `gin_console_session` cookie holding a random token of at least 32 bytes with `HttpOnly`, `SameSite=Strict`, `Path=/` and `Max-Age` equal to `auth.session_ttl`, plus `Secure` when the request scheme is `https`, and answer 200 with the user's `name`, `email`, allowed project names and `mockup_grant` (REQ-AUTH-016); `GET /api/auth/me` with that cookie SHALL answer `{"enabled": true, "user": {...}}` with the same fields, and without a valid session `{"enabled": true, "user": null}`.

#### Scenario: Right password
- GIVEN auth on and user `an` with password `P`
- WHEN a client posts `{"username": "an", "password": "P"}`
- THEN the response is 200 with `an`'s name, email and projects and sets an `HttpOnly`, `SameSite=Strict` session cookie

#### Scenario: Me after sign-in
- GIVEN a client signed in as `an`
- WHEN it calls `GET /api/auth/me`
- THEN `user.name` is `an`

#### Scenario: Me before sign-in
- GIVEN auth on
- WHEN a client calls `GET /api/auth/me` without a cookie
- THEN the response is 200 with `enabled` true and `user` null

#### Scenario: Username case
- GIVEN user `an`
- WHEN a client signs in as `An` with the right password
- THEN the sign-in succeeds

### REQ-AUTH-003: Failed sign-in
Type: non-functional
Category: security
IF the username is unknown, the password is wrong, or the body is malformed, THEN `/api/auth/login` SHALL answer 401 with the same body `{"error": "invalid username or password"}`, set no cookie, and for an unknown username SHALL still verify the password against a fixed dummy scrypt hash, so the answer does not tell an unknown user from a wrong password; the password SHALL never be logged.

#### Scenario: Wrong password
- GIVEN user `an`
- WHEN a client signs in as `an` with a wrong password
- THEN the response is 401 with `invalid username or password` and no cookie

#### Scenario: Unknown user
- GIVEN no user `bo`
- WHEN a client signs in as `bo`
- THEN the response is 401 with the same body, after a scrypt verification

#### Scenario: Malformed body
- GIVEN auth on
- WHEN a client posts `{"username": "an"}` without a password
- THEN the response is 401 with the same body

### REQ-AUTH-004: Sign-in rate limit
Type: non-functional
Category: security
The console SHALL count failed sign-ins in memory per lower-cased username and per client IP (the address uvicorn reports) over a sliding window of `auth.rate_limit.window`; WHILE a username has `per_user` failures or an IP has `per_ip` failures inside the window, `/api/auth/login` for that username or from that IP SHALL answer 429 with `{"error": "too many attempts"}` and a `Retry-After` header in whole seconds until the oldest counted failure leaves the window, without checking the password. A successful sign-in SHALL clear that username's failures and SHALL NOT clear the IP's.

#### Scenario: Username locked
- GIVEN `per_user` 5 and 5 failed sign-ins as `an` within the window
- WHEN a client signs in as `an` with the right password
- THEN the response is 429 with a `Retry-After` header and no cookie

#### Scenario: IP locked
- GIVEN `per_ip` 20 and 20 failed sign-ins from one IP for different usernames
- WHEN that IP signs in as any user
- THEN the response is 429

#### Scenario: Window passes
- GIVEN `an` locked by 5 failures
- WHEN the window has passed since the oldest failure
- THEN a sign-in with the right password succeeds

#### Scenario: Success resets the user
- GIVEN 4 failed sign-ins as `an`
- WHEN `an` signs in with the right password, then fails 4 more times
- THEN the next attempt is checked, not answered 429

### REQ-AUTH-005: API requires a session
WHILE auth is on, the console SHALL answer 401 with `{"error": "sign-in required"}` to every `/api` request without a valid session cookie, except `GET /api/health`, `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout` (REQ-AUTH-006) and GET requests on a mockup grant path, which REQ-AUTH-016 checks; the cross-site refusal (REQ-SERVER-012) SHALL run before this check, and requests outside `/api` (the built frontend) SHALL be served without a session.

#### Scenario: No cookie
- GIVEN auth on
- WHEN a client calls `GET /api/overview` without a cookie
- THEN the response is 401 with `sign-in required`

#### Scenario: Open routes
- GIVEN auth on
- WHEN a client calls `GET /api/health` without a cookie
- THEN the response is 200

#### Scenario: Frontend served
- GIVEN auth on
- WHEN a client requests `/` without a cookie
- THEN the built `index.html` is served

#### Scenario: Forged token
- GIVEN auth on
- WHEN a client calls `GET /api/overview` with a cookie no session holds
- THEN the response is 401

### REQ-AUTH-006: Session end
A session SHALL end when `auth.session_ttl` has passed since sign-in, when the user posts to `/api/auth/logout`, when the console restarts, or when its user is removed or gets a new password (REQ-AUTH-009); a request with an ended session SHALL be treated as having none. `POST /api/auth/logout` SHALL answer 204 and clear the cookie, with or without a valid session.

#### Scenario: Expired
- GIVEN a session created 12 hours ago with `session_ttl` 12h
- WHEN the client calls `GET /api/overview`
- THEN the response is 401

#### Scenario: Sign out
- GIVEN a client signed in as `an`
- WHEN it posts to `/api/auth/logout` and then reuses the old cookie
- THEN the logout answers 204 and the next request answers 401

### REQ-AUTH-007: Project access
WHILE auth is on, a signed-in user SHALL see only the projects listed in their `projects`, or every configured project when it is `"*"`: `GET /api/projects/beads` and `GET /api/overview` SHALL list only those projects, and every route that takes a project by path or by `project` query parameter (beads, milestones, requirements, reports, mockup files) SHALL answer 404, the same as an unknown project, for any other project; project data caches SHALL be shared between users, and the check SHALL run before a cache is read.

#### Scenario: Filtered lists
- GIVEN projects `a` and `b` and user `an` with projects `[a]`
- WHEN `an` calls `GET /api/projects/beads` and `GET /api/overview`
- THEN only `a` is listed

#### Scenario: Other project
- GIVEN user `an` with projects `[a]`
- WHEN `an` calls `GET /api/beads?project=b`, `GET /api/milestones/b/wbs` or `GET /api/reports?project=b`
- THEN each answers 404

#### Scenario: All projects
- GIVEN user `root` with projects `"*"`
- WHEN `root` calls `GET /api/projects/beads`
- THEN every configured project is listed

#### Scenario: Shared cache
- GIVEN `root` has loaded `GET /api/beads?project=b`, so it is cached
- WHEN `an`, with projects `[a]`, calls the same route
- THEN the response is 404

### REQ-AUTH-008: Refresh within access
WHILE auth is on, `POST /api/refresh` SHALL pull only the signed-in user's allowed projects that have `pull` on (REQ-CONFIG-006) and drop the cached answers; the scheduled pull SHALL keep pulling every project.

#### Scenario: Own projects only
- GIVEN projects `a` and `b` and user `an` with projects `[a]`
- WHEN `an` posts to `/api/refresh`
- THEN `bd dolt pull` runs in `a` only

### REQ-AUTH-009: User changes apply while running
WHILE auth is on, the console SHALL read the users file again when its modification time or size changes, at most once per request; after a reload, sessions of a removed user or of a user whose password hash changed SHALL end, and every other session SHALL use the user's new projects and email. IF the changed file does not parse or fails the checks of REQ-CONFIG-009, THEN the console SHALL keep the last valid users and log one error naming the file.

#### Scenario: Password reset
- GIVEN `an` signed in and the operator runs `user passwd an`
- WHEN `an` calls `GET /api/overview`
- THEN the response is 401

#### Scenario: Project unassigned
- GIVEN `an` signed in with projects `[a, b]` and the operator runs `user unassign an b`
- WHEN `an` calls `GET /api/beads?project=b`
- THEN the response is 404

#### Scenario: Broken file
- GIVEN the users file is edited into invalid YAML
- WHEN a signed-in user calls an API route
- THEN the last valid users still apply and one error is logged

### REQ-AUTH-010: Create a user
WHEN the operator runs `python -m gin_console user add <name> --email <email> (--project <p>... | --all-projects)`, the console SHALL generate a password with `secrets.token_urlsafe(18)`, store the user with its scrypt hash in the users file (REQ-AUTH-013), print the password once on standard output and exit 0; IF the name is taken or does not match `[a-z0-9][a-z0-9._-]{0,63}` after lower-casing, the email is not `<x>@<y>`, a project is not in `projects`, or neither `--project` nor `--all-projects` is given, THEN it SHALL write nothing, print the reason on standard error and exit 1. There SHALL be no option to pass a password.

#### Scenario: Created
- GIVEN project `a` in the config and no user `an`
- WHEN the operator runs `user add an --email an@x.io --project a`
- THEN the users file holds `an` with a `scrypt$` hash, the password is printed once, and it signs in

#### Scenario: Unknown project
- GIVEN no project `ghost`
- WHEN the operator runs `user add an --email an@x.io --project ghost`
- THEN it exits 1 naming `ghost` and the file is unchanged

#### Scenario: Name taken
- GIVEN user `an` exists
- WHEN the operator runs `user add an --email other@x.io --all-projects`
- THEN it exits 1 and the file is unchanged

### REQ-AUTH-011: Reset a password
WHEN the operator runs `python -m gin_console user passwd <name>`, the console SHALL generate a new password as in REQ-AUTH-010, replace the user's hash, print the password once and exit 0; IF the user does not exist, THEN it SHALL exit 1 and write nothing.

#### Scenario: Reset
- GIVEN user `an` with password `P`
- WHEN the operator runs `user passwd an`
- THEN a new password is printed, it signs in, and `P` does not

#### Scenario: Unknown user
- GIVEN no user `bo`
- WHEN the operator runs `user passwd bo`
- THEN it exits 1

### REQ-AUTH-012: Assign, unassign, remove, list
The CLI SHALL provide `user assign <name> <project>...` and `user unassign <name> <project>...`, which add or remove project names in the user's list (`assign` with `--all` sets `"*"`; `unassign` of a user with `"*"` is refused with a message to assign the projects to keep), `user remove <name>`, which deletes the user, and `user list`, which prints one line per user with name, email and projects and never a hash; IF a named user or project does not exist, THEN the command SHALL exit 1 and write nothing. An unassign that leaves no project SHALL be allowed; that user then sees no project.

#### Scenario: Assign and unassign
- GIVEN user `an` with projects `[a]` and project `b` in the config
- WHEN the operator runs `user assign an b`, then `user unassign an a`
- THEN `an`'s projects are `[b]`

#### Scenario: Remove
- GIVEN user `an`
- WHEN the operator runs `user remove an`
- THEN `an` is no longer in the users file

#### Scenario: List
- GIVEN users `an` and `root`
- WHEN the operator runs `user list`
- THEN both are printed with their email and projects and no output contains `scrypt$`

### REQ-AUTH-013: Users file
Type: non-functional
Category: security
The CLI SHALL keep users in `auth.users_file` as YAML `users: [{name, email, password_hash, projects}]`, with `password_hash` as `scrypt$<n>$<r>$<p>$<salt b64>$<hash b64>` (n=2^14, r=8, p=1, 16-byte random salt, 64-byte key), create its folder if missing, and write the file by writing a temporary file with mode `0600` in the same folder and renaming it over the old one; a password SHALL never be written to the file, a log, or any output other than the one print of REQ-AUTH-010 and REQ-AUTH-011.

#### Scenario: Mode and format
- GIVEN no users file
- WHEN the operator runs `user add an --email an@x.io --all-projects`
- THEN the file has mode `0600` and `an`'s `password_hash` starts with `scrypt$16384$8$1$`

#### Scenario: Atomic write
- GIVEN a users file with `an`
- WHEN a write fails before the rename
- THEN the old file is unchanged

### REQ-AUTH-014: Sign-in screen
WHILE `GET /api/auth/me` answers `enabled` true and `user` null, the frontend SHALL show a sign-in screen with username and password fields instead of the email screen and SHALL load no other API data; on 401 it SHALL show "Wrong username or password", on 429 "Too many attempts. Try again in <n> minutes" from `Retry-After`; once signed in, My work SHALL use the user's email from the server, the header SHALL show the user's name and a Sign out action, and Sign out SHALL post to `/api/auth/logout` and return to the sign-in screen. WHILE auth is off, the email screen of today SHALL stay.

#### Scenario: Sign in
- GIVEN auth on and no session
- WHEN the user opens the console, enters a right username and password and submits
- THEN the console opens and My work shows that user's email's work

#### Scenario: Wrong password
- GIVEN the sign-in screen
- WHEN the user submits a wrong password
- THEN "Wrong username or password" is shown and the fields stay

#### Scenario: Locked
- GIVEN the server answers 429 with `Retry-After: 600`
- WHEN the user submits
- THEN "Too many attempts. Try again in 10 minutes" is shown

#### Scenario: Auth off
- GIVEN auth off
- WHEN the user opens the console without a stored email
- THEN the email screen is shown

### REQ-AUTH-015: Session lost in the browser
WHILE auth is on, WHEN any API request of the frontend answers 401, the frontend SHALL drop the signed-in user and show the sign-in screen, and after the next sign-in SHALL return to the page that was open.

#### Scenario: Expired while open
- GIVEN a signed-in user on a beads page whose session expires
- WHEN the page loads data
- THEN the sign-in screen is shown, and after signing in the beads page is shown again

### REQ-AUTH-016: Mockup file grant
WHILE auth is on, sign-in SHALL also create a mockup grant, a random token of at least 32 bytes different from the session token, that ends with its session; `POST /api/auth/login` and `GET /api/auth/me` SHALL return it as `user.mockup_grant`, and the frontend SHALL load mockups from `/api/requirements/mockups/<project>/g/<grant>/files/...`, so the files a sandboxed mockup loads, which carry no session cookie, are still served. A request on that path SHALL be served only when the grant belongs to a live session whose user is allowed `<project>` (REQ-AUTH-007), and SHALL otherwise answer 404; a grant SHALL grant nothing but GET requests of that path. WHILE auth is off, the grant path SHALL answer 404 and `mockup_grant` SHALL be absent.

#### Scenario: Styled mockup
- GIVEN user `an` signed in, allowed project `a`, and a confirmed mockup of `a` with `style.css`
- WHEN the mockup page loads `style.css` through the grant path without a cookie
- THEN the file is served

#### Scenario: Other project
- GIVEN `an`'s grant and project `b`, which `an` may not see
- WHEN `/api/requirements/mockups/b/g/<grant>/files/...` is requested
- THEN the response is 404

#### Scenario: Ended session
- GIVEN `an` signed out
- WHEN the old grant path is requested
- THEN the response is 404

#### Scenario: Grant is not a session
- GIVEN `an`'s grant used as the `gin_console_session` cookie
- WHEN a client calls `GET /api/overview`
- THEN the response is 401
