# Plan: Compressed responses and bead list revalidation

Epic: gin-console-0nj
Spec: `01-proposal.md`, `02-spec-delta.md`, `03-design.md` in this folder. Diagram: `docs/specs/beads/diagrams/bead-list-transfer-activity.md`.

## Objective
- The server gzips every response of at least 1000 bytes when the client accepts gzip (REQ-SERVER-011).
- `GET /api/beads` sends a weak `ETag` derived from its body with `Cache-Control: no-cache`. It answers 304 without a body when `If-None-Match` names that tag, and sends no `ETag` with 404 or 502 (REQ-BEADS-014).

Every scenario of both REQs has a test naming its REQ. `gin-qa cases check --change gin-console-0nj` prints `ok`. TC-1 in `05-tests.md` passes on the Tailscale deploy.

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
- **Problem statement:** with "Show closed" on, the Beads page reloads 269 KB of `qwikfone` beads every 10 seconds per tab. The body is uncompressed and sent even when nothing changed.
- **Success criteria:**
  - Everything in the Objective.
  - `uv run --directory backend pytest`, `ruff check .`, `mypy`, `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass.
  - `gin specs lint --change gin-console-0nj --against master` prints `ok`, and `gin specs trace --change gin-console-0nj` lists no missing REQ.
- **Global constraints** (from the spec and `AGENTS.md`):
  - Backend only. No new dependency: `GZipMiddleware` comes from Starlette 1.7, already installed. The frontend does not change.
  - No server-side cache for `/api/beads`, because the snapshot store already rereads an export only when it changes (REQ-BEADS-012). REQ-UI-027 (reload every 10 seconds) is unchanged.
  - The `/api/beads` JSON body stays byte-for-byte what it is today; only headers and the 304 path are added.
  - The ETag is weak (`W/"<tag>"`). The tag is the first 16 hex characters of the SHA-256 of the serialized body.
  - Read-only. Linux, macOS and Windows paths are untouched.
  - New tests carry their REQ-ID in the name or a comment.
- **Non-goals:**
  - ETags on other endpoints.
  - Pagination.
  - Slower polling.

## Approach Options
### Option 1: ETag from the serialized body
- **Summary:** serialize the list once, hash it, and compare with `If-None-Match`.
- **Pros:**
  - Correct by construction, since any change to the body changes the tag.
  - No coupling to snapshot internals.
- **Cons:** the server still builds the list on every request (3–13 ms today).

### Option 2: ETag from the snapshot file key
- **Summary:** tag = export file key + `closed` flag; skip building the list on a match.
- **Pros:** saves the 3–13 ms build on a match.
- **Cons:**
  - Ties the HTTP layer to `SnapshotStore` internals.
  - A body change without a file change (for example a code change to the list) would keep a stale tag.

### Recommended Approach
- **Selected option:** Option 1.
- **Rationale:** it is the design confirmed on 2026-11-12. The build cost is already negligible, and the goal is the transfer.

## Scope
- **In scope:**
  - `backend/src/gin_console/app.py`, `backend/src/gin_console/beads/router.py`.
  - New `backend/tests/test_beads_transfer.py`.
  - `qa/cases/server/`, `qa/cases/beads/`.
  - `05-tests.md` (TC-1 result).
- **Out of scope:** everything under `frontend/`, other routers, `beads/snapshot.py`, `beads/source.py`.

## Execution Strategy

```yaml
execution_strategy:
  mode: worker
  workers:
    mode: parallel
  rationale: Track 1 (backend) and Track 2 (QA cases) share no file and Track 2 needs only the spec, so they run together; Track 3 is the human check after both merge.
```

## Tasks

### Track 1: Gzip and ETag on the bead list
- **Dependencies**: none
- **Requirements**: REQ-SERVER-011, REQ-BEADS-014
- **Files**:
  - Modify `backend/src/gin_console/app.py:1-52` (import and add `GZipMiddleware(minimum_size=1000)` after `app = FastAPI(...)`)
  - Modify `backend/src/gin_console/beads/router.py:1-41` (`get_beads` returns a `Response` with `ETag` and `Cache-Control`, or 304)
  - Create `backend/tests/test_beads_transfer.py`
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** two small, bounded backend changes with eight written scenarios. `If-None-Match` parsing has a few edge cases (list, weak and strong forms, `*`).
- **Acceptance criteria**:
  - Every scenario of REQ-SERVER-011 and REQ-BEADS-014 has a passing test naming its REQ.
  - The existing `/api/beads` tests pass unchanged.
  - The full backend suite, `ruff` and `mypy` pass.
- **Estimated complexity**: low

Interfaces produced:
```python
# beads/router.py
_LIST = TypeAdapter(list[BeadSummary])

def _tag(body: bytes) -> str:
    return 'W/"' + hashlib.sha256(body).hexdigest()[:16] + '"'

def _matches(if_none_match: str | None, etag: str) -> bool:
    """True when the header names `etag`: `*`, or any comma-separated entry equal to it with or without `W/`."""
    if if_none_match is None:
        return False
    bare = etag.removeprefix("W/")
    entries = [e.strip() for e in if_none_match.split(",")]
    return any(e == "*" or e.removeprefix("W/") == bare for e in entries)

@router.get("/beads", response_model=list[BeadSummary])
def get_beads(
    project: str | None = None,
    closed: str | None = None,
    if_none_match: str | None = Header(default=None),
) -> Response:
    cwd = project_dir(project)
    wants_closed = closed == "1"
    try:
        beads = list_beads(snapshots.get(cwd), wants_closed)
    except (BeadsError, RecursionError) as exc:
        return failure(exc)
    body = _LIST.dump_json(beads)
    etag = _tag(body)
    headers = {"ETag": etag, "Cache-Control": "no-cache"}
    if _matches(if_none_match, etag):
        return Response(status_code=304, headers=headers)
    return Response(content=body, media_type="application/json", headers=headers)
```

Steps:

1. **Tests.** Write `backend/tests/test_beads_transfer.py`. Copy the `Clock`, `make` and `touch_export` helpers of `test_beads_api.py` into the file; per the `local-fixtures` rule, fixtures stay beside their tests. Use `FakeExport` and `bead` from `fake_export.py`. Each test gets a `# REQ-…` comment:
   - `test_server_011_large_answer_is_gzipped`:
     - Setup: 30 beads with long titles (`bead(f"a-{n}", title="x" * 60)`).
     - `api.get("/api/beads", params={"project": "proj", "closed": "1"}, headers={"Accept-Encoding": "gzip"})`.
     - Expected: `r.headers["content-encoding"] == "gzip"`, and `r.json()` equals the list from the same request with `Accept-Encoding: identity`. httpx decompresses `r.content`.
   - `test_server_011_small_answer_is_not_gzipped`: `api.get("/api/health", headers={"Accept-Encoding": "gzip"})` has no `content-encoding`.
   - `test_server_011_client_without_gzip`: the 30-bead request with `Accept-Encoding: identity` has no `content-encoding`.
   - `test_beads_014_same_list_same_etag`: two GETs give equal `etag` headers starting with `W/"`, and `cache-control == "no-cache"`.
   - `test_beads_014_not_modified`: a second GET with `If-None-Match: <etag>` gives 304, the same `etag` and `r.content == b""`. The same holds for the strong form (`etag` without `W/`), for a list `"\"zzz\", <etag>"`, and for `*`.
   - `test_beads_014_changed_list`:
     - Get the `etag`.
     - Set `fake.beads[0]["title"] = "renamed"` and call `touch_export(tmp_path, 2_000_000_000)` so the snapshot rereads.
     - GET with `If-None-Match: <old etag>` gives 200 and a different `etag`.
   - `test_beads_014_show_closed`: the `etag` of `closed=1` differs from the `etag` without it, for a project with `CLOSED` beads.
   - `test_beads_014_failure_has_no_etag`: `make(tmp_path, FakeExport(failure=BeadsError("boom")))`. GET with `If-None-Match: "x"` gives 502 with `{"error": "boom"}` and no `etag`. `project=nope` gives 404 with no `etag`.
2. Run `uv run --directory backend pytest tests/test_beads_transfer.py`. Expect the gzip and ETag tests to fail.
3. **Gzip.** In `app.py`, add `from starlette.middleware.gzip import GZipMiddleware` and, right after `app = FastAPI(...)`, add `app.add_middleware(GZipMiddleware, minimum_size=1000)`.
4. **ETag.** In `beads/router.py`, add `import hashlib`, `from fastapi import Header`, `from fastapi.responses import Response` and `from pydantic import TypeAdapter`. Add `_LIST`, `_tag` and `_matches` at module level, and rewrite `get_beads` as in Interfaces. Keep `response_model=list[BeadSummary]` for documentation; FastAPI returns a `Response` as is.
5. Run:
   ```bash
   uv run --directory backend pytest
   uv run --directory backend ruff check .
   uv run --directory backend mypy
   ```
   Expect all to pass, including the existing `test_beads_api.py`.
6. Commit: `git commit -m "feat(server): gzip responses and revalidate the bead list with an ETag (gin-console-0nj)"`

### Track 2: QA cases
- **Dependencies**: none
- **Requirements**: REQ-SERVER-011, REQ-BEADS-014
- **Files**:
  - Create `qa/cases/server/` (cases for REQ-SERVER-011)
  - Create `qa/cases/beads/` (cases for REQ-BEADS-014)
- **Provider role**: `general`
- **Model:** `sonnet`
- **Effort:** `low`
- **Why:** case writing per scenario with the gin-qa CLI, which hands out IDs and pins.
- **Acceptance criteria**: `gin-qa cases check --change gin-console-0nj` prints `ok`, with no new finding in `gin-qa cases check`.
- **Estimated complexity**: low

Steps:

1. Run `gin-qa cases plan --change gin-console-0nj --format json`, and read `qa/guidelines.md`.
2. For each missing scenario, run `gin-qa cases new <capability> --type api --title "<title>" --req <REQ-ID>`. Fill Preconditions, Steps and Expected as standalone, one action per step. Each step is a request with its headers, for example `GET /api/beads?project=alpha&closed=1` with `Accept-Encoding: gzip`. Use priority high for "Not modified" and "Large API answer", medium otherwise.
3. Repeat `gin-qa cases check --change gin-console-0nj` until it prints `ok`.
4. Commit: `git commit -m "test(qa): cases for gzip and the bead list ETag (gin-console-0nj)"`

### Track 3: Check on the Tailscale deploy
- **Dependencies**: Track 1, Track 2
- **Requirements**: REQ-BEADS-014, REQ-SERVER-011
- **Files**:
  - Modify `docs/changes/gin-console-0nj-beads-transfer/05-tests.md` (TC-1 result)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** deploy with the recorded commands and record the user's result.
- **Human gate**: the user walks TC-1 on `https://instance-20260515-2304.tail5ca54e.ts.net:8443` and reports pass or fail.
- **Acceptance criteria**: TC-1 is recorded as `pass, giangdhwhtbr, <date> (Tailscale build of <commit>)`.
- **Estimated complexity**: low

Steps:

1. Deploy as the deploy memory records, running each as a separate command, from the main checkout on `feat/gin-console-0nj-beads-transfer` with the tracks merged:
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend install --frozen-lockfile`
   - `pnpm -C /home/gin/gin-fam/gin-console/frontend build`
   - `uv --directory /home/gin/gin-fam/gin-console/backend sync`
   - `systemctl --user restart gin-console`
   - `systemctl --user is-active gin-console`
   - `curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8700/api/health`, retrying for up to 12 seconds; it should answer `200`.
   - Check `curl -s -o /dev/null -H 'Accept-Encoding: gzip' -w '%{size_download}' 'http://127.0.0.1:8700/api/beads?project=qwikfone&closed=1'`; expect well under 269 KB.
   - Report the rollback command.
2. Ask the user to walk TC-1 and write the result into `05-tests.md`.

## Integration
- **Branch**: `feat/gin-console-0nj-beads-transfer`
- **Merge strategy**: parallel-then-merge. Tracks 1 and 2 merge in any order; Track 3 deploys the merged branch.

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .` and `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint` and `build` pass (unchanged frontend)
- [ ] `gin specs lint --change gin-console-0nj --against master` prints `ok`, and `gin specs trace --change gin-console-0nj` lists no missing REQ
- [ ] `gin-qa cases check --change gin-console-0nj` prints `ok`
- [ ] TC-1 passes on the Tailscale deploy

## Notes
- The Parent Bead `gin-console-0nj` stays open until the user confirms the merge. Track beads close after their tests and review pass.
- The user may override `Model:` and `Effort:` before approving the plan.
- Per the user's solo-work rule, the spec and this plan go in one commit at plan approval, with no push until the epic is done.
