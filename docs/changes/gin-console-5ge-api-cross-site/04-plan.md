# Plan: Refuse cross-site API requests

Epic: gin-console-5ge
Spec: `01-proposal.md`, `02-spec-delta.md`, and `03-design.md` in this folder.

## Objective

The server refuses `/api` requests that a browser marks as cross-site or same-site, except GETs of mockup files, so a mockup's `<img>`, `<script src>` or `<link>` and pages of other origins reach no endpoint.

Architecture: one HTTP middleware in `create_app` reads `Sec-Fetch-Site`; the mockup CSP, sandbox and file checks stay as they are.

Tech stack: FastAPI and Starlette, pytest, ruff, mypy strict; Playwright with gin-qa.

Done when every scenario of REQ-SERVER-012 and REQ-REQUIREMENTS-011 has a test naming its REQ, all checks in Validation pass, and TC-1 passes on the Tailscale build.

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
- **Problem statement:** a mockup's elements, and pages of other origins, can still send requests to `/api`; only `fetch` and XHR are blocked by the mockup CSP.
- **Success criteria:** those of `01-proposal.md`.
- **Global constraints** (from the spec):
  - "for every method, except a GET request under `/api/requirements/mockups/<project>/files/`".
  - "A request with `Sec-Fetch-Site` `same-origin` or `none`, or without the header, SHALL be handled as before."
  - The 403 body is `{"error": "cross-site request refused"}` and names no path.
  - The mockup CSP, sandbox and file checks of ADR 0004 do not change.
- **Non-goals:** authentication, CORS headers, CSRF tokens, a path-limited CSP.

## Approach Options
### Option 1: Middleware in create_app
- Summary: one `@app.middleware("http")` function before the routers.
- Pros: one place; every router and the 404 catch-all are covered.
- Cons: none for one origin.

### Option 2: A FastAPI dependency on the `/api` router
- Summary: `APIRouter(prefix="/api", dependencies=[...])`.
- Pros: closer to the routes.
- Cons: the dependency runs after routing, so it would not cover `/api` itself, and it is easy to miss for a router added later.

### Recommended Approach
- Selected option: Option 1.
- Rationale: it runs for every `/api` path before any endpoint, including ones added later.

## Scope
- In scope: REQ-SERVER-012, REQ-REQUIREMENTS-011, ADR 0004 consequences (already written in the change).
- Out of scope: the non-goals above.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: three small tracks, each depending on the previous one.
```

## Tasks

### Track 1: Refuse cross-site API requests
- **Dependencies**: none
- **Requirements**: REQ-SERVER-012
- **Files**:
  - Modify `backend/src/gin_console/app.py:73-77` (the middleware after the gzip middleware)
  - Test `backend/tests/test_cross_site.py`
- **Interfaces**: produces `refuses_cross_site(method: str, path: str, site: str | None) -> bool` in `app.py`; consumes nothing new.
- **Provider role**: `backend`
- **Model:** `opus`
- **Effort:** `high`
- **Why:** a security check on every API request; a mistake in the exception lets requests through or breaks mockups.
- **Acceptance criteria**: every scenario of REQ-SERVER-012 has a passing test; the refresh test proves the pull runner is not called; ruff and mypy pass.
- **Estimated complexity**: low

Steps:

1. Write `backend/tests/test_cross_site.py`:
   ```python
   from pathlib import Path

   import pytest
   from fake_bd import FakeBd
   from fastapi.testclient import TestClient

   from gin_console.app import create_app, refuses_cross_site
   from gin_console.config import ProjectEntry, Settings

   FILE = "/api/requirements/mockups/m/files/ui/2026-11-22/style.css"


   def client(tmp_path: Path, bd: FakeBd) -> TestClient:
       (tmp_path / "dist").mkdir()
       (tmp_path / "dist" / "index.html").write_text("<html>console</html>")
       (tmp_path / "p").mkdir()
       settings = Settings(projects=[ProjectEntry(name="p", path=tmp_path / "p")])
       return TestClient(create_app(settings, static_dir=tmp_path / "dist", run_bd=bd, schedule_pulls=False))


   # REQ-SERVER-012
   @pytest.mark.parametrize(
       ("method", "path", "site", "refused"),
       [
           ("GET", "/api/projects/beads", "cross-site", True),
           ("GET", "/api/projects/beads", "same-site", True),
           ("POST", "/api/refresh", "cross-site", True),
           ("GET", "/api", "cross-site", True),
           ("GET", "/api/projects/beads", "same-origin", False),
           ("GET", "/api/projects/beads", "none", False),
           ("GET", "/api/projects/beads", None, False),
           ("GET", "/api/projects/beads", "Cross-Site", True),
           ("GET", FILE, "cross-site", False),
           ("POST", FILE, "cross-site", True),
           ("GET", "/api/requirements/mockups/m/other/x.css", "cross-site", True),
           ("GET", "/api/requirements/mockups?project=m", "cross-site", True),
           ("GET", "/api/requirements/mockups/files/x", "cross-site", True),
           ("GET", "/beads", "cross-site", False),
           ("GET", "/apix", "cross-site", False),
       ],
   )
   def test_server_012_rule(method: str, path: str, site: str | None, refused: bool) -> None:
       assert refuses_cross_site(method, path.split("?")[0], site) is refused
   ```
   Then one test per scenario through the client: "Image from another site" (GET `/api/projects/beads` with `sec-fetch-site: cross-site` → 403 and body exactly `{"error": "cross-site request refused"}`), "Refresh from another site" (POST `/api/refresh` cross-site → 403 and `bd.calls == []`), "The console itself" (`same-origin` → 200), "Tools" (no header → 200), "Mockup files" (the GET of `FILE` with `cross-site` does not get 403: it reaches the endpoint, which answers 404 here because `p` has no such folder; the POST gets 403). Run `uv run --directory backend pytest tests/test_cross_site.py`; expect failures (import error).
2. In `app.py`, at module level:
   ```python
   _REFUSED_SITES = {"cross-site", "same-site"}
   _MOCKUP_FILES = re.compile(r"/api/requirements/mockups/[^/]+/files/")


   def refuses_cross_site(method: str, path: str, site: str | None) -> bool:
       """REQ-SERVER-012: a browser marks requests of other sites; only a mockup's GETs of its own files pass."""
       if site is None or site.lower() not in _REFUSED_SITES:
           return False
       if path != "/api" and not path.startswith("/api/"):
           return False
       return not (method == "GET" and _MOCKUP_FILES.match(path) is not None)
   ```
   and in `create_app`, right after `app.add_middleware(GZipMiddleware, ...)`:
   ```python
   @app.middleware("http")
   async def refuse_cross_site(
       request: Request, call_next: Callable[[Request], Awaitable[Response]]
   ) -> Response:
       if refuses_cross_site(request.method, request.url.path, request.headers.get("sec-fetch-site")):
           return JSONResponse(status_code=403, content={"error": "cross-site request refused"})
       return await call_next(request)
   ```
   Imports: `re`, `Awaitable` from `collections.abc`, `Request` from `fastapi`, `JSONResponse` from `fastapi.responses`. Rerun; expect pass.
3. Run `uv run --directory backend pytest && uv run --directory backend ruff check . && uv run --directory backend mypy`; expect pass. Commit `feat(server): refuse cross-site API requests (gin-console-5ge)`.

### Track 2: Mockup elements in the isolation spec
- **Dependencies**: Track 1
- **Requirements**: REQ-REQUIREMENTS-011, REQ-SERVER-012
- **Files**:
  - Modify `qa/e2e/support/mockup-server.ts:10-17` (`MOCKUP`: an `<img>` and a `<script src>` to `/api/projects/beads`)
  - Modify `qa/e2e/requirements/tc-requirements-037.spec.ts`
  - Modify `qa/cases/requirements/TC-REQUIREMENTS-037-script-calls-the-api.e2e.md`
  - Create `qa/cases/requirements/` cases for the new scenario of REQ-REQUIREMENTS-011 and `qa/cases/server/` api cases for REQ-SERVER-012 (ids from `gin-qa cases next-id`)
  - Modify `backend/tests/test_server_cases_api.py` (the api cases' tests, `# TC:` markers)
- **Interfaces**: consumes the 403 of Track 1.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** follows the existing gin-qa case and spec style; no product code.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-5ge` prints `ok`; TC-REQUIREMENTS-037 passes and fails when the middleware is removed; cases citing the changed REQ carry the new hash.
- **Estimated complexity**: low

Steps:

1. Read the `gin-console-qa` skill and `qa/guidelines.md`. Write or update the cases with `gin-qa:cases --change gin-console-5ge`.
2. In `MOCKUP` add `<img id="img" src="/api/projects/beads?from=img">` and `<script src="/api/projects/beads?from=script"></script>`. In the spec, count the server log lines that reach the endpoint: `"GET /api/projects/beads?from=img HTTP/1.1" 200` and the same for `script` must not appear, while the `403` lines for both must appear (in the frame and in the tab). Keep every existing assertion.
3. Prove the spec fails with the middleware removed (temporary edit, restored; `git diff` on `backend/src` empty afterwards). Run the changed specs with `--trace off` on a port of this checkout's build; port 8701 may belong to another checkout.
4. Run `gin specs trace --change gin-console-5ge`; expect no missing REQ. Commit `test(server): cross-site cases and mockup element checks (gin-console-5ge)`.

### Track 3: TC-1 on the Tailscale build
- **Dependencies**: Track 2
- **Requirements**: REQ-SERVER-012, REQ-REQUIREMENTS-011
- **Files**:
  - Modify `docs/changes/gin-console-5ge-api-cross-site/05-tests.md` (TC-1 evidence)
- **Interfaces**: consumes the deployed console.
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a scripted check of the deployed console; no product code.
- **Human gate**: the user builds and restarts the deployed service (`pnpm -C frontend build && systemctl --user restart gin-console`)
- **Acceptance criteria**: TC-1 is recorded with its result; evidence stays under the git-ignored `qa/evidence/`.
- **Estimated complexity**: low

Steps:

1. After the user's restart, with Playwright on the Tailscale build: open Overview, Beads, Milestones, Reports and Requirements and check each loads its data; open a confirmed mockup and check its CSS and images load; from the mockup's page check that an `<img>` to `/api/projects/beads` gets 403.
2. Record the result in `05-tests.md` and commit `test(server): TC-1 (gin-console-5ge)`.

## Integration
- **Branch**: `feat/api-cross-site`
- **Merge strategy**: sequential

## Validation
- [ ] `uv run --directory backend pytest && uv run --directory backend ruff check . && uv run --directory backend mypy`
- [ ] `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`
- [ ] `gin specs lint --change gin-console-5ge --against master` and `gin specs trace --change gin-console-5ge`
- [ ] `gin-qa cases check --change gin-console-5ge`
- [ ] TC-1 on the Tailscale build

## Notes
- The epic has no comments.
- Track beads close after tests and review; the epic stays open until the human-confirmed merge.
