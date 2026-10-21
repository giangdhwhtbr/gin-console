# Plan: Comments and authors

Epic: gin-console-rm-beads-native
Spec: docs/changes/gin-console-rm-beads-native-comments/ (proposal.md, spec-delta.md, design.md, tests.md)

This is change C of five under the epic (A browse and B Board and Focus are shipped; C comments and authors; D dependency tree; E retire Scotty). Shipping it must NOT close the epic.

## Objective

The bead page shows who created a bead, its acceptance criteria, design, notes and close reason, and its comments: a read-only `GET /api/beads/{project}/{id}/comments`, the new fields on the list and detail, and a Comments section that loads after the page, with its own error and Retry.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: read the discussion and the full text of a bead natively in the console, so that Scotty is no longer needed for it (change C of the epic that ends with retiring Scotty).
- Architecture: backend `beads/` gains a `Comment` model, `get_comments` in `source.py` (the only module that knows the `bd` JSON), a keyed cache and the endpoint in `router.py`; `BeadSummary` gains `created_by` and `BeadDetail` the four text fields. Frontend `features/beads/` gains `fetchComments` and the new fields in `api.ts`, a `TextSection` and a `CommentList` component, and `BeadDetailPage` renders them. No new dependency.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Read-only: only `bd list`, `bd show`, `bd dep list`, `bd ready`, `bd blocked` and `bd comments` run, with fixed arguments, in the project directory; a bead id is validated before it can reach an argument list and is placed after `--`; nothing is ever created, updated, closed or deleted (never `bd comments add`).
- Single machine, Tailscale-only access; no authentication.
- Non-goals: writing or editing comments, Markdown rendering, a human/agent badge, `created_by` on the List or Board, searching comment text, the dependency tree (change D), retiring Scotty (change E).
- Titles, comments, notes and every other text come from people and agents: render them as plain text only.
- Automated tests carry the REQ-ID in the test name or a comment.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`:
  - `brainstorm`: `high_reasoning`
  - `design`: `high_reasoning`
  - `plan`: `standard_impl`
  - `implement`: `standard_impl`
  - `review`: `high_reasoning`
  - `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: the bead page shows only a comment count and the description, so Scotty is still needed to read comments, the design, the acceptance criteria and who created a bead.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; on the live host the bead page of `qwikfone-02a.1` shows its comment with author and time, and a bead with design or acceptance criteria shows those sections.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: A separate comments endpoint, loaded after the bead (selected in discuss)
- Summary: the detail endpoint gains the plain fields; comments come from their own endpoint and component.
- Pros: the page shows at once; a long thread or a `bd comments` failure never blocks it; its own error and Retry.
- Cons: one more request for beads that have comments.

### Option 2: Put the comments in the detail response
- Pros: one request.
- Cons: every detail call pays for `bd comments`; one failure breaks the whole page.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-BEADS-008, REQ-BEADS-009, REQ-UI-038..040.
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three tracks in a dependency chain (backend comments and fields, frontend data layer, bead page); each needs the previous one's interface, so one agent working in order is simplest.
```

## Verified facts about `bd` (checked on this host; the code below relies on them)

- `bd comments --json -- <id>` returns a list of `{id, issue_id, author, text, created_at}` ordered by time (a 2810-character comment exists on `qwikfone-02a.1`). Flags must come before `--`.
- For an unknown id it exits 1 and prints JSON `{"error": "resolving nope-1: no issue found matching \"nope-1\"", "schema_version": 1}` on stdout, like `bd show`.
- `bd show --json` includes `created_by`, `design`, `notes`, `acceptance_criteria` and `close_reason` (keys may be absent or empty); `bd list --json` rows include `created_by`.
- Values of `created_by` and `author` are account names such as `giangdhwhtbr` and `gin`; they do not tell a person from an agent, so names are shown as text only.

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/beads/models.py` (modify) | `Comment`, `created_by`, the four text fields | 1 |
| `backend/src/gin_console/beads/source.py` (modify) | `get_comments`, the new detail fields | 1 |
| `backend/src/gin_console/beads/router.py` (modify) | the comments endpoint and cache | 1 |
| `backend/tests/fake_bd.py` (modify) | `comment` helper and the fake `comments` command | 1 |
| `backend/tests/test_beads_source.py`, `test_beads_api.py` (modify) | REQ-BEADS-008, REQ-BEADS-009 | 1 |
| `frontend/src/features/beads/api.ts` (modify) | `Comment`, `fetchComments`, new fields and guards | 2 |
| `frontend/src/features/beads/api.test.ts` and the bead fixtures of `beadFixtures.ts`, `BeadsPage.test.tsx`, `BeadDetailPage.test.tsx`, `frontend/src/app/App.test.tsx` (modify) | guard tests; fixtures get the new fields | 2 |
| `frontend/src/features/beads/{TextSection,CommentList}.tsx` (create), `BeadDetailPage.tsx` (modify) | the sections and the comments | 3 |
| `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/app/App.test.tsx` (modify) | REQ-UI-038, 039, 040 | 3 |

## Tasks

### Track 1: Comments endpoint and author fields
- **Dependencies**: none
- **Requirements**: REQ-BEADS-008, REQ-BEADS-009
- **Files**: modify `backend/src/gin_console/beads/{models,source,router}.py`, `backend/tests/{fake_bd,test_beads_source,test_beads_api}.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-BEADS-008 and REQ-BEADS-009 has a passing pytest test named/commented with its REQ-ID; an unsafe id never reaches an argument list; `bd` errors become `BeadsError` or `BeadNotFound`, never another exception; a malformed comment never fails the list of comments; ruff and mypy clean; independent review approved.
- **Estimated complexity**: medium

Interfaces produced: `Comment(id, author, text, created_at, truncated)`, `MAX_COMMENT_CHARS = 20_000`, `get_comments(run, cwd, bead_id) -> list[Comment]`, `BeadSummary.created_by: str | None`, `BeadDetail.design / notes / acceptance_criteria / close_reason: str | None`, route `GET /api/beads/{project}/{bead_id}/comments`.

- [ ] **Step 1: update the fake** `backend/tests/fake_bd.py`. Add the helper

```python
def comment(ident: str, text: str = "hello", **overrides: Any) -> dict[str, Any]:
    base: dict[str, Any] = {
        "id": f"cmt-{ident}-{len(text)}",
        "issue_id": ident,
        "author": "me",
        "text": text,
        "created_at": "2026-10-12T10:00:00Z",
    }
    base.update(overrides)
    return base
```

and a constructor parameter `comments: dict[str, list[Any]] | None = None` stored as `self.comments = comments or {}`. In `__call__`, before the final `raise AssertionError`, add:

```python
        if args[0] == "comments":
            if ident not in self.shown and ident not in self.comments:
                return {"error": f'resolving {ident}: no issue found matching "{ident}"'}
            return self.comments.get(ident, [])
```

(`ident = args[-1]` is already defined above for `show` and `dep list`; the new branch must come after that line.)

- [ ] **Step 2: failing tests.** Append to `test_beads_source.py` (add `comment` to the `fake_bd` import and `get_comments`, `MAX_COMMENT_CHARS` to the `gin_console.beads.source` import):

```python
# REQ-BEADS-008
def test_beads_008_comments_in_order_with_arguments() -> None:
    first = comment("a-5", "first", created_at="2026-10-11T10:00:00Z")
    second = comment("a-5", "second text", created_at="2026-10-12T10:00:00Z")
    fake = FakeBd(shown={"a-5": bead("a-5")}, comments={"a-5": [first, second]})
    comments = get_comments(fake, CWD, "a-5")
    assert [c.text for c in comments] == ["first", "second text"]
    assert comments[0].author == "me" and comments[0].created_at == "2026-10-11T10:00:00Z"
    assert not comments[0].truncated
    assert fake.calls == [(["comments", "--json", "--", "a-5"], CWD)]


# REQ-BEADS-008
def test_beads_008_long_comment_is_cut_and_marked() -> None:
    long = comment("a-5", "x" * 25_000)
    exact = comment("a-5", "y" * MAX_COMMENT_CHARS)
    fake = FakeBd(shown={"a-5": bead("a-5")}, comments={"a-5": [long, exact]})
    cut, whole = get_comments(fake, CWD, "a-5")
    assert len(cut.text) == MAX_COMMENT_CHARS and cut.truncated
    assert len(whole.text) == MAX_COMMENT_CHARS and not whole.truncated


# REQ-BEADS-008
def test_beads_008_no_comments_is_an_empty_list() -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert get_comments(fake, CWD, "a-5") == []


# REQ-BEADS-008
def test_beads_008_a_malformed_comment_is_dropped() -> None:
    fake = FakeBd(
        shown={"a-5": bead("a-5")},
        comments={"a-5": [comment("a-5", "ok"), comment("a-5") | {"text": 7}, "x", {"id": "z"}]},
    )
    assert [c.text for c in get_comments(fake, CWD, "a-5")] == ["ok"]


# REQ-BEADS-008
def test_beads_008_unknown_bead_is_not_found() -> None:
    with pytest.raises(BeadNotFound):
        get_comments(FakeBd(), CWD, "x-1")


# REQ-BEADS-008
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a b", ""])
def test_beads_008_an_invalid_id_never_reaches_bd(ident: str) -> None:
    fake = FakeBd()
    with pytest.raises(BeadNotFound):
        get_comments(fake, CWD, ident)
    assert fake.calls == []


# REQ-BEADS-008
# REQ-BEADS-005
@pytest.mark.parametrize("output", [{"x": 1}, "text", 5])
def test_beads_008_unexpected_output(output: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        get_comments(FakeBd(output=output), CWD, "a-5")


# REQ-BEADS-008
# REQ-BEADS-006
def test_beads_008_lone_surrogates_are_replaced() -> None:
    fake = FakeBd(
        shown={"a-5": bead("a-5")},
        comments={"a-5": [comment("a-5", "bad \ud800 text", author="a\udc00b")]},
    )
    (item,) = get_comments(fake, CWD, "a-5")
    item.text.encode("utf-8")
    item.author.encode("utf-8")


# REQ-BEADS-009
def test_beads_009_author_and_text_fields() -> None:
    shown = bead(
        "a-5",
        created_by="gin",
        design="the design",
        notes="some notes",
        acceptance_criteria="it works",
        close_reason="done",
    )
    detail = get_bead(FakeBd(shown={"a-5": shown}), CWD, "a-5")
    assert detail.created_by == "gin"
    assert (detail.design, detail.notes) == ("the design", "some notes")
    assert (detail.acceptance_criteria, detail.close_reason) == ("it works", "done")


# REQ-BEADS-009
def test_beads_009_absent_or_empty_texts_are_null() -> None:
    detail = get_bead(FakeBd(shown={"a-5": bead("a-5", design="", created_by=None)}), CWD, "a-5")
    assert detail.design is None and detail.notes is None
    assert detail.acceptance_criteria is None and detail.close_reason is None
    assert detail.created_by is None


# REQ-BEADS-009
def test_beads_009_list_rows_carry_created_by() -> None:
    (row,) = list_beads(FakeBd([bead("a-1", created_by="gin")]), CWD, closed=False)
    assert row.created_by == "gin"
```

(the `bead` helper of `fake_bd.py` already sets `created_by: "me"`; the second test overrides it with `None`, which `_SUMMARY_KEYS` passes through as `None`.)

Append to `test_beads_api.py` (add `comment` to the `fake_bd` import):

```python
# REQ-BEADS-008
def test_beads_008_comments_over_http(tmp_path: Path) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")}, comments={"a-5": [comment("a-5", "hi")]})
    body = make(tmp_path, fake).get("/api/beads/proj/a-5/comments").json()
    assert [(c["author"], c["text"], c["truncated"]) for c in body] == [("me", "hi", False)]
    assert {"id", "author", "text", "created_at", "truncated"} == set(body[0])


# REQ-BEADS-008
@pytest.mark.parametrize(
    "path",
    [
        "/api/beads/proj/x-1/comments",
        "/api/beads/nope/a-5/comments",
        "/api/beads/gone/a-5/comments",
    ],
)
def test_beads_008_unknown_bead_or_project_is_404(tmp_path: Path, path: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(path).status_code == 404


# REQ-BEADS-008
# REQ-BEADS-003
@pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
def test_beads_008_unsafe_ids_are_404_and_run_nothing(tmp_path: Path, ident: str) -> None:
    fake = FakeBd(shown={"a-5": bead("a-5")})
    assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}/comments").status_code == 404
    assert fake.calls == []


# REQ-BEADS-008
# REQ-BEADS-005
def test_beads_008_failure_is_502_and_not_cached(tmp_path: Path) -> None:
    fake = FakeBd(
        shown={"a-5": bead("a-5")}, failing={"comments": BeadsError("bd comments failed")}
    )
    api = make(tmp_path, fake)
    response = api.get("/api/beads/proj/a-5/comments")
    assert response.status_code == 502 and "bd comments failed" in response.json()["error"]
    fake.failing = {}
    assert api.get("/api/beads/proj/a-5/comments").status_code == 200


# REQ-BEADS-008
def test_beads_008_unexpected_shape_is_502(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(shown={"a-5": bead("a-5")}, bad={"comments": {"x": 1}}))
    assert api.get("/api/beads/proj/a-5/comments").status_code == 502


# REQ-BEADS-008
# REQ-BEADS-004
def test_beads_008_cached_for_five_seconds(tmp_path: Path) -> None:
    clock = Clock()
    fake = FakeBd(shown={"a-5": bead("a-5")}, comments={"a-5": [comment("a-5")]})
    api = make(tmp_path, fake, clock)
    api.get("/api/beads/proj/a-5/comments")
    clock.now += timedelta(seconds=2)
    api.get("/api/beads/proj/a-5/comments")
    assert len(fake.calls) == 1
    clock.now += timedelta(seconds=4)
    api.get("/api/beads/proj/a-5/comments")
    assert len(fake.calls) == 2


# REQ-BEADS-009
def test_beads_009_fields_over_http(tmp_path: Path) -> None:
    shown = bead("a-5", created_by="gin", design="D", notes="N")
    api = make(tmp_path, FakeBd([bead("a-1", created_by="gin")], shown={"a-5": shown}))
    detail = api.get("/api/beads/proj/a-5").json()
    assert detail["created_by"] == "gin" and detail["design"] == "D" and detail["notes"] == "N"
    assert detail["acceptance_criteria"] is None and detail["close_reason"] is None
    rows = api.get("/api/beads", params={"project": "proj"}).json()
    assert rows[0]["created_by"] == "gin"
```

Run `uv --directory backend run pytest -q`; the new tests fail.

- [ ] **Step 3: models.** In `beads/models.py` add to `BeadSummary`, after `blocked: bool = False`: `created_by: Text | None = None`. Add to `BeadDetail`, after `description`:

```python
    design: Text | None = None
    notes: Text | None = None
    acceptance_criteria: Text | None = None
    close_reason: Text | None = None
```

and the new model (after `Relation`):

```python
class Comment(BaseModel):
    model_config = ConfigDict(strict=True)

    id: Text
    author: Text
    text: Text
    created_at: Text
    truncated: bool = False
```

- [ ] **Step 4: source.** In `beads/source.py` import `Comment` with the other models, add `"created_by"` at the end of `_SUMMARY_KEYS`, add `MAX_COMMENT_CHARS = 20_000` next to `BD_TIMEOUT`, and in `get_bead` extend the dict passed to `BeadDetail.model_validate` with:

```python
                "design": raw.get("design") or None,
                "notes": raw.get("notes") or None,
                "acceptance_criteria": raw.get("acceptance_criteria") or None,
                "close_reason": raw.get("close_reason") or None,
```

Then add (after `get_bead`):

```python
def _comment(raw: Any) -> Comment | None:
    if not isinstance(raw, dict):
        return None
    try:
        comment = Comment.model_validate(
            {k: raw[k] for k in ("id", "author", "text", "created_at") if k in raw}
        )
    except ValidationError:
        return None
    if len(comment.text) <= MAX_COMMENT_CHARS:
        return comment
    return comment.model_copy(update={"text": comment.text[:MAX_COMMENT_CHARS], "truncated": True})


def get_comments(run: BdRunner, cwd: Path, bead_id: str) -> list[Comment]:
    if not valid_id(bead_id):
        raise BeadNotFound(bead_id)
    data = run(["comments", "--json", "--", bead_id], cwd, json_on_failure=True)
    _fail_on_error(data)
    if not isinstance(data, list):
        raise BeadsError("bd comments output was not understood")
    return [item for item in map(_comment, data) if item is not None]
```

- [ ] **Step 5: router.** In `beads/router.py` import `Comment` and `get_comments`, create `comments = KeyedCache[tuple[str, str], list[Comment]](TTL, clock)` next to the other caches and add, after `get_one`:

```python
    @router.get("/beads/{project}/{bead_id}/comments", response_model=list[Comment])
    def get_bead_comments(project: str, bead_id: str) -> list[Comment] | JSONResponse:
        cwd = project_dir(project)
        if not valid_id(bead_id):
            raise HTTPException(status_code=404)
        try:
            return comments.get((project, bead_id), lambda: get_comments(run, cwd, bead_id))
        except BeadNotFound:
            raise HTTPException(status_code=404) from None
        except (BeadsError, RecursionError) as exc:
            return failure(exc)
```

- [ ] **Step 6: validate.** `uv --directory backend run pytest -q`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy` are green (run `ruff format` only on the files you touched). The real-host check is run by the orchestrator, not the worker: `get_comments(run_bd, Path.home() / "qwikfone", "qwikfone-02a.1")` returns one comment by `giangdhwhtbr` of about 2810 characters, and a bead without comments returns `[]`.

### Track 2: Frontend data layer
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-038, REQ-UI-039, REQ-UI-040 (the data and guard parts; the screens are Track 3)
- **Files**: modify `frontend/src/features/beads/{api.ts,api.test.ts}` and only the bead fixtures (add `created_by: null`, and in detail fixtures `design: null, notes: null, acceptance_criteria: null, close_reason: null`) in `frontend/src/features/beads/{beadFixtures.ts,BeadsPage.test.tsx,BeadDetailPage.test.tsx}` and `frontend/src/app/App.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the guards require `created_by` (string or null), the four detail texts (string or null) and, for comments, string `id`, `author`, `text`, `created_at` and boolean `truncated`; `fetchComments` maps 404 to `BeadNotFoundError`; all earlier frontend tests pass after their fixtures get the new fields; the four frontend commands are green.
- **Estimated complexity**: low

Interfaces produced: `Comment` (`{ id: string; author: string; text: string; created_at: string; truncated: boolean }`), `fetchComments(project: string, id: string): Promise<Comment[]>`, `BeadSummary.created_by: string | null`, `BeadDetail.design / notes / acceptance_criteria / close_reason: string | null`.

- [ ] **Step 1: failing tests** in `api.test.ts` (use its existing helpers; each title carries the REQ-ID):
  - REQ-UI-038: a summary without `created_by` is rejected (`Could not load beads (unexpected response)`); `created_by: 5` is rejected; `null` and a string are accepted. A detail whose `design` is `5` (or whose `notes`, `acceptance_criteria`, `close_reason` is missing) is rejected by `fetchBead` (`Could not load the bead (unexpected response)`); the four texts may be `null` or strings.
  - REQ-UI-039: `fetchComments("my proj", "a/1")` requests `/api/beads/my%20proj/a%2F1/comments` and returns the parsed comments.
  - REQ-UI-040: a 404 rejects with `BeadNotFoundError`; a 502 `{"error": "bd comments failed"}` rejects with an `Error` whose message is `bd comments failed`; a body `{"x": 1}`, a non-array, or an item with `truncated: "no"`, `text: 7` or a missing `author` rejects with `Could not load the comments (unexpected response)`.
  - Add the new fields to the fixtures first (listed under Files) so that the earlier tests keep passing; then run `pnpm -C frontend test --run`; the new tests fail.

- [ ] **Step 2: `api.ts`.**
  - Add to `BeadSummary`: `created_by: string | null;` (after `blocked`). Add to `BeadDetail`: `design: string | null; notes: string | null; acceptance_criteria: string | null; close_reason: string | null;`.
  - Export the type: `export type Comment = { id: string; author: string; text: string; created_at: string; truncated: boolean };`.
  - In `isSummary` add `"created_by"` to the `isStringOrNull` key list: `["owner", "assignee", "parent", "closed_at", "created_by"]`. In `isDetail` replace `isStringOrNull(field(value, "description")) &&` by `["description", "design", "notes", "acceptance_criteria", "close_reason"].every((k) => isStringOrNull(field(value, k))) &&`.
  - Add:

```ts
function isComment(value: unknown): value is Comment {
  return (
    isObject(value) &&
    ["id", "author", "text", "created_at"].every((k) => isString(field(value, k))) &&
    typeof field(value, "truncated") === "boolean"
  );
}

export async function fetchComments(project: string, id: string): Promise<Comment[]> {
  const response = await fetch(
    `/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/comments`,
  );
  if (!response.ok) throw await failure(response, "Bead");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isComment)) {
    throw new Error("Could not load the comments (unexpected response)");
  }
  return body;
}
```

- [ ] **Step 3: validate.** `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` are green; all earlier tests pass.

### Track 3: Bead page: author, text sections and comments
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-038, REQ-UI-039, REQ-UI-040
- **Files**: create `frontend/src/features/beads/{TextSection,CommentList}.tsx`; modify `frontend/src/features/beads/BeadDetailPage.tsx`, `frontend/src/features/beads/BeadDetailPage.test.tsx`, `frontend/src/app/App.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-038, 039 and 040 has a vitest test; text and comments are plain text; comments load after the bead, with their own Retry; no comments request when the count is 0; a late answer for a previous bead never replaces the current one; rules of the previous frontend reviews hold (cleanup in tests, fresh `Response` per call, no setState in effects, no clock read during render, no `as`/`any`/`!` (`as const` is fine), one component per file).
- **Estimated complexity**: medium

Interfaces consumed: Track 2. Produced: `TextSection({ title, text })`, `CommentList({ project, id })`.

- [ ] **Step 1: failing tests.** In `BeadDetailPage.test.tsx` add a helper that routes `fetch` by URL, and use it for the new tests and for the existing test `REQ-UI-028 shows fields and description as plain text` (that bead has `comment_count: 3`, so its stub must also answer the comments URL, with `[]`):

```tsx
const stubFetch = (detail: BeadDetail, comments: () => Response | Promise<Response> = () => json([])) =>
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      return Promise.resolve(url.endsWith("/comments") ? comments() : json(detail));
    }),
  );

const note = (id: string, overrides: Partial<Comment> = {}): Comment => ({
  id,
  author: "alice",
  text: `Text of ${id}`,
  created_at: "2026-10-05T10:00:00Z",
  truncated: false,
  ...overrides,
});
```

(import `type Comment` from `./api`). Tests (each title carries the REQ-ID):
  - REQ-UI-038 sections and order: a bead with `acceptance_criteria: "AC"`, `notes: "N"`, `close_reason: "R"`, `design: null`, `created_by: "gin"` -> the meta line contains `Created by gin`; the headings `Acceptance criteria`, `Notes`, `Close reason` are present in that order (compare the order of `screen.getAllByRole("heading", { level: 2 })` names, ignoring other headings) and there is no heading `Design`.
  - REQ-UI-038 plain text: `design: "<script>window.hacked = 1</script> **bold**\nline two"` is found as the text of a `P` with class `whitespace-pre-wrap`, and `container.querySelector("script")` and `container.querySelector("strong")` are null.
  - REQ-UI-038 no author: `created_by: null` -> the page text has no `Created by`.
  - REQ-UI-039 comments listed: `comment_count: 2`; the comments answer is held back by a deferred promise: `Loading comments…` shows while the bead heading is already there; after resolving with `note("c-2", { created_at: "2026-10-06T10:00:00Z" })` and `note("c-1")`, the heading `Comments (2)` appears and both texts and `alice` are shown, each time with `new Date(created_at).toLocaleString()` (the answer is already oldest first; the page does not reorder).
  - REQ-UI-039 none requested: `comment_count: 0` -> `fetch` is called exactly once (the bead) and there is no `Comments` heading.
  - REQ-UI-039 plain text: a comment text `<script>window.hacked = 1</script>` appears as text and `container.querySelector("script")` is null.
  - REQ-UI-039 truncated: `note("c-1", { truncated: true })` shows `Comment truncated`; a normal comment does not.
  - REQ-UI-040 failure and retry: the first comments answer is 502 `{"error": "bd comments failed"}`, the second succeeds -> the bead heading and fields stay, the alert contains `bd comments failed`, clicking its `Retry` shows the comments and removes the alert; the bead was requested once (the Retry repeats only the comments request).
  - REQ-UI-040 unexpected shape: the comments answer `{"x": 1}` shows an alert containing `unexpected response` with a Retry button.
  `App.test.tsx`: add `REQ-UI-040 a late comments answer for the previous bead never replaces the current one`: start at `/beads/alpha/a-5` (detail with `comment_count: 1`), hold the `a-5` comments answer with a deferred promise, navigate to `/beads/alpha/a-6` (`window.history.pushState` then `window.dispatchEvent(new PopStateEvent("popstate"))` inside `act`), whose comments answer immediately with `Text of a-6`; after `a-6` shows, resolve the held answer with `Text of a-5`; `Text of a-6` is still shown and `Text of a-5` never appears. (Remounting by the page's `key` already provides this; the test locks it in.) Add the new fields (`created_by: null`, the four texts `null`) to the inline bead objects first if Track 2 has not.
  Run `pnpm -C frontend test --run`; expect the new tests to fail.

- [ ] **Step 2: `TextSection.tsx`:**

```tsx
export function TextSection({ title, text }: { title: string; text: string | null }) {
  if (text === null) return null;
  return (
    <section className="flex flex-col gap-1">
      <h2 className="font-medium">{title}</h2>
      <p className="whitespace-pre-wrap break-words">{text}</p>
    </section>
  );
}
```

- [ ] **Step 3: `CommentList.tsx`:**

```tsx
import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { fetchComments, type Comment } from "./api";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; comments: Comment[] };

export function CommentList({ project, id }: { project: string; id: string }) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    void fetchComments(project, id).then(
      (comments) => setState({ status: "ok", comments }),
      (error: unknown) =>
        setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
    );
  }, [project, id, attempt]);

  const retry = () => {
    setState({ status: "loading" });
    setAttempt((n) => n + 1);
  };

  return (
    <section aria-label="Comments" className="flex flex-col gap-3">
      <h2 className="font-medium">{state.status === "ok" ? `Comments (${state.comments.length})` : "Comments"}</h2>
      {state.status === "loading" && <p className="text-muted-foreground">Loading comments…</p>}
      {state.status === "error" && (
        <Alert variant="destructive">
          <AlertTitle>The comments could not be loaded</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <span>{state.message}</span>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {state.status === "ok" && (
        <ul className="flex flex-col gap-3">
          {state.comments.map((comment) => (
            <li key={comment.id} className="flex flex-col gap-1 rounded border p-2">
              <div className="text-sm text-muted-foreground">
                {`${comment.author} · ${new Date(comment.created_at).toLocaleString()}`}
              </div>
              <p className="whitespace-pre-wrap break-words">{comment.text}</p>
              {comment.truncated && <p className="text-xs text-muted-foreground">Comment truncated</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
```

- [ ] **Step 4: `BeadDetailPage.tsx`.** Import `CommentList` and `TextSection`. In the meta array add `bead.created_by && \`Created by ${bead.created_by}\`,` right after the `Assignee` entry. After the description block (before `RelationList` "Depends on") add:

```tsx
          <TextSection title="Acceptance criteria" text={bead.acceptance_criteria} />
          <TextSection title="Design" text={bead.design} />
          <TextSection title="Notes" text={bead.notes} />
          <TextSection title="Close reason" text={bead.close_reason} />
```

and, as the last element inside the `bead !== null` fragment (after the Children list):

```tsx
          {bead.comment_count > 0 && <CommentList project={project} id={bead.id} />}
```

(`App` already mounts `BeadDetailPage` with `key={project/id}`, so a route change remounts the page and its `CommentList`.)

- [ ] **Step 5: validate.** The four frontend commands and `uv --directory backend run pytest -q` are green. The real-host check (`get_comments` on qwikfone, as in Track 1) is run by the orchestrator, not the worker; the owner checks the bead page of `qwikfone-02a.1` in the browser after the build and a restart.

## Integration
- **Branch**: `feat/gin-console-rm-beads-native` in the worktree `.planning/worktrees/gin-console-rm-beads-native`
- **Merge strategy**: sequential (fast-forward into master after archiving the change)

## Validation
- [ ] `uv --directory backend run pytest -q`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` pass
- [ ] `gin-workflow specs lint --change gin-console-rm-beads-native` and `specs trace` show every REQ covered
- [ ] Manual (owner, after the build and a restart): the bead page of `qwikfone-02a.1` shows its comment with author and time and "Created by"; a bead with design or acceptance criteria shows those sections; a bead without comments shows no Comments section

## Notes
- Model guidance is planning metadata, not Beads state.
- Shipping this change must not close the epic `gin-console-rm-beads-native`; changes D and E remain.
