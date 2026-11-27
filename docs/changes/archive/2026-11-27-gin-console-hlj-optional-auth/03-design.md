# Design: Optional authentication and project access

Epic: gin-console-hlj

## Architecture

Decision record: `docs/adr/0005-optional-config-auth.md` (in-memory sessions, scrypt, a separate users file).

Backend, new context `backend/src/gin_console/auth/`:
- `passwords.py`: `generate() -> str` (`secrets.token_urlsafe(18)`), `hash_password(pw) -> str`, `verify(pw, encoded) -> bool` (`hashlib.scrypt`, `hmac.compare_digest`), `DUMMY_HASH` for unknown users. Stdlib only, no new dependency.
- `users.py`: `User` and `UsersFile` pydantic models (`extra="forbid"`), `load_users(path, project_names)` with the checks of REQ-CONFIG-009, `save_users(path, users)` (temp file `0600` in the same folder, `os.replace`), and `UserDirectory`, which holds the last valid users and reloads when `(st_mtime_ns, st_size)` changes, at most once per request (REQ-AUTH-009). A reload returns the names whose hash changed or that were removed.
- `sessions.py`: `SessionStore(clock, ttl)` with `create(name) -> Session` (`token`, `grant`, `name`, `created`), `by_grant(grant) -> name | None`, `get(token) -> name | None` (expired ones dropped on read), `end(token)`, `end_user(name)`. A dict guarded by a `threading.Lock`; FastAPI runs sync routes in a thread pool.
- `ratelimit.py`: `FailureLimiter(clock, limit, window)`, a deque of failure times per key, with `retry_after(key) -> int | None`, `fail(key)` and `clear(key)`. There are two instances, keyed by username and by IP, and keys with no failures in the window are pruned.
- `access.py`: `AuthState` (directory, sessions, limiters, settings) and the request-scoped `allowed_projects(request) -> list[ProjectEntry]`. While auth is off it returns `settings.projects`. While auth is on it returns the user's projects in config order, from `request.state.user` set by the middleware.
- `router.py`: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. Login reads the body as JSON by hand, so a malformed body gives the 401 of REQ-AUTH-003 and not a 422.
- `cli.py`: the `user` subcommands with `argparse`. It loads the config with `load_settings(resolve_config_path(os.environ))` for `users_file` and project names, then uses `users.py` and `passwords.py`.

Changes to existing code:
- `config.py`: `AuthSettings` and `RateLimitSettings` on `Settings.auth`. Durations reuse the `_DURATION` parsing of `BeadsSettings`, moved into a shared helper. When `enabled` is true, `load_settings` loads the users file once, so a bad file stops startup (REQ-CONFIG-003).
- `app.py`: `create_app` builds an `AuthState` (with an injectable `clock`) and includes the auth router. It adds an `http` middleware *before* the cross-site one, so it runs after it (REQ-AUTH-005): it resolves the cookie to a user, sets `request.state.user`, and answers 401 for `/api/*` outside the open routes. The refresh route pulls `allowed_projects(request)`.
- Project scoping: the four resolvers (`beads/router.py:57`, `milestones/router.py:60`, `requirements/router.py:49`, `reports/router.py:89`) and the two list routes (`projects/router.py:17`, `overview/router.py:36`) take the project list from `allowed_projects(request)` instead of `settings.projects`. Each router gets a `request: Request` parameter, or a `Depends(allowed_projects)`, on the routes that resolve a project. Caches stay keyed by project, and the resolver runs before the cache `get` (REQ-AUTH-007).
- Mockup grant (REQ-AUTH-016):
  - `requirements/router.py` adds the route `/requirements/mockups/{project}/g/{grant}/files/{capability}/{day}/{path:path}`, which calls the same handler as the plain files route.
  - The auth middleware matches `^/api/requirements/mockups/([^/]+)/g/([^/]+)/files/` on GET. It resolves the grant with `SessionStore.by_grant`, sets `request.state.user`, and lets `allowed_projects` do the 404.
  - `app.py` `_MOCKUP_FILES` becomes `/api/requirements/mockups/[^/]+/(?:g/[^/]+/)?files/`.
  - The frontend `features/requirements/paths.ts` inserts `g/<grant>/` when the session has a `mockup_grant`.
- `beads/pull.py`: `PullService.pull_all(names: Iterable[str] | None = None)` pulls only the named projects; the scheduler still calls it with none.
- `__main__.py`: `main(argv)` dispatches `user ...` to `auth/cli.py`; with no arguments it starts the server as today.

Frontend:
- `src/app/session.ts` (new): `fetchMe()`, `signIn()`, `signOut()`, a `useSession()` store, and `apiFetch(input, init)`. `apiFetch` wraps `fetch` and, on a 401 while auth is on, clears the user and keeps the current location for the return (REQ-AUTH-015). The `features/*/api.ts` modules and `RefreshButton.tsx` call `apiFetch` instead of `fetch`. This one-word change per call site leaves their error handling as it is.
- `src/app/App.tsx`: gate on `useSession()`.
  - While `me` is loading, show the loading state.
  - With `enabled` false, keep today's gate (`useEmail()` → `LoginPage`).
  - With `enabled` and no user, show `SignInPage`.
  - With a user, render the app, and `useEmail()` returns the session email.
- `src/app/SignInPage.tsx` (new): a username and password form in the style of `LoginPage.tsx`, with the messages of REQ-AUTH-014.
- `src/app/identity.ts`: with a signed-in user, the email comes from the session, not from localStorage.
- `src/app/Layout.tsx`: the user name and Sign out while auth is on.

## Data Flow

- [Sign-in activity](docs/specs/auth/diagrams/sign-in-activity.md) (use case: [Sign in](docs/specs/auth/use-cases/sign-in.md)).
- [Project access activity](docs/specs/auth/diagrams/project-access-activity.md).
- [Manage users activity](docs/specs/auth/diagrams/manage-users-activity.md) (use case: [Manage users](docs/specs/auth/use-cases/manage-users.md)).
- [Session state](docs/specs/auth/diagrams/session-state.md).
- [Auth settings activity](docs/specs/config/diagrams/auth-settings-activity.md).

Request order, outermost first:
1. The cross-site guard.
2. The auth middleware sets `request.state.user` or answers 401.
3. Gzip.
4. The router. Its resolver calls `allowed_projects`, then the cache, then the source.

## Error Handling

- **Sign-in failures.**
  - A wrong password, an unknown user, or a malformed body answers 401 with one fixed body.
  - An unknown user is still checked against `DUMMY_HASH`.
  - A failure is counted for both the username and the IP. A refusal answers 429 with `Retry-After` and is not counted again.
- **Bad cookies.** A forged, expired or ended token answers 401 `sign-in required`. A cookie that is not text is treated as missing.
- **Bad users file at startup.** The console exits non-zero and names the file. At reload it keeps the last good users and logs an error once per changed `(mtime, size)`.
- **CLI.** Every failure exits 1 with the reason on stderr and writes nothing. A failed write leaves the old file in place, and the temp file is removed in a `finally`.
- **Logs.** Neither passwords nor tokens are logged. A failed sign-in logs the username and IP at `info`.

## Testing

- Unit (pytest):
  - `passwords`: round trip, wrong password, the format, and that `generate` gives 24 characters and different values.
  - `ratelimit` and `sessions`: a fake clock for the window, `Retry-After`, the TTL and `end_user`.
  - `users`: load checks, reload on change, keeping the last good file, the `0600` mode, and an atomic write with a failing rename.
- API (`TestClient` with `create_app(settings, clock=fake)`, in the style of `tests/test_cross_site.py`):
  - REQ-AUTH-001 (existing suites keep running with auth off).
  - REQ-AUTH-002 to REQ-AUTH-009 on login, me, logout and the middleware.
  - REQ-AUTH-007: every project route is listed once in a table-driven test, so a new route without the check fails it.
  - REQ-AUTH-008: refresh with `FakeBd`, which records the pulled projects.
- CLI: `auth/cli.py` `main(argv)` run against a `tmp_path` config and users file, with output captured (REQ-AUTH-010 to REQ-AUTH-013).
- Config: REQ-CONFIG-009 in `tests/test_config.py`.
- Frontend (vitest):
  - `session.ts`: `apiFetch` on a 401.
  - `SignInPage`: the 401 and 429 messages.
  - `App` gating: auth off shows the email screen, auth on shows sign-in.
  - Return to the open page after sign-in.
- REQ-AUTH-016: grant path served without a cookie, 404 for other projects and ended sessions, grant refused as a cookie; existing REQ-SERVER-012 and REQ-REQUIREMENTS-010 tests unchanged.
- Every test names its REQ-ID.

## Open Technical Questions
