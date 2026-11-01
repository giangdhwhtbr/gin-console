# Plan: Quality signals on a bead (reopens, bugs)

Epic: gin-console-le3
Spec: `docs/changes/gin-console-le3-quality-signals/` (`01-proposal.md`, `02-spec-delta.md`, `03-design.md`, `05-tests.md`)

## Objective
The bead page (and the List detail panel, which renders the same component) lists the bugs found from the bead under "Bugs found" and says "Reopened N times" when the bead was reopened, from a new `GET /api/beads/{project}/{id}/reopens` endpoint cached by `updated_at`.

**Goal:** every scenario of the added REQ-BEADS-011 and REQ-UI-086 and of the modified REQ-BEADS-002 has a passing test that names its REQ-ID, and the backend and frontend checks pass.

**Architecture:** the `beads` context only.
- Backend `backend/src/gin_console/beads/`: `models.py` (`Relation.type` adds `discovered-from`, `BeadDetail.bugs`, new `Reopens`), `source.py` (`get_bead` fills `bugs`; new `count_reopens`), `router.py` (new route with a `KeyedCache` keyed by `(project, id, updated_at)`).
- Frontend `frontend/src/features/beads/`: `api.ts` (`bugs`, `fetchReopens`), new `Reopens.tsx`, `BeadDetailPage.tsx` (Bugs found list and `<Reopens>` on the time line).

**Tech Stack:** FastAPI, pydantic (strict), pytest; React 19, TypeScript, Tailwind 4, vitest and Testing Library. No new dependency.

**Global Constraints (verbatim from the spec):**
- Bug or reopen counts on Board, Focus and Tree cards or List rows: `bd history` costs about 0.4 s per bead, and the list holds open beads only, so card counts need a background task and a closed-bead list. Decided 2026-11-01 (user): bead page only.
- A background task, a daily schedule, a Refresh control, or a cache on disk.
- Review cycles, rejections, waivers and findings: they need the review ledger and the event file, which are off in this repo.
- Reading `metadata.ai_usage.quality` as a shortcut.
- Writing any count back to Beads (the console is read-only).

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
- Problem statement: the bead page does not say whether a bead was reopened or which bugs were found from it; gin-workflow records these only at close for some beads.
- Success criteria: "Bugs found" lists bugs with a `discovered-from` dependency on the bead (open and closed); "Reopened N times" appears when N > 0 and never shows 0 for an unknown count; an unchanged bead does not rerun `bd history`.
- Constraints: read-only (ADR-0001, REQ-BEADS-003); counts match gin-workflow's `quality()` (`workflow_core/usage.py:139-147`); `bd history` prints newest first and answers an unknown id with `null` and exit 0.
- Non-goals: see Global Constraints.

## Approach Options
### Option 1: Separate reopens endpoint, cached by `updated_at`
- Summary: the page loads `/reopens` after the bead is shown; the server reads `updated_at` from the 5 s detail cache and keeps counts per `(project, id, updated_at)`.
- Pros: the detail stays fast; a `bd history` failure stays in its own line; an unchanged bead is answered from memory.
- Cons: one more request and component.

### Option 2: Count reopens inside the detail
- Summary: `get_bead` also runs `bd history`.
- Pros: less code.
- Cons: every detail load (every 10 s refresh after the 5 s cache) waits 0.4 to 0.9 s, and a history failure breaks the whole page.

### Recommended Approach
- Selected option: Option 1. The user confirmed it in discuss.
- Rationale: matches the comments pattern already on the page and keeps the cost to one `bd history` per bead change.

## Scope
- In scope: the backend files and tests below, `FakeBd` history support, the frontend files below, the `/reopens` route in every test fetch stub that renders the bead page, and the manual case in `05-tests.md`.
- Out of scope: cards and rows, the Beads list API, gin-workflow, the Docker image and config.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Track 2 consumes the API of Track 1 and Track 3 checks both in a browser, so the tracks run one after another.
```

## Tasks

### Track 1: Bugs in the detail and the reopens endpoint
- **Dependencies**: none
- **Requirements**: REQ-BEADS-002, REQ-BEADS-011
- **Files**:
  - Modify `backend/src/gin_console/beads/models.py:34-40,46-56` (`Relation.type`, `BeadDetail.bugs`, new `Reopens`)
  - Modify `backend/src/gin_console/beads/source.py:134-164` (`get_bead` fills `bugs` and keeps `discovered-from` out of `dependencies`; new `count_reopens` after `get_comments`)
  - Modify `backend/src/gin_console/beads/router.py:1-80` (imports, `REOPENS_TTL`, `reopens` cache, new route)
  - Modify `backend/tests/fake_bd.py:52-110` (`history` argument and command)
  - Test `backend/tests/test_beads_source.py` (REQ-BEADS-002 bugs, REQ-BEADS-011 counting)
  - Test `backend/tests/test_beads_api.py:105-111` and new tests after REQ-BEADS-008 (REQ-BEADS-011 over HTTP, read-only set)
- **Provider role**: `backend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded change to one backend context with a clear spec and the code below; the cache reuses `KeyedCache`, so no new concurrency design.
- **Acceptance criteria**: every REQ-BEADS-011 scenario and the REQ-BEADS-002 "Bugs found" scenario has a passing test named with its REQ-ID; `uv run --directory backend pytest`, `uv run --directory backend ruff check .` and `uv run --directory backend mypy` pass.
- **Estimated complexity**: medium

- [ ] **Step 1: Teach `FakeBd` the `history` command.** In `backend/tests/fake_bd.py`, add a constructor argument `history: dict[str, list[str]] | None = None` (statuses oldest first), store `self.history = history or {}`, document it in the class docstring (`history: `history[id]`, statuses oldest first`), and before the final `raise AssertionError` add:
  ```python
        if args[0] == "history":
            if ident not in self.history:
                return None  # what bd prints, with exit 0, for an unknown id
            snapshots = [
                {"CommitHash": f"c{n}", "Issue": {**bead(ident), "status": status}}
                for n, status in enumerate(self.history[ident])
            ]
            return snapshots[::-1]  # bd prints the newest snapshot first
  ```
  `failing={"history": ...}` and `bad={"history": ...}` already work through the existing `args[0]` checks.

- [ ] **Step 2: Write the failing source tests** in `backend/tests/test_beads_source.py` (import `count_reopens` from `gin_console.beads.source`; `BeadsError` and `BeadNotFound` are already imported there, add them if not):
  ```python
  # REQ-BEADS-002
  def test_beads_002_bugs_found() -> None:
      shown = bead("a-5", dependencies=[related("a-0", "discovered-from")])
      up = {
          "a-5": [
              {**related("b-1", "discovered-from"), "issue_type": "bug"},
              {**related("b-2", "discovered-from", status="closed"), "issue_type": "bug"},
              {**related("e-1", "discovered-from"), "issue_type": "epic"},
              related("a-6", "blocks"),
          ]
      }
      detail = get_bead(FakeBd(shown={"a-5": shown}, up=up), CWD, "a-5")
      assert [(r.id, r.status, r.type) for r in detail.bugs] == [
          ("b-1", "open", "discovered-from"),
          ("b-2", "closed", "discovered-from"),
      ]
      assert [r.id for r in detail.dependents] == ["a-6"]
      assert detail.children == [] and detail.dependencies == []


  # REQ-BEADS-011
  @pytest.mark.parametrize(
      ("statuses", "expected"),
      [
          (["open", "in_progress", "closed", "closed", "open", "closed", "in_progress", "closed"], 2),
          (["open", "in_progress", "closed", "closed"], 0),
          (["open"], 0),
      ],
  )
  def test_beads_011_counts_closed_then_not_closed(statuses: list[str], expected: int) -> None:
      fake = FakeBd(history={"a-5": statuses})
      assert count_reopens(fake, CWD, "a-5") == expected
      assert fake.calls == [(["history", "--json", "--", "a-5"], CWD)]


  # REQ-BEADS-011
  def test_beads_011_unknown_bead() -> None:
      with pytest.raises(BeadNotFound):
          count_reopens(FakeBd(), CWD, "x-1")


  # REQ-BEADS-011
  @pytest.mark.parametrize("output", [{"x": 1}, [{"Issue": {}}], [{"Issue": {"status": 3}}], ["x"]])
  def test_beads_011_unexpected_shape(output: object) -> None:
      with pytest.raises(BeadsError):
          count_reopens(FakeBd(bad={"history": output}), CWD, "a-5")
  ```
  Run `uv run --directory backend pytest tests/test_beads_source.py -k "002_bugs or 011"`. Expected: collection fails on the import of `count_reopens`.

- [ ] **Step 3: Models.** In `models.py`, change `Relation.type` to `Literal["blocks", "parent-child", "discovered-from"]`, add `bugs: list[Relation] = []` after `children` in `BeadDetail`, and add at the end:
  ```python
  class Reopens(BaseModel):
      model_config = ConfigDict(strict=True)

      reopens: int
  ```

- [ ] **Step 4: Source.** In `source.py`, add `from itertools import pairwise`. In `get_bead`, replace the two relation lines and add `bugs`:
  ```python
                  "dependencies": [
                      r for r in _relations(raw.get("dependencies")) if r.type != "discovered-from"
                  ],
                  "dependents": [r for r in above if r.type == "blocks"],
                  "children": [r for r in above if r.type == "parent-child"],
                  "bugs": _relations(
                      [
                          row
                          for row in up
                          if isinstance(row, dict)
                          and row.get("dependency_type") == "discovered-from"
                          and row.get("issue_type") == "bug"
                      ]
                  ),
  ```
  After `get_comments`, add:
  ```python
  def count_reopens(run: BdRunner, cwd: Path, bead_id: str) -> int:
      """Times the bead went from closed to another status, as gin-workflow's `quality()` counts."""
      if not valid_id(bead_id):
          raise BeadNotFound(bead_id)
      data = run(["history", "--json", "--", bead_id], cwd, json_on_failure=True)
      _fail_on_error(data)
      if data is None or data == []:  # bd answers an unknown id with `null` and exit 0
          raise BeadNotFound(bead_id)
      if not isinstance(data, list):
          raise BeadsError("bd history output was not understood")
      statuses: list[str] = []
      for row in reversed(data):  # bd prints the newest snapshot first
          issue = row.get("Issue") if isinstance(row, dict) else None
          status = issue.get("status") if isinstance(issue, dict) else None
          if not isinstance(status, str):
              raise BeadsError("bd history output was not understood")
          statuses.append(status)
      return sum(1 for before, after in pairwise(statuses) if before == "closed" != after)
  ```
  Run the Step 2 command. Expected: all pass. Run `uv run --directory backend pytest tests/test_beads_source.py`. Expected: all pass (the existing `relates_to` row is still dropped).

- [ ] **Step 5: Write the failing API tests** in `test_beads_api.py`, after the REQ-BEADS-008 tests (`BeadsError` is imported):
  ```python
  def history_calls(fake: FakeBd) -> int:
      return sum(1 for call in fake.calls if call[0][0] == "history")


  # REQ-BEADS-011
  def test_beads_011_reopens_over_http(tmp_path: Path) -> None:
      statuses = ["open", "in_progress", "closed", "closed", "open", "closed", "in_progress", "closed"]
      fake = FakeBd(shown={"a-5": bead("a-5")}, history={"a-5": statuses})
      assert make(tmp_path, fake).get("/api/beads/proj/a-5/reopens").json() == {"reopens": 2}


  # REQ-BEADS-011
  def test_beads_011_unchanged_bead_is_not_counted_again(tmp_path: Path) -> None:
      clock = Clock()
      fake = FakeBd(shown={"a-5": bead("a-5")}, history={"a-5": ["closed", "open"]})
      api = make(tmp_path, fake, clock)
      assert api.get("/api/beads/proj/a-5/reopens").json() == {"reopens": 1}
      clock.now += timedelta(seconds=6)  # past the 5 s detail cache: bd show runs, history does not
      assert api.get("/api/beads/proj/a-5/reopens").json() == {"reopens": 1}
      assert history_calls(fake) == 1


  # REQ-BEADS-011
  def test_beads_011_changed_bead_is_counted_again(tmp_path: Path) -> None:
      clock = Clock()
      fake = FakeBd(shown={"a-5": bead("a-5")}, history={"a-5": ["closed", "open"]})
      api = make(tmp_path, fake, clock)
      api.get("/api/beads/proj/a-5/reopens")
      fake.shown["a-5"] = bead("a-5", updated_at="2026-10-13T10:00:00Z")
      fake.history["a-5"] = ["closed", "open", "closed", "open"]
      clock.now += timedelta(seconds=6)
      assert api.get("/api/beads/proj/a-5/reopens").json() == {"reopens": 2}
      assert history_calls(fake) == 2


  # REQ-BEADS-011
  @pytest.mark.parametrize(
      "path",
      ["/api/beads/proj/x-1/reopens", "/api/beads/nope/a-5/reopens", "/api/beads/gone/a-5/reopens"],
  )
  def test_beads_011_unknown_bead_or_project_is_404(tmp_path: Path, path: str) -> None:
      fake = FakeBd(shown={"a-5": bead("a-5")}, history={"a-5": ["open"]})
      assert make(tmp_path, fake).get(path).status_code == 404


  # REQ-BEADS-011
  # REQ-BEADS-003
  @pytest.mark.parametrize("ident", ["--help", "-x", "..", "a%2Fb", "a%00b", ".a", "a%20b"])
  def test_beads_011_unsafe_ids_are_404_and_run_nothing(tmp_path: Path, ident: str) -> None:
      fake = FakeBd(shown={"a-5": bead("a-5")})
      assert make(tmp_path, fake).get(f"/api/beads/proj/{ident}/reopens").status_code == 404
      assert fake.calls == []


  # REQ-BEADS-011
  # REQ-BEADS-005
  def test_beads_011_failure_is_502_and_not_kept(tmp_path: Path) -> None:
      fake = FakeBd(
          shown={"a-5": bead("a-5")},
          history={"a-5": ["open"]},
          failing={"history": BeadsError("bd history failed")},
      )
      api = make(tmp_path, fake)
      response = api.get("/api/beads/proj/a-5/reopens")
      assert response.status_code == 502 and "bd history failed" in response.json()["error"]
      fake.failing = {}
      assert api.get("/api/beads/proj/a-5/reopens").json() == {"reopens": 0}


  # REQ-BEADS-011
  def test_beads_011_unexpected_shape_is_502(tmp_path: Path) -> None:
      fake = FakeBd(shown={"a-5": bead("a-5")}, bad={"history": {"x": 1}})
      assert make(tmp_path, fake).get("/api/beads/proj/a-5/reopens").status_code == 502


  # REQ-BEADS-002
  def test_beads_002_bugs_over_http(tmp_path: Path) -> None:
      up = {"a-5": [{**related("b-1", "discovered-from"), "issue_type": "bug"}]}
      fake = FakeBd(shown={"a-5": bead("a-5")}, up=up)
      bugs = make(tmp_path, fake).get("/api/beads/proj/a-5").json()["bugs"]
      assert bugs == [{"id": "b-1", "title": "Title of b-1", "status": "open", "type": "discovered-from"}]
  ```
  In `test_beads_003_only_read_only_commands_run`, add `fake.history = {"a-1": ["open"]}` before the requests, add `api.get("/api/beads/proj/a-1/reopens")`, and add `"history"` to the allowed set. Run `uv run --directory backend pytest tests/test_beads_api.py -k "011 or 002_bugs or 003_only"`. Expected: the `/reopens` tests fail with 404.

- [ ] **Step 6: Route.** In `router.py`, import `Reopens` from `models` and `count_reopens` from `source`, and add `REOPENS_TTL = timedelta(days=1)` under `TTL`. In `build_router`, after `comments = ...`:
  ```python
      # keyed by updated_at: a changed bead gets a new key, so the TTL only ages out old entries
      reopens = KeyedCache[tuple[str, str, str], Reopens](REOPENS_TTL, clock)
  ```
  After the comments route:
  ```python
      @router.get("/beads/{project}/{bead_id}/reopens", response_model=Reopens)
      def get_bead_reopens(project: str, bead_id: str) -> Reopens | JSONResponse:
          cwd = project_dir(project)
          if not valid_id(bead_id):
              raise HTTPException(status_code=404)
          try:
              # the page has just loaded the detail, so updated_at usually comes from that cache
              bead = details.get((project, bead_id), lambda: get_bead(run, cwd, bead_id))
              return reopens.get(
                  (project, bead_id, bead.updated_at),
                  lambda: Reopens(reopens=count_reopens(run, cwd, bead_id)),
              )
          except BeadNotFound:
              raise HTTPException(status_code=404) from None
          except (BeadsError, RecursionError) as exc:
              return failure(exc)
  ```
  Run the Step 5 command. Expected: all pass.

- [ ] **Step 7: Full backend checks.** Run `uv run --directory backend pytest`, `uv run --directory backend ruff check .`, `uv run --directory backend mypy`. Expected: all pass. Commit `feat(beads): bugs found and reopens endpoint (gin-console-le3.1)`.

### Track 2: Bugs found and reopens on the bead page
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-086
- **Files**:
  - Modify `frontend/src/features/beads/api.ts:24-33,56-74,115-125` (`Relation.type`, `bugs`, `fetchReopens`)
  - Create `frontend/src/features/beads/Reopens.tsx`
  - Modify `frontend/src/features/beads/BeadDetailPage.tsx:138-176` (`<Reopens>` on the time line, `RelationList title="Bugs found"`)
  - Test `frontend/src/features/beads/BeadDetailPage.test.tsx` (`stubFetch` takes a reopens handler, `bugs: []` in `beadDetail`, REQ-UI-086 tests)
  - Modify `frontend/src/features/beads/api.test.ts`, `frontend/src/features/beads/Discussion.test.tsx`, `frontend/src/features/beads/ListPanel.test.tsx`, `frontend/src/features/beads/ReturnFlow.test.tsx`, `frontend/src/app/App.test.tsx` (add `bugs: []` to detail fixtures and answer `/reopens` with `{"reopens": 0}` in their fetch stubs)
- **Provider role**: `frontend`
- **Model:** `sonnet`
- **Effort:** `medium`
- **Why:** a bounded UI change in one feature folder with the code below; the test-stub updates are mechanical but spread over five files and need care with async flushing.
- **Acceptance criteria**: every REQ-UI-086 scenario has a passing test named with its REQ-ID; `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint` and `pnpm -C frontend build` pass.
- **Estimated complexity**: medium

- [ ] **Step 1: API types and parser.** In `api.ts`: `Relation.type` becomes `"blocks" | "parent-child" | "discovered-from"`; `BeadDetail` gains `bugs: Relation[];` after `children`; `isRelation` checks `["blocks", "parent-child", "discovered-from"]`; `isDetail` checks `["dependencies", "dependents", "children", "bugs"]`. After `fetchComments`, add:
  ```ts
  export async function fetchReopens(project: string, id: string): Promise<number> {
    const response = await fetch(`/api/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}/reopens`);
    if (!response.ok) throw await failure(response, "Bead");
    const body: unknown = await response.json();
    const reopens = isObject(body) ? field(body, "reopens") : undefined;
    if (typeof reopens !== "number" || !Number.isInteger(reopens) || reopens < 0) {
      throw new Error("Could not load the reopens (unexpected response)");
    }
    return reopens;
  }
  ```
  Add `bugs: []` to every `BeadDetail` fixture in the five test files listed above and in `BeadDetailPage.test.tsx` (`pnpm -C frontend typecheck` lists any missed). In each fetch stub of those files that serves a bead detail, answer a URL ending in `/reopens` with `json({ reopens: 0 })` before the detail branch (in `App.test.tsx` the detail branch uses `url.includes("/api/beads/alpha/a-5")`, so the `/reopens` check must come first). In `BeadDetailPage.test.tsx` change `stubFetch` to:
  ```ts
  const stubFetch = (
    detail: BeadDetail,
    comments: () => Response | Promise<Response> = () => json([]),
    reopens: () => Response | Promise<Response> = () => json({ reopens: 0 }),
  ) =>
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/comments")) return Promise.resolve(comments());
        if (url.endsWith("/reopens")) return Promise.resolve(reopens());
        return Promise.resolve(json(detail));
      }),
    );
  ```
  Add to `api.test.ts` a test `REQ-UI-086 fetchReopens parses the count and rejects an unexpected shape` that stubs `fetch` with `json({ reopens: 2 })` (expects 2), `json({ reopens: -1 })` and `json({ x: 1 })` (both reject with "Could not load the reopens (unexpected response)"), and `json({ error: "bd history failed" }, 502)` (rejects with "bd history failed"). Run `pnpm -C frontend test --run`. Expected: the new `api.test.ts` test fails (`fetchReopens` missing) until the code above is in; everything else passes.

- [ ] **Step 2: Write the failing page tests** in `BeadDetailPage.test.tsx`, inside the `describe`:
  ```tsx
  const bug = (id: string, status = "open") => ({ id, title: `Bug ${id}`, status, type: "discovered-from" as const });

  // REQ-UI-086
  it("REQ-UI-086 bugs found", async () => {
    stubFetch(beadDetail("a-5", { bugs: [bug("b-1"), bug("b-2", "closed")] }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Bugs found" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Bug b-1" })).toHaveAttribute("href", "/beads/alpha/b-1");
    expect(screen.getByRole("link", { name: "Bug b-2" })).toHaveAttribute("href", "/beads/alpha/b-2");
  });

  // REQ-UI-086
  it("REQ-UI-086 no bugs", async () => {
    stubFetch(beadDetail("a-5"));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Bugs found" })).not.toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 reopened", async () => {
    stubFetch(beadDetail("a-5"), undefined, () => json({ reopens: 2 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(/Reopened 2 times/)).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 reopened once", async () => {
    stubFetch(beadDetail("a-5"), undefined, () => json({ reopens: 1 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(/Reopened 1 time$/)).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 not reopened or still loading", async () => {
    stubFetch(beadDetail("a-5"), undefined, () => new Promise<Response>(() => undefined));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    expect(screen.queryByText(/Reopen/)).not.toBeInTheDocument();
    cleanup();
    stubFetch(beadDetail("a-5"), undefined, () => json({ reopens: 0 }));
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    await act(async () => {}); // let the reopens answer arrive
    expect(screen.queryByText(/Reopen/)).not.toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 reopens fail", async () => {
    let answer = json({ error: "bd history failed" }, 502);
    stubFetch(beadDetail("a-5"), undefined, () => answer);
    render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByText(/Reopens unavailable: bd history failed/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    answer = json({ reopens: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByText(/Reopened 1 time$/)).toBeInTheDocument();
  });

  // REQ-UI-086
  it("REQ-UI-086 late answer", async () => {
    let releaseA5: (response: Response) => void = () => undefined;
    const a5 = new Promise<Response>((resolve) => {
      releaseA5 = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi.fn((input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
        if (url.endsWith("/a-5/reopens")) return a5;
        if (url.endsWith("/reopens")) return Promise.resolve(json({ reopens: 0 }));
        return Promise.resolve(json(beadDetail(url.endsWith("a-6") ? "a-6" : "a-5")));
      }),
    );
    const { rerender } = render(<BeadDetailPage project="alpha" id="a-5" />);
    expect(await screen.findByRole("heading", { name: "Title a-5" })).toBeInTheDocument();
    rerender(<BeadDetailPage project="alpha" id="a-6" />);
    expect(await screen.findByRole("heading", { name: "Title a-6" })).toBeInTheDocument();
    await act(async () => {
      releaseA5(json({ reopens: 3 }));
      await a5;
    });
    expect(screen.queryByText(/Reopened 3 times/)).not.toBeInTheDocument();
  });
  ```
  Run `pnpm -C frontend test --run src/features/beads/BeadDetailPage.test.tsx`. Expected: the REQ-UI-086 tests except "no bugs" and "not reopened" fail.

- [ ] **Step 3: Create `Reopens.tsx`:**
  ```tsx
  import { useEffect, useState } from "react";
  import { Button } from "@/components/ui/button";
  import { fetchReopens } from "./api";

  type State = { status: "loading" } | { status: "error"; message: string } | { status: "ok"; reopens: number };

  /** The bead page's reopen count: nothing while it loads or when it is 0, never a guessed 0. */
  export function Reopens({ project, id }: { project: string; id: string }) {
    const [state, setState] = useState<State>({ status: "loading" });
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
      void fetchReopens(project, id).then(
        (reopens) => setState({ status: "ok", reopens }),
        (error: unknown) =>
          setState({ status: "error", message: error instanceof Error ? error.message : String(error) }),
      );
    }, [project, id, attempt]);

    const retry = () => {
      setState({ status: "loading" });
      setAttempt((n) => n + 1);
    };

    if (state.status === "error") {
      return (
        <span className="inline-flex flex-wrap items-center gap-2">
          {` · Reopens unavailable: ${state.message}`}
          <Button variant="outline" size="xs" onClick={retry}>
            Retry
          </Button>
        </span>
      );
    }
    if (state.status === "ok" && state.reopens > 0) {
      return <span>{` · Reopened ${state.reopens} ${state.reopens === 1 ? "time" : "times"}`}</span>;
    }
    return null;
  }
  ```

- [ ] **Step 4: Use it on the page.** In `BeadDetailPage.tsx`, import `Reopens` from `./Reopens`. Inside the `text-sm text-muted-foreground` div that joins the owner, times and comment count, after `.join(" · ")}` add:
  ```tsx
                    <Reopens key={bead.id} project={project} id={bead.id} />
  ```
  (`key` is the shown bead's id, so a late answer for a bead no longer shown lands in an unmounted component and is dropped.) After `<RelationList title="Blocks" … />` add:
  ```tsx
                  <RelationList title="Bugs found" project={project} items={bead.bugs} />
  ```
  Run the Step 2 command. Expected: all pass.

- [ ] **Step 5: Full frontend checks.** Run `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, `pnpm -C frontend build`. Expected: all pass. A test elsewhere failing on a second "Retry" button or a "Reopens unavailable" text means its fetch stub still answers `/reopens` with the bead detail: route `/reopens` to `json({ reopens: 0 })` there. Commit `feat(beads): bugs found and reopens on the bead page (gin-console-le3.2)`.

### Track 3: Check bugs and reopens in a browser
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-086, REQ-BEADS-011
- **Files**:
  - Modify `docs/changes/gin-console-le3-quality-signals/05-tests.md` (TC-1 evidence)
- **Provider role**: `general`
- **Model:** `haiku`
- **Effort:** `low`
- **Why:** a person runs the manual case and the evidence is recorded as text.
- **Human gate**: a person opens the built console on a laptop and a phone, in light and dark, and runs TC-1 of `05-tests.md`.
- **Acceptance criteria**: TC-1 has dated evidence naming the build checked and the result on laptop and phone, light and dark.
- **Estimated complexity**: low

- [ ] **Step 1:** Build and serve the branch: `pnpm -C frontend build`, then start the console on a free port (8700 may be in use by another console process; never stop it) with a config listing gin-console and gin-workflow.
- [ ] **Step 2:** The person checks TC-1: `gin-workflow-wd1t` shows "Reopened 1 time"; a bead never reopened (for example `gin-console-l69`) shows nothing about reopens; `gin-console-djg` shows no "Bugs found"; reopening the same bead page does not rerun `bd history` (the second load is instant).
- [ ] **Step 3:** Record the result in the TC-1 evidence cell and commit `docs(specs): record gin-console-le3 manual check (gin-console-le3.3)`. Stop the console started in Step 1.

### Track 4: Bug color for reopens and bugs found
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-087
- **Files**:
  - Modify `frontend/src/features/beads/Reopens.tsx`, `frontend/src/features/beads/RelationList.tsx`, `frontend/src/features/beads/BeadDetailPage.tsx`
  - Modify the Reopens and bead page tests under `frontend/src/features/beads/`
  - Modify `docs/changes/gin-console-le3-quality-signals/05-tests.md` (TC-2 evidence)
- **Provider role**: `frontend`
- **Why:** added after TC-1 at the person's request: both signals read as plain text and are easy to miss.
- **Human gate**: a person runs TC-2 on a laptop and a phone, in light and dark.
- **Acceptance criteria**: tests for REQ-UI-087 pass; frontend checks pass; TC-2 has dated evidence.
- **Estimated complexity**: low

- [ ] **Step 1:** Test first (REQ-UI-087): the reopened text carries `text-type-bug` and the separator does not; the "Bugs found" heading carries `text-type-bug` and "Depends on" does not.
- [ ] **Step 2:** `Reopens` wraps only the "Reopened …" words in a `text-type-bug` span. `RelationList` takes an optional `titleClassName`; the bead page passes `text-type-bug` for "Bugs found" only.
- [ ] **Step 3:** Run `pnpm -C frontend test --run`, `typecheck`, `lint`, `build`. Commit `feat(beads): bug color for reopens and bugs found (gin-console-le3.4)`.
- [ ] **Step 4:** Serve the build, the person checks TC-2, record the evidence and commit `docs(specs): record gin-console-le3 bug color check (gin-console-le3.4)`.

## Integration
- **Branch**: `feat/gin-console-le3-quality-signals`, cut from `spec/gin-console-le3-quality-signals`
- **Merge strategy**: sequential (Track 1 → Track 2 → Track 3 → Track 4)

## Validation
- [ ] `uv run --directory backend pytest`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `typecheck`, `lint`, `build` pass
- [ ] `gin-workflow specs trace --change gin-console-le3` reports every REQ covered
- [ ] TC-1 passed on laptop and phone, light and dark
- [ ] TC-2 passed on laptop and phone, light and dark

## Notes
- `Model:` and `Effort:` are chosen from the main harness catalog using the route rubric.
- The reopens cache keeps one entry per `(project, id, updated_at)` for a day; `KeyedCache` drops only expired entries at 256, so a day of browsing many beads can hold more. Fine for a single user; a size cap is the upgrade if it ever matters.
- The Parent Bead `gin-console-le3` stays open until a human-confirmed merge; track beads close after tests and review pass.
