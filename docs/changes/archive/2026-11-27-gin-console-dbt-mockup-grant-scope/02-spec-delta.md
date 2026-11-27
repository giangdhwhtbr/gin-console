# Spec Delta: Mockup grant per folder and strict mockup CSP

## ADDED

## MODIFIED

### REQ-AUTH-002: Sign in
<!-- base: a39796dcdcec3f12dd8e2d8d97e0f657329602857bf055ee36f4e9ce6ab42dfa -->
WHILE auth is on, WHEN a client posts `{"username", "password"}` to `/api/auth/login` and the password matches the user's hash, the console SHALL create a session for that user, set a `gin_console_session` cookie holding a random token of at least 32 bytes with `HttpOnly`, `SameSite=Strict`, `Path=/` and `Max-Age` equal to `auth.session_ttl`, plus `Secure` when the request scheme is `https`, and answer 200 with the user's `name`, `email`, and allowed project names; `GET /api/auth/me` with that cookie SHALL answer `{"enabled": true, "user": {...}}` with the same fields, and without a valid session `{"enabled": true, "user": null}`.

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

#### Scenario: No grant in the user
- GIVEN a client signed in as `an`
- WHEN it calls `GET /api/auth/me`
- THEN `user` has no `mockup_grant` field

### REQ-AUTH-016: Mockup file grant
<!-- base: d91a919b3b61c894d4f11d3581924a968611d1a81e2622a8e3dde3577ec94527 -->
WHILE auth is on, each session SHALL hold a grant id and a secret grant key of at least 32 random bytes, neither equal to the session token, and the grant key SHALL never leave the server; the grant of a mockup folder SHALL be `<grant id>.<mac>`, where `<mac>` is the unpadded base64url HMAC-SHA256 of `<project>/<capability>/<date>` under the grant key, and `GET /api/requirements/mockups?project=<name>` SHALL return it as `grant` on each mockup (REQ-REQUIREMENTS-009). The frontend SHALL load a mockup's files from `/api/requirements/mockups/<project>/g/<grant>/files/<capability>/<date>/...` with that mockup's grant, so the files a sandboxed mockup loads, which carry no session cookie, are still served. A request on that path SHALL be served only when the grant id names a live session, the mac matches the `<project>`, `<capability>` and `<date>` of the path, and the session's user is allowed `<project>` (REQ-AUTH-007); otherwise, including a malformed grant, it SHALL answer 404 with one body. A grant SHALL grant nothing but GET requests of that path. WHILE auth is off, the grant path SHALL answer 404 and `grant` SHALL be `null`.

#### Scenario: Styled mockup
- GIVEN user `an` signed in, allowed project `a`, and a confirmed mockup `ui/2026-11-22` of `a` with `style.css`
- WHEN the mockup page loads `style.css` through its grant without a cookie
- THEN the file is served

#### Scenario: Grant of another folder
- GIVEN `an`'s grant of `ui/2026-11-22` in project `a` and a second confirmed folder `reports/2026-11-12` of `a`
- WHEN `/api/requirements/mockups/a/g/<that grant>/files/reports/2026-11-12/index.html` is requested
- THEN the response is 404

#### Scenario: Other project
- GIVEN `an`'s grant of a folder in `a` and project `b`, which `an` may not see
- WHEN the grant path of `b` is requested with it
- THEN the response is 404

#### Scenario: Ended session
- GIVEN `an` signed out
- WHEN an old grant path is requested
- THEN the response is 404

#### Scenario: Malformed grant
- GIVEN auth on
- WHEN the grant path is requested with `abc`, with a valid grant id and a wrong mac, or with the session token
- THEN each answers 404

#### Scenario: Grant is not a session
- GIVEN a mockup grant used as the `gin_console_session` cookie
- WHEN a client calls `GET /api/overview`
- THEN the response is 401

#### Scenario: Auth off
- GIVEN auth off
- WHEN the mockup list is requested
- THEN every mockup has `grant` null and the files load from the path without `g/`

### REQ-REQUIREMENTS-009: Confirmed mockups
<!-- base: 682ff794060fd0b649c2520653d51942f3eea4885d3b405ae4102342a7349e85 -->
WHEN a client requests `GET /api/requirements/mockups?project=<name>`, the server SHALL return each folder `docs/specs/<capability>/assets/<YYYY-MM-DD>/` whose `description.md` has a line `Confirmed: <YYYY-MM-DD>` and which holds at least one HTML or image file, newest first within each capability, with the capability, the date, the confirmation date, the person of `Confirmed by:` when given, the description text, the HTML and image file paths, the ids of the living requirements whose `Source:` line points into the folder, and the folder's `grant` for the signed-in session, `null` while auth is off (REQ-AUTH-016). Folders that are not confirmed SHALL be left out.

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

#### Scenario: Grant per folder
- GIVEN auth on, a signed-in user, and two confirmed folders of one project
- WHEN the list is requested
- THEN each folder has its own `grant`, and the two differ

### REQ-REQUIREMENTS-011: Mockup isolation
<!-- base: 9bc2cbb94f61efe7b5592d65d2aa2118152f2d9507ac7aa16d0aee5165d1464e -->
Type: non-functional
Category: security
Every mockup file response SHALL carry `X-Content-Type-Options: nosniff` and the header `Content-Security-Policy` `sandbox allow-scripts; default-src 'self' 'unsafe-inline' data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'`, so a mockup loads only its own files and inline or `data:`/`blob:` content, and nothing from another origin. The frontend SHALL show a mockup only in an iframe whose `sandbox` attribute is exactly `allow-scripts`. A request a mockup makes to any other `/api` path, by any element or script, SHALL be refused (REQ-SERVER-012).

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

#### Scenario: Elements request the API
- GIVEN a mockup with `<img src="/api/projects/beads">` and `<script src="/api/projects/beads">`
- WHEN it is shown in the console or opened in its own tab
- THEN neither request reaches a console endpoint

#### Scenario: Outside resources
- GIVEN a confirmed mockup with `<img src="https://example.com/x.png">` and a stylesheet from `https://fonts.googleapis.com`
- WHEN it is shown in the console
- THEN neither is requested, and its own `style.css` and inline styles still apply

## REMOVED
