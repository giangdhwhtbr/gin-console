# Plan: Mockup grant per folder and strict mockup CSP

Epic: gin-console-dbt
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder. Diagram: `docs/specs/auth/diagrams/mockup-grant-activity.md`.

## Objective

Make a mockup's grant open only the files of its own folder, and stop mockups from loading anything from another origin.

Done when:
- Every new scenario of the 4 modified REQs (`REQ-AUTH-002`, `REQ-AUTH-016`, `REQ-REQUIREMENTS-009`, `REQ-REQUIREMENTS-011`) has a test naming the REQ-ID.
- `uv --directory backend run pytest`, `ruff check .` and `mypy` pass.
- `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
- `gin specs lint --change gin-console-dbt --against master` prints `ok`.
- `gin specs trace --change gin-console-dbt` reports no missing REQ.
- `gin-qa cases check --change gin-console-dbt` prints `ok`.

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
  - `Session.grant` (`backend/src/gin_console/auth/sessions.py:17`) is one bearer token per session. Login and `me` return it as `mockup_grant` (`auth/router.py:32`, `:81`).
  - The middleware accepts it for any project the user may see (`app.py:43`, `:124-129`).
  - The frontend puts it into every mockup URL (`frontend/src/features/requirements/paths.ts:9-13`).
  - The mockup CSP (`requirements/router.py:36`) allows images, styles and fonts from any origin.
- **Success criteria:** the REQs above, with the tests and checks of the Objective.
- **Global constraints**, from the spec and the user decisions of 2026-11-27:
  - **Grant format:** the grant of a folder is `<grant id>.<mac>`.
    - `<grant id>` is `Session.grant`.
    - `<mac>` is the unpadded base64url HMAC-SHA256 of `<project>/<capability>/<date>` under `Session.grant_key`, 32 bytes from `secrets.token_bytes`.
    - `grant_key` never leaves the server.
  - **Grant check:** the mac must match the decoded `<project>`, `<capability>` and `<date>` of the request path, and is compared with `hmac.compare_digest`.
    - Every failure answers the same 404 `{"error": "not found"}` before the router: no `.`, unknown id, wrong mac, another folder or project, auth off.
    - A grant grants only GET on the grant path. It is never a cookie.
  - **Where the grant appears:** `GET /api/requirements/mockups?project=` returns `grant` per mockup, `null` while auth is off. Login and `me` return no grant.
  - **CSP:** `POLICY = "sandbox allow-scripts; default-src 'self' 'unsafe-inline' data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'"` on every mockup file response.
  - **Auth off:** behaviour is unchanged apart from the CSP. Mockup files load from the path without `g/`.
- **Non-goals:** blocking navigation out of a mockup; grants shorter-lived than their session; access-log changes.

## Approach Options
### Option 1: HMAC grant per folder, returned by the mockup list
- **Summary:**
  - Track 1 changes the session, the middleware, the mockup list, the user object and the CSP.
  - Track 2 makes the frontend use each mockup's grant, in parallel with Track 1.
  - Track 3 updates the QA cases and e2e specs.
- **Pros:**
  - No grant table: the server recomputes the mac.
  - A leaked grant opens only files its author already has.
- **Cons:** the mockup list body differs per session. That is safe because the route has no cache.

### Option 2: one grant per project in `me`
- **Summary:** `me` returns a map of project to grant.
- **Cons:** rejected at discuss. A leak opens every mockup of the project.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** the design confirmed at discuss.

## Scope
- **In scope:**
  - The 4 modified REQs.
  - The README sentence about the grant, if it names `mockup_grant`.
  - The knowledge record `.planning/knowledge/optional-auth.md`.
  - The QA cases and specs of these REQs.
- **Out of scope:** the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend auth, app middleware, requirements router and models) and Track 2 (frontend requirements paths, api, MockupsSection, session) share no file and meet at the API contract of this plan, so they run at once in their own worktrees; Track 3 waits for both.
```

## Tasks

### Track 1: Folder grant, mockup list grant, strict mockup CSP
- **Dependencies**: none
- **Requirements**: REQ-AUTH-002, REQ-AUTH-016, REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-011
- **Files**:
  - Modify `backend/src/gin_console/auth/sessions.py:15-42`: `Session.grant_key`, filled in `create`.
  - Modify `backend/src/gin_console/auth/access.py:59-100`: `folder_grant`, `AuthState.session_of_token`, `AuthState.user_of_folder_grant`, `MockupGrant`, `mockup_grant_of`. `user_of_grant` is removed.
  - Modify `backend/src/gin_console/app.py:43`: `_GRANT_FILES` with four groups.
  - Modify `backend/src/gin_console/app.py:115-133`: the middleware checks the folder grant, and sets `request.state.session` on the cookie path.
  - Modify `backend/src/gin_console/app.py:170`: pass `mockup_grant_of(auth)` to the requirements router.
  - Modify `backend/src/gin_console/auth/router.py:28-33`, `:75-82`: drop `mockup_grant` from `SessionUser` and `view`.
  - Modify `backend/src/gin_console/requirements/models.py:149-158`: `Mockup.grant: str | None = None`.
  - Modify `backend/src/gin_console/requirements/router.py:36`: `POLICY`.
  - Modify `backend/src/gin_console/requirements/router.py:39-46`: a `mockup_grant: MockupGrant` argument, last.
  - Modify `backend/src/gin_console/requirements/router.py:101-103`: `get_mockups` fills `grant`.
  - Modify `README.md`, only where it names `mockup_grant` or "one grant per session".
  - Modify `.planning/knowledge/optional-auth.md`: the grant and CSP bullets.
  - Test `backend/tests/test_auth_sessions.py`
  - Test `backend/tests/test_auth_api.py`, for REQ-AUTH-002 and the existing grant tests updated.
  - Test `backend/tests/test_auth_access_api.py`, for REQ-AUTH-016.
  - Test the requirements API test files that hold the REQ-REQUIREMENTS-009 and REQ-REQUIREMENTS-011 tests: `backend/tests/test_requirements_files_api.py`, and `test_requirements_api.py` if REQ-REQUIREMENTS-009 lives there.
  - Test `backend/tests/test_auth_cases_api.py`: update the TC-AUTH grant tests that read `mockup_grant`. They must keep their `# TC:` markers. Track 3 re-pins the cases.
- **Interfaces**:
  - Consumes:
    - `Session`, `SessionStore` (`auth/sessions.py`).
    - `AuthState._user_of`, `AuthState.users` (`auth/access.py:36-70`).
    - `via_grant` (`auth/access.py:94-96`).
    - `route_path` (`app.py`).
    - `list_mockups` (`requirements/source.py` or wherever `get_mockups` imports it).
    - The test helpers of `tests/test_auth_access_api.py` and `tests/test_cross_site.py`, which build a confirmed mockup folder.
  - Produces (`auth/sessions.py`): `Session` gains `grant_key: bytes`, from `secrets.token_bytes(32)` in `create`. `by_grant(grant_id)` is unchanged.
  - Produces (`auth/access.py`):
    ```python
    def folder_grant(session: Session, project: str, capability: str, date: str) -> str
        # f"{session.grant}.{base64.urlsafe_b64encode(hmac.new(session.grant_key,
        #   f'{project}/{capability}/{date}'.encode(), hashlib.sha256).digest()).rstrip(b'=').decode()}"
    class AuthState:
        def session_of_token(self, token: str | None) -> Session | None   # users() first, as _user_of
        def user_of_folder_grant(self, token: str, project: str, capability: str, date: str) -> User | None
            # rpartition(".") -> id, mac; empty id or mac -> None; session = by_grant(id) after users();
            # None unless compare_digest(token, folder_grant(session, project, capability, date));
            # then users().get(session.name)
    MockupGrant = Callable[[Request, str, str, str], str | None]
    def mockup_grant_of(state: AuthState) -> MockupGrant
        # (request, project, capability, date) -> folder_grant(request.state.session, ...) while auth is
        # on and request.state.session is set; else None
    ```
  - Produces (`app.py`):
    - `_GRANT_FILES = re.compile(r"/api/requirements/mockups/([^/]+)/g/([^/]+)/files/([^/]+)/([^/]+)/")`.
    - The middleware, on a GET whose path matches, calls `auth.user_of_folder_grant(m[2], m[1], m[3], m[4])` in the threadpool and answers 404 on None. It then sets `request.state.grant = m[2]` and `request.state.user`.
    - On the cookie path it sets `request.state.session = auth.session_of_token(cookie)` and `request.state.user` from that session's user. The 401 rule is unchanged.
  - Produces (`auth/router.py`): `SessionUser = {name, email, projects}`.
  - Produces (`requirements`):
    - `Mockup.grant: str | None = None`.
    - `build_router(settings, run, clock, on_refresh, projects, mockup_grant)`.
    - `get_mockups` returns `[m.model_copy(update={"grant": mockup_grant(request, project, m.capability, m.date)}) for m in list_mockups(...)]`.
    - `get_granted_mockup_file` is unchanged.
  - API contract for Track 2:
    - `GET /api/requirements/mockups?project=p` returns `{"mockups": [{..., "grant": "<id>.<mac>" | null}]}`.
    - `GET /api/auth/me` returns `user: {name, email, projects}` or null.
    - Mockup files load from `/api/requirements/mockups/<p>/g/<grant>/files/<capability>/<date>/<path>` when `grant` is a string, else from `/api/requirements/mockups/<p>/files/...`.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** security-sensitive token derivation and verification across sessions, middleware and two routers, which is the rubric's security row.
- **Steps**:
  1. Write the failing tests first.
     - `test_auth_sessions.py`: `grant_key` is 32 bytes and differs per session.
     - `test_auth_access_api.py`, every new REQ-AUTH-016 scenario:
       - The styled mockup loads through the grant from the list.
       - Another folder of the same project answers 404.
       - Another project answers 404.
       - After logout the grant answers 404.
       - Malformed grants answer 404: `abc`, a valid id with a wrong mac, the session token.
       - The grant used as a cookie answers 401.
       - With auth off, `grant` is null and the grant path answers 404.
     - Write a second confirmed folder in the fixture.
     - `test_auth_api.py`: REQ-AUTH-002, `me` and login carry no `mockup_grant`.
     - Requirements tests:
       - REQ-REQUIREMENTS-009: two folders get different grants.
       - REQ-REQUIREMENTS-011: the exact `POLICY` header on HTML, CSS and SVG.
     - Run `uv --directory backend run pytest tests/test_auth_sessions.py tests/test_auth_access_api.py tests/test_auth_api.py` and expect failures.
  2. Write the sessions, access, middleware, router and model changes until the tests pass. Update the older grant tests and `test_auth_cases_api.py` to take the grant from the mockup list.
  3. Update the README sentence and the knowledge record.
  4. Run `uv --directory backend run pytest`, `ruff check .` and `mypy`, then commit.
- **Acceptance criteria**:
  - Every new scenario of the 4 REQs has a test naming the REQ-ID.
  - The existing REQ-SERVER-012 and REQ-REQUIREMENTS-010 tests still pass.
  - `pytest`, `ruff check .` and `mypy` pass.
- **Estimated complexity**: medium

### Track 2: Frontend loads mockups with each mockup's grant
- **Dependencies**: none
- **Requirements**: REQ-AUTH-016, REQ-REQUIREMENTS-009, REQ-AUTH-002
- **Files**:
  - Modify `frontend/src/features/requirements/api.ts:31`, `:80-81`: `Mockup.grant: string | null`. The guard accepts a missing `grant` as `null` and refuses a non-string, non-null one.
  - Modify `frontend/src/features/requirements/paths.ts:1-13`: `mockupFileHref` takes `grant`, with no session import.
  - Modify `frontend/src/features/requirements/MockupsSection.tsx:30`: pass `mockup.grant`.
  - Modify `frontend/src/app/session.ts:4`, `:30-35`: drop `mockup_grant` from `SessionUser` and `parseUser`.
  - Test `frontend/src/features/requirements/paths.test.ts`
  - Test `frontend/src/features/requirements/MockupsSection.test.tsx`
  - Test `frontend/src/app/session.test.ts`
  - Test `frontend/src/features/requirements/api.test.ts`, if it covers the guard.
- **Interfaces**:
  - Consumes the Track 1 API contract.
  - Produces:
    - `export type Mockup = { ...; grant: string | null }`.
    - `export const mockupFileHref = (project: string, capability: string, date: string, path: string, grant: string | null): string`. It returns `/api/requirements/mockups/${enc(project)}/${grant === null ? "" : `g/${enc(grant)}/`}files/${enc(capability)}/${enc(date)}/${path.split("/").map(enc).join("/")}`.
    - `export type SessionUser = { name: string; email: string; projects: string[] }`.
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** a small mechanical change to one type, one guard, one helper signature and its two call sites, with the exact strings given.
- **Steps**:
  1. Update the tests first.
     - `paths.test.ts`: REQ-AUTH-016 grant path with a grant, and today's path with `null`.
     - `MockupsSection.test.tsx`: REQ-REQUIREMENTS-009, the iframe `src` uses the mockup's own grant, and two mockups use two different grants.
     - `session.test.ts`: REQ-AUTH-002, the user has no `mockup_grant`.
     - Run `pnpm -C frontend test --run src/features/requirements src/app/session.test.ts` and expect failures.
  2. Make the changes.
  3. Run `pnpm -C frontend test --run`, `typecheck` and `lint`, then commit.
- **Acceptance criteria**:
  - The frontend parts of REQ-AUTH-016, REQ-REQUIREMENTS-009 and REQ-AUTH-002 have tests naming the REQ-ID.
  - The existing requirements and session tests pass.
  - `vitest`, `typecheck` and `lint` pass.
- **Estimated complexity**: low

### Track 3: QA cases and e2e specs for the folder grant and the mockup CSP
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-AUTH-002, REQ-AUTH-016, REQ-REQUIREMENTS-009, REQ-REQUIREMENTS-011
- **Files**:
  - Modify or add cases in `qa/cases/auth/` and `qa/cases/requirements/`, as `gin-qa cases plan --change gin-console-dbt` lists them.
  - Modify `backend/tests/test_auth_cases_api.py` and the requirements cases api test file, for new or changed `api` cases.
  - Modify `qa/e2e/auth/tc-auth-048.spec.ts`: the styled mockup loads through its folder grant.
  - Create an e2e spec for the new outside-resources case under `qa/e2e/requirements/`. It needs no auth, so it runs on the default e2e server.
  - Modify `qa/e2e/auth/auth-session.ts` only if a constant is missing.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** cases and specs from written scenarios in the existing gin-qa patterns.
- **Acceptance criteria**:
  - `gin-qa cases check --change gin-console-dbt` prints `ok`.
  - `gin-qa cases plan --change gin-console-dbt` lists nothing missing, stale or obsolete.
  - `gin-qa e2e plan` lists none of the change's cases as missing or stale.
  - The changed and new e2e specs pass on the built UI. Use an auth-on console on port 8702 as `qa/guidelines.md` "Auth e2e server" describes. Port 8701 is held by an older server; never stop it.
  - The outside-resources spec shows that no request leaves for the outside host. Record requests with `page.on("request")`.
- **Estimated complexity**: medium

## Integration
- **Branch**: `feat/mockup-grant-scope`
- **Merge strategy**: parallel-then-merge. Tracks 1 and 2 run in their own worktrees and merge into `feat/mockup-grant-scope`. Track 3 starts from both.

## Validation
- [ ] `uv --directory backend run pytest`, `uv --directory backend run ruff check .` and `uv --directory backend run mypy` pass.
- [ ] `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build` pass.
- [ ] `gin specs lint --change gin-console-dbt --against master` prints `ok`, and `gin specs trace --change gin-console-dbt` reports no missing REQ.
- [ ] Manual check with auth on: a confirmed mockup shows with its styles. Copying its iframe URL with the folder changed answers 404. The Reports mockup of 2026-11-12 shows in fallback fonts.

## Notes
- The user may override `Model:` and `Effort:` before plan approval.
- Deliverable merge-holds apply only to the Parent Bead `gin-console-dbt`. Track beads close after tests and review pass.
