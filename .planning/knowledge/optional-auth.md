# Optional sign-in and project access

**Context**
Epic gin-console-hlj (2026-11-27) added optional authentication: `auth.enabled` in `config.yaml` (default off), users in a separate `users.yaml` managed by `python -m gin_console user ...`, and per-user project lists (ADR 0005). With auth off every route behaves as before.

**Decision/Solution**
- Core in `backend/src/gin_console/auth/`:
  - `passwords.py`: stdlib scrypt `scrypt$16384$8$1$...`. Passwords are encoded with `"utf-8", "surrogatepass"`, because a lone surrogate passes `json.loads` and would otherwise raise in `verify`, giving a 500 that the limiter never counts.
  - `users.py`: `UserDirectory` reloads on `(st_ino, st_mtime_ns, st_size)`. It starts unread so the first call reloads, since `user passwd` writes a file of the same size.
  - `sessions.py`: tokens, grant ids and grant keys in memory.
  - `ratelimit.py`: `FailureLimiter.reserve`/`release`. Check and record happen under one lock, before the scrypt verify.
- Login (`auth/router.py`):
  - The body is capped at 4096 bytes, and a username over 64 characters is malformed.
  - IP and user are reserved before verifying. A failure keeps both counts; a success clears the user's count and releases the IP's.
  - The session is created through `AuthState.start_session`, which reloads the users file under the same lock as the session revocation and refuses a user whose hash changed during the verify.
- `projects_of(settings)` gives each router the request's allowed projects. Every resolver looks names up there before any cache, so caches stay keyed by project and a forbidden project answers the same 404 as an unknown one.
- Middleware order: cross-site guard, then `require_session`, then gzip. In Starlette the middleware added last runs first.
- Sandboxed mockups (no `allow-same-origin`) have an opaque origin, so their subresource requests carry no `SameSite` cookie. Mockups load through `/api/requirements/mockups/<project>/g/<grant>/files/...` (REQ-AUTH-016).
  - The grant opens one folder: `<Session.grant>.<mac>`, the unpadded base64url HMAC-SHA256 of `<project>/<capability>/<date>` under `Session.grant_key` (`auth/access.py` `folder_grant`). No grant table: the middleware recomputes the mac from the decoded path and compares with `hmac.compare_digest`.
  - `GET /api/requirements/mockups` returns `grant` per mockup from `request.state.session`, which the middleware sets on the cookie path; `null` while auth is off. Login and `me` return no grant.
  - Every grant failure, also while auth is off, answers the same 404 `{"error": "not found"}` in the middleware, before the router.
- The mockup CSP (`requirements/router.py` `POLICY`) adds `default-src 'self' 'unsafe-inline' data: blob:`, so a mockup loads nothing from another origin (REQ-REQUIREMENTS-011).
- The frontend `app/session.ts` provides `apiFetch`. Every `features/*/api.ts` call uses it, so a 401 returns to sign-in with the open page kept.

**Consequences**
- A restart signs everyone out. Sessions and counters are per process.
- The client IP is uvicorn's: `X-Forwarded-*` is trusted only from `FORWARDED_ALLOW_IPS` (default loopback). Behind any other proxy, set it, or every sign-in counts against the proxy IP and cookies lack `Secure`.
- Tests:
  - FastAPI 0.143 includes routers lazily (`_IncludedRouter`), so `app.routes` holds no `APIRoute`. The route-table guard in `backend/tests/test_auth_access_api.py` walks `fastapi.routing.iter_route_contexts(app.routes)`.
  - Concurrency tests use `httpx.AsyncClient(transport=httpx.ASGITransport(app=app))` with `asyncio.gather` inside `asyncio.run`; no pytest-asyncio is needed.
  - FastAPI GET routes answer 405 to HEAD.
- e2e auth specs need an auth-on console with `rate_limit.per_ip` far above 20 (`qa/guidelines.md`, "Auth e2e server"). They skip without `GIN_E2E_AUTH_USER` and `GIN_E2E_AUTH_PASSWORD`.
- Open follow-ups:
  - gin-console-fsc: Docker does not mount the users file.

**References**
- Code: `backend/src/gin_console/auth/`, `backend/src/gin_console/app.py`, `frontend/src/app/{session.ts,SignInPage.tsx}`, `frontend/src/features/requirements/paths.ts`.
- Decision: `docs/adr/0005-optional-config-auth.md`.
- Change: `docs/changes/archive/2026-11-27-gin-console-hlj-optional-auth/`; the folder grant and strict CSP: `docs/changes/gin-console-dbt-mockup-grant-scope/`.
- Beads: gin-console-hlj (tracks .1–.4), gin-console-dbt.
- Related: [beads-pull](beads-pull.md), which notes the pre-commit hook needs frontend deps in a fresh worktree.

**Scope**
Anything that adds an `/api` route that takes a project, changes the session or login flow, the users file, or how mockups are loaded.
