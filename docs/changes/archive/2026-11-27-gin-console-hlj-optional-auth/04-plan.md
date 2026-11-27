# Plan: Optional authentication and project access

Epic: gin-console-hlj
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. ADR: `docs/adr/0005-optional-config-auth.md`. Diagrams: `docs/specs/auth/diagrams/sign-in-activity.md`, `project-access-activity.md`, `manage-users-activity.md`, `session-state.md`, `docs/specs/config/diagrams/auth-settings-activity.md`. Use cases: `docs/specs/auth/use-cases/sign-in.md`, `manage-users.md`.

## Objective

An operator can turn on sign-in in `config.yaml`, manage users and their projects with `python -m gin_console user ...`, and every signed-in user reads only their projects; with auth off the console behaves as today.

Done when:
- Every scenario of the 17 added REQs (`REQ-CONFIG-009`, `REQ-AUTH-001` to `REQ-AUTH-016`) and the new scenarios of the 2 modified REQs (`REQ-SERVER-012`, `REQ-REQUIREMENTS-010`) have a test naming the REQ-ID.
- `uv --directory backend run pytest`, `ruff check .`, and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint`, and `build` pass.
- `gin specs lint --change gin-console-hlj --against master` prints `ok`, `gin specs trace --change gin-console-hlj` reports no missing REQ, and `gin-qa cases check --change gin-console-hlj` prints `ok`.

## Route Rubric
- Choose the weakest model that can do the work.
- Raise the model for broad context or design judgement.
- Raise the effort for intrinsic difficulty: intricate logic, many edge cases, or long chains of steps.

| Kind of work | Model | Effort |
|---|---|---|
| Mechanical edits, documentation, boilerplate | weakest | `low` |
| Bounded implementation with a clear spec | middle | `medium` |
| Cross-module change, security, migration, concurrency | strongest | `high` |

Unclear requirements never raise the model or effort.

## Requirement Analysis
- **Problem statement:**
  - The console has no authentication. The README warning says so, and `README.md:207-209` tells operators to keep it on loopback.
  - Every router closes over `settings.projects`, so there is no per-request place to narrow the visible projects:
    - the resolvers at `beads/router.py:70-77`, `milestones/router.py:60-64`, `requirements/router.py:49-53` and `reports/router.py:89-93`;
    - the lists at `projects/router.py:17-22` and `overview/router.py:36-43`.
  - `POST /api/refresh` (`app.py:119-124`) pulls every project.
  - The frontend "login" (`frontend/src/app/LoginPage.tsx`, `identity.ts`) only keeps an email in localStorage.
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints** (from the spec and the user decisions of 2026-11-27):
  - **Off by default:** without `auth`, or with `auth.enabled: false`, every route, test and screen behaves as today. Existing tests pass unchanged.
  - **Read-only:** nothing is written to projects or Beads. The CLI writes only `auth.users_file`.
  - **Users file:** separate from `config.yaml`, mode `0600`, written atomically (temp file in the same folder, then `os.replace`), and reloaded by the running console when `(st_mtime_ns, st_size)` changes.
  - **Passwords:** generated only (`secrets.token_urlsafe(18)`) and printed once. Hashes are `scrypt$16384$8$1$<salt b64>$<hash b64>` from stdlib `hashlib.scrypt`, verified with `hmac.compare_digest`. A dummy hash is checked for unknown users. No new dependency.
  - **Sessions:** a random token of at least 32 bytes, kept in memory and guarded by a lock.
    - Cookie `gin_console_session`: `HttpOnly`, `SameSite=Strict`, `Path=/`, `Max-Age` equal to the TTL, plus `Secure` on `https`.
    - A session ends at the TTL, on logout, on restart, or when its user is removed or reset.
  - **Rate limit:** in memory, failed sign-ins only, per lower-cased username and per client IP (`request.client.host`), over a sliding window.
    - At the limit the answer is 429 with `Retry-After`, and the password is not checked.
    - A success clears the username's failures only.
  - **Access:** a project outside the user's list answers 404, the same as an unknown project. The check runs before any cache. Caches stay keyed by project.
  - **Open routes while auth is on:** `GET /api/health`, `POST /api/auth/login`, `GET /api/auth/me`, and GETs on the mockup grant path. Everything else under `/api` answers 401 `sign-in required`. Non-API paths are served.
  - **Middleware order:** the cross-site guard runs first, then auth, then gzip, then the routers.
  - **Mockup grant:** a second random token per session, returned as `user.mockup_grant`. It is accepted only on `GET /api/requirements/mockups/<project>/g/<grant>/files/...`, never as a cookie.
  - **Secrets stay out of output:** no password or token in logs or in the users file. `user list` never prints a hash.
  - **Platforms:** Linux, macOS and native Windows keep working. On Windows, `0600` is best effort: `os.chmod` there sets only the read-only flag.
- **Non-goals:** OIDC/SSO, proxy identity headers, access inside a project, sessions across restarts, user management in the UI, roles.

## Approach Options
### Option 1: Auth context, request-scoped project list, separate tracks per layer
- **Summary:**
  - Track 1 builds the auth core: config, passwords, users file, sessions, rate limiter, and the CLI.
  - Track 2 wires it into the app: middleware, routes, `allowed_projects` in every router, refresh, and the mockup grant route.
  - Track 3 builds the frontend against the API contract of this plan, in parallel with Track 1.
  - Track 4 writes the QA cases and e2e specs.
- **Pros:**
  - The core is pure and unit-testable with a fake clock.
  - One dependency decides the visible projects for every route.
  - Tracks 1 and 3 share no file.
- **Cons:** Track 2 touches six routers. Each change is a one-line swap of `settings.projects` for the request's list.

### Option 2: Path-matching middleware only
- **Summary:** a middleware parses `{project}` or `?project=` from the path and answers 404 itself.
- **Pros:** no router edits.
- **Cons:** it cannot filter the bodies of `/projects/beads` and `/overview`, and the project segment sits at different positions. A new route is unprotected by default. Rejected.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the design confirmed at discuss. A table-driven test over every project route fails when a new route skips the check.

## Scope
- **In scope:**
  - `REQ-CONFIG-009` and `REQ-AUTH-001` to `REQ-AUTH-016`.
  - The modified `REQ-SERVER-012` and `REQ-REQUIREMENTS-010`.
  - `config.example.yaml` and the README security and user-management sections.
  - ADR 0005 status `accepted`.
  - The gin-qa cases and specs of these REQs.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend config and auth core, CLI, README, config example) and Track 3 (frontend session, sign-in screen, apiFetch, mockup paths) share no file, so they run at once in their own worktrees; Track 2 wires Track 1's core into the app and routers and waits for it; Track 4 waits for Tracks 2 and 3.
```

## Tasks

### Track 1: Auth settings, users file, passwords, sessions, rate limiter, user CLI
- **Dependencies**: none
- **Requirements**: REQ-CONFIG-009, REQ-AUTH-004, REQ-AUTH-006, REQ-AUTH-009, REQ-AUTH-010, REQ-AUTH-011, REQ-AUTH-012, REQ-AUTH-013
- **Files**:
  - Modify `backend/src/gin_console/config.py:26-100`. Move the duration parsing of `BeadsSettings._duration` into `parse_duration(value, minimum)`. Add `RateLimitSettings`, `AuthSettings` and `Settings.auth`. Load and check the users file in `load_settings` when `enabled`.
  - Create `backend/src/gin_console/auth/__init__.py`
  - Create `backend/src/gin_console/auth/passwords.py`
  - Create `backend/src/gin_console/auth/users.py`
  - Create `backend/src/gin_console/auth/sessions.py`
  - Create `backend/src/gin_console/auth/ratelimit.py`
  - Create `backend/src/gin_console/auth/cli.py`
  - Modify `backend/src/gin_console/__main__.py:16-30`: `main(argv)` sends `user ...` to `auth.cli.main`, and with no arguments starts the server as today.
  - Modify `config.example.yaml`: add a commented `auth:` block with every field and its default.
  - Modify `README.md:205-210`: replace the "no authentication" warning with an "Access control" section. It covers turning auth on, each `user` command with an example, that passwords are printed once, and that a restart signs everyone out. The loopback advice stays for auth off.
  - Test `backend/tests/test_config.py` (REQ-CONFIG-009)
  - Test `backend/tests/test_auth_passwords.py`
  - Test `backend/tests/test_auth_users.py`
  - Test `backend/tests/test_auth_sessions.py`
  - Test `backend/tests/test_auth_ratelimit.py`
  - Test `backend/tests/test_auth_cli.py`
- **Interfaces**:
  - Consumes: `Settings`, `ProjectEntry`, `ConfigError`, `load_settings`, `resolve_config_path` (`config.py`); `_DURATION` and `_UNIT` (`config.py:27-28`); the test helper `write(tmp_path, text)` (`tests/test_config.py:19`).
  - Produces (`config.py`):
    ```python
    def parse_duration(value: object, minimum: int) -> float  # "<n>s|m|h"; ValueError naming the minimum

    class RateLimitSettings(BaseModel):  # extra="forbid"
        per_user: StrictInt = Field(default=5, ge=1)
        per_ip: StrictInt = Field(default=20, ge=1)
        window: float = 900.0            # validator: parse_duration(value, 60)

    class AuthSettings(BaseModel):       # extra="forbid"
        enabled: StrictBool = False
        users_file: Path = Path("~/.config/gin-console/users.yaml")  # validator: expanduser()
        session_ttl: float = 43200.0     # validator: parse_duration(value, 300)
        rate_limit: RateLimitSettings = Field(default_factory=RateLimitSettings)

    # Settings gains: auth: AuthSettings = Field(default_factory=AuthSettings)
    ```
    - `BeadsSettings.pull_interval` keeps its `0` case and calls `parse_duration(value, 60)`.
    - `load_settings` calls `auth.users.load_users(settings.auth.users_file, [p.name for p in settings.projects])` when `settings.auth.enabled`. It turns `UsersError` into `ConfigError(f"{users_file}: {reason}")` and also fails when the user list is empty.
  - Produces (`auth/passwords.py`):
    ```python
    PREFIX = "scrypt$16384$8$1$"
    def generate() -> str                         # secrets.token_urlsafe(18), 24 chars
    def hash_password(password: str) -> str       # 16-byte salt, dklen 64, base64 without padding
    def verify(password: str, encoded: str) -> bool  # False for any malformed hash; compare_digest
    DUMMY_HASH: str                               # hash_password of a fixed random string, computed at import
    ```
  - Produces (`auth/users.py`):
    ```python
    NAME = re.compile(r"[a-z0-9][a-z0-9._-]{0,63}")
    class UsersError(Exception): ...              # message shown to the operator
    class User(BaseModel):                        # extra="forbid", frozen
        name: str; email: str; password_hash: str
        projects: list[str] | Literal["*"]
        def allows(self, project: str) -> bool
    def load_users(path: Path, project_names: Sequence[str]) -> dict[str, User]
        # missing file, bad YAML, bad shape, bad name or email, duplicate name, unknown project -> UsersError
    def save_users(path: Path, users: Iterable[User]) -> None
        # mkdir(parents, exist_ok); tempfile.mkstemp(dir=path.parent); os.fchmod 0o600 where available;
        # yaml.safe_dump({"users": [...]}, sort_keys=False); os.replace; temp removed in finally on failure
    class UserDirectory:
        def __init__(self, path: Path, project_names: Sequence[str], users: dict[str, User]) -> None
        def current(self) -> tuple[dict[str, User], set[str]]
            # stat once; on a changed (st_mtime_ns, st_size) reload; returns users and the names
            # removed or with a changed password_hash since the last call; on UsersError keeps the
            # last users, logs one error per changed stat with logging.getLogger("gin_console.auth")
    ```
  - Produces (`auth/sessions.py`):
    ```python
    @dataclass(frozen=True)
    class Session: token: str; grant: str; name: str; created: datetime
    class SessionStore:
        def __init__(self, clock: Callable[[], datetime], ttl: float) -> None
        def create(self, name: str) -> Session        # token and grant: secrets.token_urlsafe(32)
        def get(self, token: str) -> Session | None   # None and dropped when created + ttl <= now
        def by_grant(self, grant: str) -> Session | None
        def end(self, token: str) -> None
        def end_users(self, names: Iterable[str]) -> None
    ```
    All methods hold a `threading.Lock`.
  - Produces (`auth/ratelimit.py`):
    ```python
    class FailureLimiter:
        def __init__(self, clock: Callable[[], datetime], limit: int, window: float) -> None
        def retry_after(self, key: str) -> int | None  # None while under limit; else ceil(seconds
                                                       # until the oldest failure leaves), at least 1
        def fail(self, key: str) -> None
        def clear(self, key: str) -> None
    ```
    It keeps a `deque` of failure times per key, drops times older than the window on each call, and deletes empty keys. It holds a `threading.Lock`.
  - Produces (`auth/cli.py`):
    ```python
    def main(argv: Sequence[str], env: Mapping[str, str] = os.environ) -> int
    ```
    - Subcommands, built with `argparse`:
      - `add <name> --email E (--project P ... | --all-projects)`
      - `passwd <name>`
      - `assign <name> (<project>... | --all)`
      - `unassign <name> <project>...`
      - `remove <name>`
      - `list`
    - It loads the config with `load_settings(resolve_config_path(env))`. Here a missing users file is an empty list, not an error.
    - Errors print `gin-console: <reason>` on stderr and return 1.
    - `add` and `passwd` print only the password line on stdout.
    - `list` prints `name<TAB>email<TAB>projects` per line, with projects joined by `,` or shown as `*`.
    - `unassign` of a user with `"*"` is refused with `user <name> has all projects; assign the projects to keep first`.
    - Names are lower-cased before every check.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** security core: password hashing, a constant-time verify, an atomic file write with permissions, a reload that revokes sessions, and lock-guarded stores. This is the rubric's security and concurrency row.
- **Steps**:
  1. Write the failing tests first:
     - `test_auth_passwords.py`: round trip; wrong password; the `PREFIX`; `generate` returns 24 URL-safe characters and two calls differ; `verify` is False for `"x"`, `"scrypt$1$2"` and bad base64; `DUMMY_HASH` verifies nothing typed.
     - `test_auth_ratelimit.py`, with a list-backed fake clock: REQ-AUTH-004 (5 failures lock, `Retry-After` counts down to the oldest failure leaving, `clear` resets, keys are independent, empty keys pruned).
     - `test_auth_sessions.py`: REQ-AUTH-006 expiry at `created + ttl`, `end`, `end_users`, `by_grant`, and a grant that is not a token.
     - Run `uv --directory backend run pytest tests/test_auth_passwords.py tests/test_auth_ratelimit.py tests/test_auth_sessions.py` and expect import errors.
  2. Write `passwords.py`, `ratelimit.py` and `sessions.py` until those tests pass.
  3. Write `test_auth_users.py`:
     - The load checks, each naming its reason.
     - `save_users`: mode `0o600` (skip on win32), the format, and an atomic write. Monkeypatch `os.replace` to raise: the old file is unchanged and no temp file is left.
     - REQ-AUTH-009 `UserDirectory`: after a rewrite with a new hash, `current()` returns that name; a removed user is returned; invalid YAML keeps the last users and logs once (`caplog`).
     - Write `users.py`.
  4. Add to `test_config.py` every scenario of REQ-CONFIG-009: defaults; enabled with no users file; an unknown project; `per_user: 0`; `session_ttl: 1m` refused; `window: 30s` refused; the existing REQ-CONFIG-006 tests unchanged. Change `config.py`.
  5. Write `test_auth_cli.py` on a `tmp_path` config with projects `a` and `b`, with `env={"GIN_CONSOLE_CONFIG": ...}` and `capsys`:
     - Every scenario of REQ-AUTH-010 to REQ-AUTH-013.
     - The printed password verifies against the stored hash.
     - `list` output never contains `scrypt$`.
     - `unassign` of `"*"` is refused.
     - `assign --all` sets `"*"`.
     - A name with upper case is lower-cased.
     - An invalid email exits 1.
     - Write `cli.py` and the `__main__.py` dispatch. Add a test that `main([])` still calls the server path: monkeypatch `uvicorn.run`.
  6. Update `config.example.yaml` and the README section.
  7. Run `uv --directory backend run pytest`, `ruff check .` and `mypy`, then commit.
- **Acceptance criteria**:
  - Every scenario of REQ-CONFIG-009, REQ-AUTH-010 to REQ-AUTH-013, and the unit parts of REQ-AUTH-004, REQ-AUTH-006 and REQ-AUTH-009 have a test naming the REQ-ID.
  - The existing config tests pass unchanged.
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: high

### Track 2: Sign-in routes, session middleware, project access, refresh, mockup grant
- **Dependencies**: Track 1
- **Requirements**: REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-004, REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-007, REQ-AUTH-008, REQ-AUTH-009, REQ-AUTH-016, REQ-SERVER-012, REQ-REQUIREMENTS-010
- **Files**:
  - Create `backend/src/gin_console/auth/access.py`
  - Create `backend/src/gin_console/auth/router.py`
  - Modify `backend/src/gin_console/app.py:37-40` (`_MOCKUP_FILES` and a `_GRANT_FILES` regex), `:63-134` (build `AuthState`, add the auth middleware before the cross-site one so it runs after it, include the auth router, refresh pulls the allowed projects, pass `allowed_projects` into the routers)
  - Modify `backend/src/gin_console/beads/router.py:58-77` (`project_entry` takes the request's projects)
  - Modify `backend/src/gin_console/milestones/router.py:48-64` (same for `project_dir`)
  - Modify `backend/src/gin_console/requirements/router.py:38-53` and `:98-109` (same for `project_dir`, plus the grant route)
  - Modify `backend/src/gin_console/reports/router.py:89-93` (same for `find`)
  - Modify `backend/src/gin_console/projects/router.py:10-22` (list the allowed projects)
  - Modify `backend/src/gin_console/overview/router.py:15-43` (same)
  - Modify `backend/src/gin_console/beads/pull.py:57-64` (`pull_all(names=None)`)
  - Modify `docs/adr/0005-optional-config-auth.md` (`Status: accepted`)
  - Test `backend/tests/test_auth_api.py`
  - Test `backend/tests/test_auth_access_api.py`
  - Test `backend/tests/test_cross_site.py` (the grant path case)
  - Test `backend/tests/test_pull.py` (`pull_all` with names)
- **Interfaces**:
  - Consumes: Track 1's `Settings.auth`, `User`, `UserDirectory`, `SessionStore`, `Session`, `FailureLimiter`, `verify`, `DUMMY_HASH`, `load_users`; `route_path`, `refuses_cross_site` (`app.py:42-60`); `PullService` (`beads/pull.py`); the test helpers `FakeBd` (`tests/fake_bd.py`) and the `client` pattern of `tests/test_cross_site.py:15-26`.
  - Produces (`auth/access.py`):
    ```python
    COOKIE = "gin_console_session"
    class AuthState:
        def __init__(self, settings: Settings, clock: Callable[[], datetime]) -> None
            # enabled flag; UserDirectory (loaded with load_users when enabled); SessionStore(clock,
            # settings.auth.session_ttl); FailureLimiter per user and per IP from settings.auth.rate_limit
        enabled: bool
        def users(self) -> dict[str, User]           # UserDirectory.current(); ends sessions of the
                                                     # returned names via SessionStore.end_users
        def user_of_token(self, token: str | None) -> User | None
        def user_of_grant(self, grant: str) -> User | None
    ProjectsOf = Callable[[Request], list[ProjectEntry]]
    def projects_of(settings: Settings) -> ProjectsOf
        # auth off: settings.projects; on: the entries of settings.projects (config order) that
        # request.state.user.allows(); no user on request.state: []
    ```
  - Produces (`auth/router.py`):
    ```python
    def build_router(settings: Settings, state: AuthState, projects: ProjectsOf) -> APIRouter
    ```
    - `GET /auth/me` returns `{"enabled": bool, "user": null | {"name", "email", "projects": [names], "mockup_grant"}}`.
    - `POST /auth/login`:
      - It answers 404 while auth is off.
      - It reads the body with `await request.json()`, catches every error, and requires two `str` fields.
      - The IP is `request.client.host` (or `""`), the key `name.lower()`.
      - It checks `retry_after` for the user and the IP. A limit answers 429 with `{"error": "too many attempts"}` and the larger `Retry-After`.
      - It verifies against the user's hash or `DUMMY_HASH`.
      - A failure records `fail` on both keys and answers 401 with `{"error": "invalid username or password"}`.
      - A success calls `clear(user)`, `create`, `set_cookie(COOKIE, token, max_age=int(ttl), httponly=True, samesite="strict", path="/", secure=request.url.scheme == "https")`, and answers 200 with the `me` user object.
    - `POST /auth/logout` ends the session, calls `delete_cookie(COOKIE, path="/")`, and answers 204.
  - Produces (`app.py`):
    - `_MOCKUP_FILES = re.compile(r"/api/requirements/mockups/[^/]+/(?:g/[^/]+/)?files/")`.
    - `_GRANT_FILES = re.compile(r"/api/requirements/mockups/[^/]+/g/([^/]+)/files/")`.
    - `create_app` keeps its signature and builds `AuthState(settings, clock)`.
    - The middleware `require_session` is registered between gzip and `refuse_cross_site`:
      - With auth off it does nothing.
      - With auth on and the path under `/api`:
        - On a GET whose path matches `_GRANT_FILES`, it sets `request.state.user` from `user_of_grant` and answers 404 `{"error": "not found"}` when there is none.
        - On any other path it sets `request.state.user` from the cookie.
        - With no user, and a path that is not `/api/health`, `/api/auth/login` or `/api/auth/me`, it answers 401 `{"error": "sign-in required"}`.
    - Refresh: `pulls.pull_all([e.name for e in projects(request)] if state.enabled else None)`, then `drop_caches()`.
    - Each `build_router` gains a `projects: ProjectsOf` argument, placed last.
  - Produces (routers): each resolver takes `request: Request` and looks the name up in `projects(request)` instead of `settings.projects`. Every route that resolves a project gains a `request: Request` parameter. `/projects/beads` and `/overview` iterate `projects(request)`. `requirements/router.py` adds `@router.get("/requirements/mockups/{project}/g/{grant}/files/{capability}/{day}/{path:path}")`, which calls the same body as `get_mockup_file`.
  - Produces (`beads/pull.py`): `pull_all(self, names: Collection[str] | None = None) -> dict[str, PullResult]` pulls the entries in `names` only when given; the scheduler passes nothing.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** a cross-module change over the app factory, middleware order and six routers. Security-sensitive rules for login timing, rate limit, cookie attributes and grant scoping fall on the rubric's strongest row.
- **Steps**:
  1. Write `test_auth_api.py` with a `client(tmp_path, users, clock)` helper. It writes a users file with `save_users` and hashes from `hash_password`, builds `Settings(auth=AuthSettings(enabled=True, users_file=...), projects=[a, b])`, and calls `create_app(..., clock=fake, run_bd=FakeBd(), schedule_pulls=False)`. Cover every scenario of:
     - REQ-AUTH-001: run with `Settings()` and no auth.
     - REQ-AUTH-002: cookie attributes parsed from `set-cookie`; username case; `me` before and after sign-in.
     - REQ-AUTH-003: identical bodies. Monkeypatch `auth.router.verify` to record that an unknown user is checked against `DUMMY_HASH`.
     - REQ-AUTH-004: through the API, IP from the TestClient (`testclient`); `Retry-After` present.
     - REQ-AUTH-005: no cookie, forged cookie, `/api/health`, `/`.
     - REQ-AUTH-006: advance the fake clock to the TTL; logout.
     - REQ-AUTH-009: rewrite the users file through `save_users` and bump the mtime with `os.utime`, then check a reset password, an unassigned project, and a broken file.
     - Run it and expect failures.
  2. Write `auth/access.py`, `auth/router.py` and the `app.py` middleware and wiring until those pass.
  3. Write `test_auth_access_api.py` for REQ-AUTH-007, REQ-AUTH-008 and REQ-AUTH-016:
     - A table of every project route with project `b` substituted: `/api/beads?project=b`, `/api/beads/milestones?project=b`, `/api/beads/b/x-1`, `/api/beads/b/x-1/comments`, `/api/beads/b/x-1/workflow`, `/api/milestones?project=b`, `/api/milestones/b/wbs`, `/api/milestones/b/m-1`, `/api/requirements?project=b`, `/api/requirements/reqs/b/REQ-X-001`, `/api/requirements/changes?project=b`, `/api/requirements/changes/b/c`, `/api/requirements/mockups?project=b`, `/api/requirements/mockups/b/files/ui/2026-11-22/style.css`, `/api/reports?project=b`, `/api/reports/team?project=b`, `/api/reports/status?project=b`, `/api/reports/bugs?project=b`.
     - Each answers 404 for `an` (projects `[a]`).
     - A guard test compares the table with `app.routes`: every route whose path holds `{project}` or whose endpoint takes a `project` parameter must appear in the table, so a new route fails it.
     - The filtered lists of `/api/projects/beads` and `/api/overview`.
     - `"*"`.
     - The shared cache scenario: `root` first, then `an`.
     - Refresh with `FakeBd` recording the pulled folders.
     - The grant scenarios: the file served without a cookie, another project gives 404, after logout gives 404, the grant used as a cookie gives 401. While auth is off the grant path gives 404.
     - Write the router edits and `pull_all(names)`.
  4. Add to `test_cross_site.py` the new REQ-SERVER-012 scenario: a grant-path GET with `Sec-Fetch-Site: cross-site` is not refused by the guard. Add to the requirements tests (`tests/test_requirements_api.py`, or the file holding the REQ-REQUIREMENTS-010 tests) the new grant-path scenario. Run every existing suite unchanged.
  5. Set ADR 0005 to `accepted`. Run `uv --directory backend run pytest`, `ruff check .` and `mypy`, then commit.
- **Acceptance criteria**:
  - Every scenario of REQ-AUTH-001 to REQ-AUTH-009 and REQ-AUTH-016, and the new scenarios of REQ-SERVER-012 and REQ-REQUIREMENTS-010, have a test naming the REQ-ID.
  - The route-table guard test lists every project route.
  - All existing backend tests pass unchanged.
  - `pytest`, `ruff check .`, and `mypy` pass.
- **Estimated complexity**: high

### Track 3: Sign-in screen, session store, apiFetch, mockup grant paths
- **Dependencies**: none
- **Requirements**: REQ-AUTH-014, REQ-AUTH-015, REQ-AUTH-016
- **Files**:
  - Create `frontend/src/app/session.ts`
  - Create `frontend/src/app/SignInPage.tsx`
  - Modify `frontend/src/app/App.tsx:54-58`: gate on the session first, then on the email as today.
  - Modify `frontend/src/app/identity.ts:12-23` and `:63-65`: `getEmail` returns the session user's email while signed in.
  - Modify `frontend/src/app/Layout.tsx:84` and `:114-124`, `:222-249`: show the user name and wire Sign out to `signOut` while auth is on; keep `clearEmail` while it is off.
  - Modify `frontend/src/app/RefreshButton.tsx:12`: use `apiFetch`.
  - Modify the `fetch(` call sites to `apiFetch(` in:
    - `frontend/src/features/milestones/api.ts:255`, `:269`
    - `frontend/src/features/reports/teamApi.ts:112`
    - `frontend/src/features/reports/api.ts:92`
    - `frontend/src/features/reports/status/statusApi.ts:142`
    - `frontend/src/features/reports/bugs/bugsApi.ts:84`
    - `frontend/src/features/projects/api.ts:86`
    - `frontend/src/features/beads/api.ts:229`, `:239`, `:247`, `:255`, `:284`
    - `frontend/src/features/overview/api.ts:51`
    - `frontend/src/features/requirements/api.ts:84`
  - Modify `frontend/src/features/requirements/paths.ts:6-7`: `mockupFileHref` inserts `g/<grant>/` when there is a grant.
  - Test `frontend/src/app/session.test.ts`
  - Test `frontend/src/app/SignInPage.test.tsx`
  - Test `frontend/src/app/App.test.tsx`: the auth gating.
  - Test `frontend/src/app/Layout.test.tsx`: name and Sign out.
  - Test `frontend/src/features/requirements/paths.test.ts`: grant path.
- **Interfaces**:
  - Consumes the API contract of Track 2:
    - `GET /api/auth/me` returns `{ enabled: boolean; user: null | { name: string; email: string; projects: string[]; mockup_grant?: string } }`.
    - `POST /api/auth/login` takes the JSON body `{ username, password }` and answers 200 with the user object, 401, or 429 with `Retry-After`.
    - `POST /api/auth/logout` answers 204.
    - Any `/api` route can answer 401.
  - Also consumes `useLocation` and `navigate` from `app/route.ts`, `Button` from `components/ui/button`, the styles of `LoginPage.tsx`, and `ICON_BUTTON` from `ThemeToggle.tsx`.
  - Produces (`session.ts`):
    ```ts
    export type SessionUser = { name: string; email: string; projects: string[]; mockup_grant?: string };
    export type SessionState =
      | { status: "loading" }
      | { status: "off" }
      | { status: "signed-out"; returnTo: string | null }
      | { status: "signed-in"; user: SessionUser };
    export function getSession(): SessionState;
    export function useSession(): SessionState;            // useSyncExternalStore
    export async function loadSession(): Promise<void>;     // GET /api/auth/me; a network error -> "off"
    export type SignInResult = { ok: true } | { ok: false; reason: "invalid" } | { ok: false; reason: "locked"; minutes: number } | { ok: false; reason: "error" };
    export async function signIn(username: string, password: string): Promise<SignInResult>;
    export async function signOut(): Promise<void>;         // POST logout, then "signed-out", returnTo null
    export async function apiFetch(input: string, init?: RequestInit): Promise<Response>;
      // fetch(input, init); when the answer is 401 and the state is "signed-in", set "signed-out" with
      // returnTo = location.pathname + location.search; returns the response unchanged
    export function resetSession(): void;                   // tests only
    ```
    - `minutes` is `Math.max(1, Math.ceil(Number(retryAfter) / 60))`.
    - On a successful sign-in, `signIn` navigates to `returnTo` when it is set.
  - Produces (`SignInPage.tsx`): `SignInPage()`.
    - A heading `gin-console` and a form with `Username` (`autoComplete="username"`) and `Password` (`type="password"`, `autoComplete="current-password"`).
    - A `Sign in` button, disabled while submitting.
    - A `role="alert"` message: `Wrong username or password` for `invalid`, `Too many attempts. Try again in {n} minutes` for `locked` (`1 minute` when n is 1), and `Could not reach the console. Try again.` for `error`.
    - The password field is cleared after a failure.
  - Produces (`App.tsx`):
    - It calls `loadSession()` once in an effect.
    - `loading` renders `<p className="text-muted-foreground">Loading…</p>`.
    - `signed-out` renders `<SignInPage />`.
    - `off` keeps `if (email === null) return <LoginPage />`.
    - `signed-in` renders the app.
  - Produces (`identity.ts`): `getEmail()` returns `getSession().user.email` (lower-cased) while signed in, else today's value. `useEmail` subscribes to both stores.
  - Produces (`Layout.tsx`):
    - While signed in, the name shown and in the `Log out` labels is `user.name`, and the button calls `signOut()`.
    - Its label reads `Sign out {name}`.
    - While auth is off, everything stays as today.
  - Produces (`paths.ts`):
    - `mockupFileHref(project, capability, date, path)` returns `/api/requirements/mockups/{p}/g/{enc(grant)}/files/...` when `getSession()` is signed in with a `mockup_grant`.
    - Otherwise it returns today's path.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** bounded components and a small store in existing patterns (`identity.ts` external store, `LoginPage` styling), with every text and status written in the spec. The call-site swap is mechanical.
- **Steps**:
  1. Write `session.test.ts`, stubbing `fetch` with `vi.stubGlobal`:
     - `loadSession` maps `me` to `off`, `signed-out` and `signed-in`.
     - `signIn` covers 200, 401, 429 with `Retry-After: 600` (10 minutes) and 61 (2 minutes), and a network error.
     - REQ-AUTH-015: `apiFetch` on a 401 while signed in sets `signed-out` with `returnTo`, and is unchanged while `off`.
     - `signOut` posts to logout.
     - Run `pnpm -C frontend test --run src/app/session.test.ts` and expect failures. Write `session.ts`.
  2. Write `SignInPage.test.tsx` for every REQ-AUTH-014 scenario on the screen: the messages, the cleared password, the disabled button. Write `SignInPage.tsx`.
  3. In `App.test.tsx`:
     - With auth on and no session, the sign-in screen shows and no other `/api` request is made.
     - With auth off, the email screen shows as today.
     - Signed in, My work uses the session email.
     - REQ-AUTH-015: a 401 on a beads page shows sign-in, and after sign-in the same path is shown.
     - Write the `App.tsx`, `identity.ts` and `Layout.tsx` changes. Add the `Layout.test.tsx` cases for name and Sign out.
  4. Swap `fetch(` for `apiFetch(` at the listed call sites. Existing tests that stub `globalThis.fetch` keep working because `apiFetch` calls the global `fetch`.
  5. In `paths.test.ts`, test REQ-AUTH-016 on the frontend: a grant path while signed in, and today's path while off. Change `paths.ts`.
  6. Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck` and `pnpm -C frontend lint`, then commit.
- **Acceptance criteria**:
  - Every scenario of REQ-AUTH-014 and REQ-AUTH-015, and the frontend part of REQ-AUTH-016, have tests naming the REQ-ID.
  - The existing LoginPage, identity, App and Layout tests pass.
  - `vitest`, `typecheck`, and `lint` pass.
- **Estimated complexity**: medium

### Track 4: QA cases and e2e specs for Optional authentication
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-CONFIG-009, REQ-AUTH-001, REQ-AUTH-002, REQ-AUTH-003, REQ-AUTH-004, REQ-AUTH-005, REQ-AUTH-006, REQ-AUTH-007, REQ-AUTH-008, REQ-AUTH-009, REQ-AUTH-010, REQ-AUTH-011, REQ-AUTH-012, REQ-AUTH-013, REQ-AUTH-014, REQ-AUTH-015, REQ-AUTH-016, REQ-SERVER-012, REQ-REQUIREMENTS-010
- **Files**:
  - Create cases in `qa/cases/auth/`. Modify or add cases in `qa/cases/config/`, `qa/cases/server/` and `qa/cases/requirements/`, as `gin-qa cases plan --change gin-console-hlj` lists them.
  - Create `backend/tests/test_auth_cases_api.py` for the `api` cases. The gin-qa `api` glob is `backend/tests/test_*_api.py`.
  - Modify `qa/e2e/support/api.ts` only if a stub for `/api/auth/*` is missing.
  - Create e2e specs under `qa/e2e/auth/`.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-hlj` prints `ok`.
  - `gin-qa cases plan --change gin-console-hlj` lists nothing missing, stale or obsolete.
  - `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The new e2e specs pass on the built UI, run with a Playwright config outside the repo on port 8702. Port 8701 is held by an older server; never stop it. The config enables auth with a users file made by `python -m gin_console user add`. The specs cover:
    - a sign-in with the right password;
    - the wrong-password message;
    - a 429 message after the limit;
    - the project switcher listing only the user's projects;
    - a styled mockup through the grant;
    - Sign out returning to the sign-in screen;
    - the sign-in screen at 390px with no horizontal scroll.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/optional-auth`
- **Merge strategy**: parallel-then-merge (Tracks 1 and 3 in their own worktrees, merged into `feat/optional-auth`; Track 2 starts from Track 1's merge; Track 4 from Tracks 2 and 3).

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy` pass
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build` pass
- [ ] `gin specs lint --change gin-console-hlj --against master` prints `ok`; `gin specs trace --change gin-console-hlj` reports no missing REQ
- [ ] Manual check, auth off: the console runs with today's config, the email screen works, and every page loads.
- [ ] Manual check, auth on:
  - Run `user add an --email an@x.io --project <one>` and sign in with the printed password. Only that project is listed, and a mockup of it is styled.
  - Six wrong passwords give the "Too many attempts" message.
  - `user passwd an` signs the open browser out on its next request.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Deliverable merge-holds apply only to the Parent Bead `gin-console-hlj`; track beads close after tests and review pass.
