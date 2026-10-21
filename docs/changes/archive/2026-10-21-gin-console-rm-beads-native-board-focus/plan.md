# Plan: Board and Focus

Epic: gin-console-rm-beads-native
Spec: docs/changes/gin-console-rm-beads-native-board-focus/ (proposal.md, spec-delta.md, design.md, tests.md)

This is change B of three under the epic (A browse is shipped, B Board and Focus, C Scotty parity and retirement). Shipping it must NOT close the epic.

## Objective

The Beads page offers a List, Board and Focus view of the same loaded data: the list endpoint also says which beads are ready or blocked and when they were closed, Board shows five columns, Focus shows In flight, Blocked and Next up (optionally grouped by assignee, with a "Recently finished" column), a label lane narrows both, and the keyboard moves between cards. Everything is read-only.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: view the work of a project as a board and as a focus list natively in the console (change B of the epic that ends with retiring Scotty).
- Architecture: backend `beads/source.py` also runs `bd ready` and `bd blocked` next to `bd list` and `BeadSummary` gains `ready`, `blocked` and `closed_at`; the cache entry is the whole result. Frontend: `BeadList` becomes `BeadsView` (same fetch, request-order guard, refresh and errors) and renders `BeadTable`, `BoardView` or `FocusView`; the column rules are pure functions in `columns.ts`; view, group, finished and lane live in the URL next to the existing filters.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Read-only: only `bd list`, `bd show`, `bd dep list`, `bd ready` and `bd blocked` run, with fixed arguments, in the project directory; nothing is ever created, updated, closed or deleted. No drag and drop, no edit controls.
- Single machine, Tailscale-only access; no authentication.
- Non-goals: drag and drop, creating or editing beads, archive and delete, comments, origin (human or agent) badges, dependency graph, several projects in one board, Scotty parity sign-off and retirement (change C).
- Titles, labels, assignees and descriptions are written by people and agents: render them as plain text only.
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
- Problem statement: the console lists and opens beads but cannot show them as a board or as "what is in flight, blocked and next", so Scotty is still needed.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; on the live host `/beads?project=qwikfone&view=board` and `view=focus` show the unfinished beads in the right columns, grouping, "Recently finished" and the lane work, and a reload restores the view.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Flags on the existing list endpoint, columns derived in the browser (selected in discuss)
- Summary: `bd ready` and `bd blocked` are folded into `GET /api/beads`; the browser derives Board and Focus columns from the loaded list.
- Pros: one request and one cache entry per refresh; switching views is instant and needs no request; column rules are pure and easy to test.
- Cons: two more `bd` calls per refresh (about 0.3 s each on the largest project).

### Option 2: One endpoint per view
- Pros: the browser does less.
- Cons: three times the `bd` calls, three caches, and a view switch needs a request.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-BEADS-007, REQ-UI-030..037.
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four tracks in a dependency chain (backend flags, frontend data and column rules, views and Board, Focus and keyboard); each needs the previous one's interface, so one agent working in order is simplest.
```

## Verified facts about `bd` (checked on this host; the code below relies on them)

- `bd list --limit 0 --json` rows carry `closed_at` for closed beads (the key is absent otherwise).
- `bd ready --json` returns a list of bead objects with `id`; its default limit is 100, so `--limit 0` is required. It lists only `open` beads that are unblocked and not deferred (never `in_progress`).
- `bd blocked --json` returns a list of bead objects with `id` and `blocked_by`; it can list an `in_progress` bead (open and in-progress beads with an unfinished blocker). It printed `[]` when nothing is blocked.
- Both commands took about 0.3 s on qwikfone (81 unfinished beads: 61 ready, 16 blocked).

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/beads/models.py` (modify) | `ready`, `blocked`, `closed_at` on `BeadSummary` | 1 |
| `backend/src/gin_console/beads/source.py` (modify) | `list_beads` runs `bd ready` and `bd blocked` and sets the flags | 1 |
| `backend/tests/fake_bd.py` (modify) | fake `ready` and `blocked` commands, per-command failures | 1 |
| `backend/tests/test_beads_source.py`, `test_beads_api.py` (modify) | REQ-BEADS-007 and the call counts | 1 |
| `frontend/src/features/beads/api.ts` (modify) | the three fields and their guards | 2 |
| `frontend/src/features/beads/filters.ts` (modify) | `view`, `group`, `finished`, `lane` in the URL filters | 2 |
| `frontend/src/features/beads/columns.ts` (create) | pure column, group, closed-list rules | 2 |
| `frontend/src/features/beads/beadFixtures.ts` (create) | shared test helpers for the new UI tests | 2 |
| `frontend/src/features/beads/{api,filters,columns}.test.ts` and the fixtures of `BeadsPage`, `BeadDetailPage`, `App` tests (modify/create) | tests | 2 |
| `frontend/src/features/beads/BeadList.tsx` -> `BeadsView.tsx` (rename), `BeadsPage.tsx`, `BeadFilterBar.tsx` (modify) | view switch, lane select, search id | 3 |
| `frontend/src/features/beads/{ViewTabs,BeadCard,BoardColumn,ClosedColumn,BoardView}.tsx` (create) | tabs, cards and Board | 3 |
| `frontend/src/features/beads/BoardView.test.tsx` (create) | REQ-UI-030, 031, 032, 036 | 3 |
| `frontend/src/features/beads/{FocusOptions,FocusView,useCardKeys}.tsx/.ts` (create), `BeadsView.tsx` (modify) | Focus, grouping, finished, keyboard | 4 |
| `frontend/src/features/beads/FocusView.test.tsx` (create) | REQ-UI-030 (focus), 033, 034, 035, 037 | 4 |

## Tasks

### Track 1: Readiness flags in the list
- **Dependencies**: none
- **Requirements**: REQ-BEADS-007
- **Files**: modify `backend/src/gin_console/beads/{models,source}.py`, `backend/tests/{fake_bd,test_beads_source,test_beads_api}.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-BEADS-007 has a passing test; the three commands run per list and share one cache entry; a failing or oddly shaped `ready`/`blocked` answer is a 502 and is not cached; existing beads tests pass after the listed adjustments; ruff and mypy are clean.
- **Estimated complexity**: medium

Interfaces produced: `BeadSummary.ready: bool`, `BeadSummary.blocked: bool`, `BeadSummary.closed_at: str | None` (JSON `null` when absent); `list_beads` unchanged in signature.

- [ ] **Step 1: update the fake** `backend/tests/fake_bd.py`. Add constructor parameters `ready: list[str] | None = None`, `blocked: list[str] | None = None`, `failing: dict[str, Exception] | None = None`, `bad: dict[str, Any] | None = None`, stored as `self.ready = ready or []`, `self.blocked = blocked or []`, `self.failing = failing or {}`, `self.bad = bad or {}`. In `__call__`, right after the existing `self.output` check, add:

```python
        if args[0] in self.failing:
            raise self.failing[args[0]]
        if args[0] in self.bad:
            return self.bad[args[0]]
        if args[0] == "ready":
            return [bead(ident) for ident in self.ready]
        if args[0] == "blocked":
            return [bead(ident) for ident in self.blocked]
```

(`failing` and `bad` are keyed by the first argument: `"list"`, `"ready"`, `"blocked"`, `"show"`, `"dep"`.)

- [ ] **Step 2: adjust the existing tests that count calls.**
  - `test_beads_source.py::test_beads_001_list_arguments_and_closed_flag`: a list now runs three commands, so the checks become `fake.calls[0] == (["list", "--limit", "0", "--json"], CWD)` and, for the second `list_beads` call, `fake.calls[3][0] == ["list", "--limit", "0", "--json", "--all"]`.
  - `test_beads_api.py::test_beads_003_only_read_only_commands_run`: the allowed set becomes `{"list", "show", "dep", "ready", "blocked"}`.
  - `test_beads_api.py::test_beads_004_cached_for_five_seconds`: the call counts become 3, 3, 6 and 9 (three commands per uncached list).

- [ ] **Step 3: failing tests.** Append to `test_beads_source.py`:

```python
READY = ["ready", "--limit", "0", "--json"]


# REQ-BEADS-007
def test_beads_007_flags_and_closed_at() -> None:
    fake = FakeBd(
        [
            bead("r-1"),
            bead("b-1"),
            bead("w-1", status="in_progress"),
            bead("s-1", status="blocked"),
            bead("c-1", status="closed", closed_at="2026-10-15T10:00:00Z"),
        ],
        ready=["r-1"],
        blocked=["b-1"],
    )
    by_id = {b.id: b for b in list_beads(fake, CWD, closed=True)}
    assert (by_id["r-1"].ready, by_id["r-1"].blocked) == (True, False)
    assert (by_id["b-1"].ready, by_id["b-1"].blocked) == (False, True)
    assert (by_id["w-1"].ready, by_id["w-1"].blocked) == (False, False)
    assert by_id["s-1"].blocked is True  # status blocked, even if bd blocked does not list it
    assert by_id["c-1"].closed_at == "2026-10-15T10:00:00Z"
    assert by_id["r-1"].closed_at is None


# REQ-BEADS-007
def test_beads_007_commands_and_unknown_ids() -> None:
    fake = FakeBd([bead("a-1")], ready=["a-1", "ghost"], blocked=["ghost"])
    assert [b.id for b in list_beads(fake, CWD, closed=False)] == ["a-1"]
    assert [call[0] for call in fake.calls] == [
        ["list", "--limit", "0", "--json"],
        READY,
        ["blocked", "--json"],
    ]


# REQ-BEADS-007
# REQ-BEADS-005
@pytest.mark.parametrize("command", ["ready", "blocked"])
@pytest.mark.parametrize("output", [{"x": 1}, "text", 5])
def test_beads_007_unexpected_readiness_output(command: str, output: Any) -> None:
    with pytest.raises(BeadsError, match="not understood"):
        list_beads(FakeBd([bead("a-1")], bad={command: output}), CWD, closed=False)


# REQ-BEADS-007
@pytest.mark.parametrize("command", ["ready", "blocked"])
def test_beads_007_a_failing_readiness_command_fails_the_list(command: str) -> None:
    fake = FakeBd([bead("a-1")], failing={command: BeadsError(f"bd {command} failed")})
    with pytest.raises(BeadsError, match=f"bd {command} failed"):
        list_beads(fake, CWD, closed=False)
```

Append to `test_beads_api.py` (use its `make`, `FOUR`, `FakeBd`, `bead`, `Clock` helpers; `FOUR` is the module's list of four open beads, and `FOUR[0]["id"]` is the id of the first):

```python
# REQ-BEADS-007
def test_beads_007_flags_over_http(tmp_path: Path) -> None:
    first, second = str(FOUR[0]["id"]), str(FOUR[1]["id"])
    api = make(tmp_path, FakeBd(FOUR, ready=[first], blocked=[second]))
    rows = {r["id"]: r for r in api.get("/api/beads", params={"project": "proj"}).json()}
    assert rows[first]["ready"] is True and rows[first]["blocked"] is False
    assert rows[second]["blocked"] is True and rows[second]["ready"] is False
    assert rows[first]["closed_at"] is None


# REQ-BEADS-007
# REQ-BEADS-005
def test_beads_007_a_failing_readiness_command_is_502_and_not_cached(tmp_path: Path) -> None:
    fake = FakeBd(FOUR, failing={"blocked": BeadsError("bd blocked failed")})
    api = make(tmp_path, fake)
    response = api.get("/api/beads", params={"project": "proj"})
    assert response.status_code == 502 and "bd blocked failed" in response.json()["error"]
    fake.failing = {}
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 200


# REQ-BEADS-007
def test_beads_007_unexpected_readiness_shape_is_502(tmp_path: Path) -> None:
    api = make(tmp_path, FakeBd(FOUR, bad={"ready": {"x": 1}}))
    assert api.get("/api/beads", params={"project": "proj"}).status_code == 502


# REQ-BEADS-007
def test_beads_007_one_cache_entry_for_the_three_commands(tmp_path: Path) -> None:
    clock, fake = Clock(), FakeBd(FOUR)
    api = make(tmp_path, fake, clock)
    api.get("/api/beads", params={"project": "proj"})
    clock.now += timedelta(seconds=2)
    api.get("/api/beads", params={"project": "proj"})
    assert len(fake.calls) == 3
```

Run `uv --directory backend run pytest -q`; the new tests fail (the existing ones fail until Step 2 and Step 4 are done).

- [ ] **Step 4: models.** In `beads/models.py` add to `BeadSummary`, after `comment_count: int = 0`:

```python
    closed_at: Text | None = None
    ready: bool = False
    blocked: bool = False
```

- [ ] **Step 5: source.** In `beads/source.py` add `"closed_at"` at the end of `_SUMMARY_KEYS`, and replace `list_beads` by:

```python
def _ids(data: Any, what: str) -> set[str]:
    if not isinstance(data, list):
        raise BeadsError(f"bd {what} output was not understood")
    return {row["id"] for row in data if isinstance(row, dict) and isinstance(row.get("id"), str)}


def list_beads(run: BdRunner, cwd: Path, closed: bool) -> list[BeadSummary]:
    data = run(["list", "--limit", "0", "--json", *(["--all"] if closed else [])], cwd)
    if not isinstance(data, list):
        raise BeadsError("bd list output was not understood")
    # `bd ready` stops at 100 results unless told otherwise; both answers are only ever used as id sets
    ready = _ids(run(["ready", "--limit", "0", "--json"], cwd), "ready")
    blocked = _ids(run(["blocked", "--json"], cwd), "blocked")
    return [
        bead.model_copy(
            update={"ready": bead.id in ready, "blocked": bead.id in blocked or bead.status == "blocked"}
        )
        for bead in map(_summary, data)
        if bead is not None
    ]
```

- [ ] **Step 6: validate.** `uv --directory backend run pytest -q`, `uv --directory backend run ruff check .`, `uv --directory backend run mypy` are green (run `uv --directory backend run ruff format` only on the files you touched). The real-host check against the `bd` of qwikfone is done by the orchestrator after the track, not by the worker: it runs `list_beads(run_bd, Path.home() / "qwikfone", False)` and expects 81 beads of which 61 are ready and 16 blocked.

### Track 2: Frontend data and column rules
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-030 (view in the URL), REQ-UI-031, REQ-UI-032, REQ-UI-033, REQ-UI-034, REQ-UI-035, REQ-UI-036 (pure rules and URL parts; the screens are Tracks 3 and 4)
- **Files**: modify `frontend/src/features/beads/{api,filters}.ts`, `frontend/src/features/beads/{api,filters}.test.ts`, the bead fixtures of `frontend/src/features/beads/{BeadsPage,BeadDetailPage}.test.tsx` and `frontend/src/app/App.test.tsx`; create `frontend/src/features/beads/{columns.ts,columns.test.ts,beadFixtures.ts}`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: guards require the three new fields; unknown `view`/`group`/`finished`/`lane` URL values fall back to defaults; the pure rules match the spec scenarios; all earlier frontend tests pass after their fixtures get the new fields; the four frontend commands are green.
- **Estimated complexity**: medium

Interfaces consumed: Track 1 JSON. Produced: `BeadSummary` with `ready: boolean`, `blocked: boolean`, `closed_at: string | null`; `BeadFilters` with `view: View`, `group: "" | "assignee"`, `finished: boolean`, `lane: string`; `VIEWS`, `View`; from `columns.ts`: `DONE_LIMIT`, `FINISHED_LIMIT`, `BOARD_COLUMNS`, `BoardColumnKey`, `boardColumns`, `FOCUS_COLUMNS`, `FocusColumnKey`, `focusColumns`, `FocusRow`, `focusRows`, `closedNewestFirst`, `inLane`; from `beadFixtures.ts`: `json`, `bead`, `project`, `stubBeads`.

- [ ] **Step 1: failing tests.**
  - `columns.test.ts` (each title carries its REQ-ID; use the `bead` helper of `beadFixtures.ts`):

```ts
import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import {
  boardColumns,
  closedNewestFirst,
  focusColumns,
  focusRows,
  inLane,
} from "./columns";

const ids = (beads: { id: string }[]) => beads.map((b) => b.id);

describe("columns", () => {
  // REQ-UI-031
  it("REQ-UI-031 puts each bead in the first column that fits", () => {
    const columns = boardColumns([
      bead("d", { status: "deferred" }),
      bead("r", { ready: true }),
      bead("p", { status: "in_progress" }),
      bead("h", { status: "hooked" }),
      bead("b", { blocked: true }),
      bead("pb", { status: "in_progress", blocked: true }),
      bead("c", { status: "closed", closed_at: "2026-10-15T00:00:00Z" }),
    ]);
    expect(ids(columns.backlog)).toEqual(["d"]);
    expect(ids(columns.ready)).toEqual(["r"]);
    expect(ids(columns.in_progress).sort()).toEqual(["h", "p", "pb"]);
    expect(ids(columns.blocked)).toEqual(["b"]);
    expect(ids(columns.done)).toEqual(["c"]);
  });

  // REQ-UI-031
  it("REQ-UI-031 leaves a bead that fits no column out of the board", () => {
    const columns = boardColumns([bead("x", { status: "pinned" }), bead("y")]);
    expect(Object.values(columns).flat()).toEqual([]);
  });

  // REQ-UI-031
  it("REQ-UI-031 orders a column by priority, then newest update; Done by closing time", () => {
    const columns = boardColumns([
      bead("old", { ready: true, priority: 1, updated_at: "2026-10-01T00:00:00Z" }),
      bead("new", { ready: true, priority: 1, updated_at: "2026-10-09T00:00:00Z" }),
      bead("low", { ready: true, priority: 3, updated_at: "2026-10-10T00:00:00Z" }),
      bead("c1", { status: "closed", closed_at: "2026-10-01T00:00:00Z", updated_at: "2026-10-20T00:00:00Z" }),
      bead("c2", { status: "closed", closed_at: "2026-10-05T00:00:00Z", updated_at: "2026-10-02T00:00:00Z" }),
      bead("c3", { status: "closed", closed_at: null, updated_at: "2026-10-03T00:00:00Z" }),
    ]);
    expect(ids(columns.ready)).toEqual(["new", "old", "low"]);
    expect(ids(columns.done)).toEqual(["c2", "c3", "c1"]);
  });

  // REQ-UI-032
  it("REQ-UI-032 closedNewestFirst sorts by closed_at and falls back to updated_at", () => {
    const sorted = closedNewestFirst([
      bead("a", { status: "closed", closed_at: "2026-10-01T00:00:00Z" }),
      bead("b", { status: "closed", closed_at: null, updated_at: "2026-10-09T00:00:00Z" }),
      bead("open"),
    ]);
    expect(ids(sorted)).toEqual(["b", "a"]);
  });

  // REQ-UI-033
  it("REQ-UI-033 focus columns: in flight, blocked, next up (ready P0/P1)", () => {
    const columns = focusColumns([
      bead("p", { status: "in_progress" }),
      bead("h", { status: "hooked" }),
      bead("b", { blocked: true }),
      bead("pb", { status: "in_progress", blocked: true }),
      bead("n1", { ready: true, priority: 1 }),
      bead("n0", { ready: true, priority: 0 }),
      bead("n3", { ready: true, priority: 3 }),
      bead("c", { status: "closed" }),
    ]);
    expect(ids(columns.in_flight).sort()).toEqual(["h", "p", "pb"]);
    expect(ids(columns.blocked)).toEqual(["b"]);
    expect(ids(columns.next_up)).toEqual(["n0", "n1"]);
  });

  // REQ-UI-034
  it("REQ-UI-034 one row per assignee that has work, 'No assignee' last, empty rows left out", () => {
    const rows = focusRows(
      [
        bead("1", { assignee: "bob", status: "in_progress" }),
        bead("2", { assignee: "alice", blocked: true }),
        bead("3", { assignee: null, ready: true, priority: 0 }),
        bead("4", { assignee: "  ", ready: true, priority: 1 }),
        bead("5", { assignee: "carol", ready: true, priority: 3 }),
      ],
      "assignee",
    );
    expect(rows.map((r) => r.title)).toEqual(["alice", "bob", "No assignee"]);
    expect(ids(rows[2]?.columns.next_up ?? []).sort()).toEqual(["3", "4"]);
  });

  // REQ-UI-034
  it("REQ-UI-034 without grouping there is one untitled row, even when empty", () => {
    expect(focusRows([], "")).toEqual([
      { title: null, columns: { in_flight: [], blocked: [], next_up: [] } },
    ]);
  });

  // REQ-UI-036
  it("REQ-UI-036 inLane keeps the beads with the label; an empty lane keeps all", () => {
    const beads = [bead("a", { labels: ["frontend"] }), bead("b", { labels: ["backend"] })];
    expect(ids(inLane(beads, "frontend"))).toEqual(["a"]);
    expect(ids(inLane(beads, ""))).toEqual(["a", "b"]);
    expect(inLane(beads, "gone")).toEqual([]);
  });
});
```

  - `filters.test.ts`: the `bead` helper gets `ready: false, blocked: false, closed_at: null`; the full-object test of `parseFilters` (REQ-UI-025 "restores every filter") now expects `view: "list", group: "", finished: false, lane: ""` as well; add tests: `REQ-UI-030` `parseFilters("?view=board").view === "board"`, `"?view=graph"` and `""` give `"list"`; `REQ-UI-034` `?group=assignee` gives `"assignee"` and `?group=x` gives `""`; `REQ-UI-035` `?finished=1` is true and `?finished=true` false; `REQ-UI-036` `?lane=frontend` gives `"frontend"`; `filtersToSearch({ ...empty, view: "focus", group: "assignee", finished: true, lane: "a b" })` is `"?view=focus&group=assignee&finished=1&lane=a+b"` and `view: "list"` writes nothing; a round trip of such filters is stable.
  - `api.test.ts`: its summary helper gets `ready: false, blocked: false, closed_at: null`; add: a summary without `ready` is rejected (`Could not load beads (unexpected response)`), one with `ready: "yes"` is rejected, `closed_at: 5` is rejected, and `closed_at: null` / a string are accepted.
  - Fixtures: add `ready: false, blocked: false, closed_at: null` to `bead` in `BeadsPage.test.tsx`, `beadDetail` in `BeadDetailPage.test.tsx` and the two inline bead objects in `App.test.tsx` (around the `dependent_count: 0` lines).
  - Run `pnpm -C frontend test --run`; the new tests and the guard tests fail.

- [ ] **Step 2: `api.ts`.** Add `ready: boolean; blocked: boolean; closed_at: string | null;` to `BeadSummary` (after `comment_count`). In `isSummary` add `["ready", "blocked"].every((k) => typeof field(value, k) === "boolean") &&` and include `"closed_at"` in the `isStringOrNull` key list: `["owner", "assignee", "parent", "closed_at"]`.

- [ ] **Step 3: `filters.ts`.** Add near the top:

```ts
export const VIEWS = ["list", "board", "focus"] as const;
export type View = (typeof VIEWS)[number];
```

Add to `BeadFilters`: `view: View; group: "" | "assignee"; finished: boolean; lane: string;`. In `parseFilters` add:

```ts
    view: VIEWS.find((view) => view === p.get("view")) ?? "list",
    group: p.get("group") === "assignee" ? "assignee" : "",
    finished: p.get("finished") === "1",
    lane: p.get("lane") ?? "",
```

In `filtersToSearch`, after the `closed` line:

```ts
  if (filters.view !== "list") p.set("view", filters.view);
  if (filters.group !== "") p.set("group", filters.group);
  if (filters.finished) p.set("finished", "1");
  if (filters.lane !== "") p.set("lane", filters.lane);
```

(`filterBeads`, `sortBeads` and `optionsOf` are unchanged; the lane is applied by the views through `inLane`.)

- [ ] **Step 4: `columns.ts`:**

```ts
import type { BeadSummary } from "./api";

export const DONE_LIMIT = 20;
export const FINISHED_LIMIT = 7;

export type BoardColumnKey = "backlog" | "ready" | "in_progress" | "blocked" | "done";
export const BOARD_COLUMNS: readonly { key: BoardColumnKey; title: string }[] = [
  { key: "backlog", title: "Backlog" },
  { key: "ready", title: "Ready" },
  { key: "in_progress", title: "In Progress" },
  { key: "blocked", title: "Blocked" },
  { key: "done", title: "Done" },
];

export type FocusColumnKey = "in_flight" | "blocked" | "next_up";
export const FOCUS_COLUMNS: readonly { key: FocusColumnKey; title: string }[] = [
  { key: "in_flight", title: "In flight" },
  { key: "blocked", title: "Blocked" },
  { key: "next_up", title: "Next up" },
];

const time = (text: string) => Date.parse(text) || 0;
const byImportance = (a: BeadSummary, b: BeadSummary) =>
  a.priority - b.priority || time(b.updated_at) - time(a.updated_at);
const closingTime = (bead: BeadSummary) => time(bead.closed_at ?? bead.updated_at);

/** Closed beads, the most recently closed first (updated_at stands in for a missing closed_at). */
export function closedNewestFirst(beads: readonly BeadSummary[]): BeadSummary[] {
  return beads.filter((b) => b.status === "closed").sort((a, b) => closingTime(b) - closingTime(a));
}

const working = (bead: BeadSummary) => bead.status === "in_progress" || bead.status === "hooked";

function boardColumn(bead: BeadSummary): BoardColumnKey | null {
  if (bead.status === "deferred") return "backlog";
  if (bead.ready) return "ready";
  if (working(bead)) return "in_progress";
  if (bead.blocked) return "blocked";
  if (bead.status === "closed") return "done";
  return null;
}

export function boardColumns(beads: readonly BeadSummary[]): Record<BoardColumnKey, BeadSummary[]> {
  const columns: Record<BoardColumnKey, BeadSummary[]> = {
    backlog: [],
    ready: [],
    in_progress: [],
    blocked: [],
    done: [],
  };
  for (const bead of beads) {
    const key = boardColumn(bead);
    if (key !== null) columns[key].push(bead);
  }
  for (const key of ["backlog", "ready", "in_progress", "blocked"] as const) columns[key].sort(byImportance);
  columns.done = closedNewestFirst(columns.done);
  return columns;
}

function focusColumn(bead: BeadSummary): FocusColumnKey | null {
  if (working(bead)) return "in_flight";
  if (bead.blocked) return "blocked";
  if (bead.ready && bead.priority <= 1) return "next_up";
  return null;
}

export function focusColumns(beads: readonly BeadSummary[]): Record<FocusColumnKey, BeadSummary[]> {
  const columns: Record<FocusColumnKey, BeadSummary[]> = { in_flight: [], blocked: [], next_up: [] };
  for (const bead of beads) {
    const key = focusColumn(bead);
    if (key !== null) columns[key].push(bead);
  }
  for (const list of Object.values(columns)) list.sort(byImportance);
  return columns;
}

export type FocusRow = { title: string | null; columns: Record<FocusColumnKey, BeadSummary[]> };

const assigneeOf = (bead: BeadSummary) => (bead.assignee ?? "").trim();
const hasWork = (columns: Record<FocusColumnKey, BeadSummary[]>) => Object.values(columns).some((l) => l.length > 0);

export function focusRows(beads: readonly BeadSummary[], group: "" | "assignee"): FocusRow[] {
  if (group === "") return [{ title: null, columns: focusColumns(beads) }];
  const names = [...new Set(beads.map(assigneeOf).filter((name) => name !== ""))].sort((a, b) => a.localeCompare(b));
  const rows: FocusRow[] = names.map((name) => ({
    title: name,
    columns: focusColumns(beads.filter((b) => assigneeOf(b) === name)),
  }));
  rows.push({ title: "No assignee", columns: focusColumns(beads.filter((b) => assigneeOf(b) === "")) });
  return rows.filter((row) => hasWork(row.columns));
}

export function inLane(beads: readonly BeadSummary[], lane: string): BeadSummary[] {
  return lane === "" ? [...beads] : beads.filter((b) => b.labels.includes(lane));
}
```

  Note: a named assignee is the trimmed name, so `"  "` counts as no assignee; compare `assigneeOf(b) === name` (not `b.assignee`).

- [ ] **Step 5: `beadFixtures.ts`** (test helper, shared by the Track 3 and 4 tests; same helpers as `BeadsPage.test.tsx` plus the new fields):

```ts
import { vi } from "vitest";
import type { Project } from "@/features/projects/api";
import type { BeadSummary } from "./api";

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const bead = (id: string, overrides: Partial<BeadSummary> = {}): BeadSummary => ({
  id,
  title: `Title ${id}`,
  status: "open",
  priority: 2,
  issue_type: "task",
  labels: [],
  owner: null,
  assignee: null,
  parent: null,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-10T00:00:00Z",
  dependency_count: 0,
  dependent_count: 0,
  comment_count: 0,
  closed_at: null,
  ready: false,
  blocked: false,
  ...overrides,
});

export const project = (name: string, exists = true): Project => ({
  name,
  path: `/home/gin/${name}`,
  scotty_id: null,
  scotty_url: null,
  exists,
  workflow: null,
  beads: null,
});

/** Stub `fetch` for `/api/projects` (the given names exist) and `/api/beads` (the handler decides). */
export function stubBeads(
  handler: (url: URL) => Response | Promise<Response>,
  names: string[] = ["alpha"],
) {
  const fetchMock = vi.fn((input: RequestInfo | URL) => {
    const text = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const url = new URL(text, "http://localhost");
    if (url.pathname === "/api/projects") return Promise.resolve(json(names.map((n) => project(n))));
    if (url.pathname === "/api/beads") return Promise.resolve(handler(url));
    return Promise.resolve(json({}, 404));
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}
```

- [ ] **Step 6: validate.** `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` are green; all earlier tests (99 + the new ones) pass.

### Track 3: Views, Board and Lane
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-030, REQ-UI-031, REQ-UI-032, REQ-UI-036
- **Files**: rename `frontend/src/features/beads/BeadList.tsx` to `BeadsView.tsx` (use `git mv`); modify `BeadsPage.tsx`, `BeadFilterBar.tsx`; create `ViewTabs.tsx`, `BeadCard.tsx`, `BoardColumn.tsx`, `ClosedColumn.tsx`, `BoardView.tsx`, `BoardView.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the four REQs has a vitest test; switching the view keeps the filters and makes no request; Board columns follow the spec; Done is short by default; the lane is in the URL; rules of the previous frontend reviews hold (cleanup in tests, fresh `Response` per call, no setState in effects, no clock read during render, no `as`/`any`/`!` (`as const` is fine), one component per file, plain-text rendering).
- **Estimated complexity**: medium

Interfaces consumed: Track 2. Produced: `BeadsView`, `ViewTabs`, `BeadCard`, `BoardColumn`, `ClosedColumn`, `BoardView`; `BeadFilterBar` shows a `Lane` select when `filters.view !== "list"` and the search input has `id="bead-search"`.

- [ ] **Step 1: failing tests** `BoardView.test.tsx`. Use `stubBeads`, `bead`, `json` from `beadFixtures.ts`; `beforeEach` `window.history.replaceState(null, "", "/beads")`; `afterEach` `cleanup()`, `vi.useRealTimers()`, `vi.restoreAllMocks()`, `vi.unstubAllGlobals()`. Render `<BeadsPage />`. Regions are found with `screen.getByRole("region", { name: "Ready" })` and `within(...)`. Tests (each title carries the REQ-ID):
  - REQ-UI-030 switch keeps filters and makes no request: URL `/beads?project=alpha&status=open&q=fix`; after the rows appear note `fetchMock.mock.calls.length`; click the button `Board`; `location.search` contains `view=board`, `q=fix`, `status=open`; the call count is unchanged; the search box still holds `fix`; clicking `List` removes `view` from the URL.
  - REQ-UI-030 restored and unknown view: `?project=alpha&view=board` shows the region `Ready`; `?project=alpha&view=graph` shows the list (`getByRole("table")`).
  - REQ-UI-031 placement: beads `d-1` (deferred), `r-1` (`ready: true`), `p-1` (in_progress), `b-1` (`blocked: true`), `c-1` (closed, with `closed_at`), URL `...&view=board&closed=1`; each region (`Backlog`, `Ready`, `In Progress`, `Blocked`, `Done`) contains exactly its bead's title link and the count `1`.
  - REQ-UI-031 pinned bead: a `pinned` bead has no link on the Board; clicking `List` shows it in the table.
  - REQ-UI-031 card and link: a ready P1 bug assigned to alice with `dependency_count: 2`, `comment_count: 3`: the card shows `r-1`, `P1`, `alice`, `bug`, `2 deps`, `3 comments`, and the title link has `href="/beads/alpha/r-1"`.
  - REQ-UI-031 empty column: `Blocked` contains `No beads`.
  - REQ-UI-031 plain text: a title `<script>window.hacked = 1</script>` is text on a card and `container.querySelector("script")` is null.
  - REQ-UI-032 Done is short: 45 closed beads `c-01`..`c-45` (`closed_at` increasing with the number), `closed=1`: Done lists 20 links, says `20 of 45`, the first link is `c-45`; clicking `Show all 45` lists 45 and the count `45`; the button `Show latest 20` goes back to 20.
  - REQ-UI-032 closed hidden: without `closed=1` Done is empty and says `Turn on Show closed to see closed beads`; turning on `Show closed` requests `closed=1`.
  - REQ-UI-036 lane: beads labelled `frontend` and `backend`; the `Lane` select offers `All`, `backend`, `frontend`; choosing `frontend` makes `location.search` contain `lane=frontend` and leaves only the frontend beads on the Board; `?lane=gone` shows an empty Board and the select still shows `gone`; on the List view there is no `Lane` select.

  Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: rename and adapt.** `git mv frontend/src/features/beads/BeadList.tsx frontend/src/features/beads/BeadsView.tsx`; rename the component to `BeadsView`; `BeadsPage.tsx` imports `BeadsView` from `./BeadsView` and renders `<BeadsView key={selected} project={selected} filters={filters} onChange={change} />`. In `BeadsView.tsx` replace the `state.status === "ok"` block by:

```tsx
      {state.status === "ok" && (
        <>
          <ViewTabs filters={filters} onChange={onChange} />
          <BeadFilterBar filters={filters} options={optionsOf(beads)} onChange={onChange} />
          <p className="text-sm text-muted-foreground">{`${shown.length} of ${beads.length}`}</p>
          {filters.view === "board" && <BoardView project={project} beads={scoped} filters={filters} />}
          {filters.view === "list" &&
            (shown.length === 0 ? (
              <p className="text-muted-foreground">No beads match.</p>
            ) : (
              <BeadTable project={project} beads={shown} />
            ))}
        </>
      )}
```

with, above the `return`, `const scoped = inLane(shown, filters.lane);` (imports: `inLane` from `./columns`, `ViewTabs`, `BoardView`). The count line keeps counting `shown` (the search and filters), as before. (Track 4 adds the Focus branch.)

- [ ] **Step 3: `ViewTabs.tsx`:**

```tsx
import { Button } from "@/components/ui/button";
import { VIEWS, type BeadFilters } from "./filters";

const TITLES = { list: "List", board: "Board", focus: "Focus" } as const;

export function ViewTabs({ filters, onChange }: { filters: BeadFilters; onChange: (next: BeadFilters) => void }) {
  return (
    <nav aria-label="View" className="flex gap-2">
      {VIEWS.map((view) => (
        <Button
          key={view}
          size="sm"
          variant={filters.view === view ? "default" : "outline"}
          aria-pressed={filters.view === view}
          onClick={() => onChange({ ...filters, view })}
        >
          {TITLES[view]}
        </Button>
      ))}
    </nav>
  );
}
```

- [ ] **Step 4: `BeadFilterBar.tsx`.** Give the search input `id="bead-search"`, and after the `Type` select add `{filters.view !== "list" && (<FilterSelect label="Lane" value={filters.lane} options={options.labels.map(same)} onChange={(lane) => set({ lane })} />)}`. "Clear filters" is unchanged (it does not touch the view or the lane).

- [ ] **Step 5: `BeadCard.tsx`, `BoardColumn.tsx`, `ClosedColumn.tsx`, `BoardView.tsx`:**

```tsx
// BeadCard.tsx
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import type { BeadSummary } from "./api";

export function BeadCard({ project, bead }: { project: string; bead: BeadSummary }) {
  return (
    <li data-card className="flex flex-col gap-1 rounded border bg-card p-2 text-sm">
      <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
        <span>{bead.id}</span>
        <span>{`P${bead.priority}`}</span>
      </div>
      <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`} className="font-medium">
        {bead.title}
      </Link>
      <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
        <Badge variant="outline">{bead.issue_type}</Badge>
        {(bead.assignee ?? "") !== "" && <span>{bead.assignee}</span>}
        <span>{`${bead.dependency_count} deps`}</span>
        <span>{`${bead.comment_count} comments`}</span>
      </div>
    </li>
  );
}
```

```tsx
// BoardColumn.tsx
import type { ReactNode } from "react";
import type { BeadSummary } from "./api";
import { BeadCard } from "./BeadCard";

export function BoardColumn({
  title,
  project,
  beads,
  total,
  empty = "No beads",
  footer = null,
}: {
  title: string;
  project: string;
  beads: readonly BeadSummary[];
  total?: number;
  empty?: string;
  footer?: ReactNode;
}) {
  const count = total === undefined || total === beads.length ? String(beads.length) : `${beads.length} of ${total}`;
  return (
    <section aria-label={title} className="flex min-w-48 flex-1 flex-col gap-2 rounded border p-2">
      <h2 className="flex items-baseline justify-between text-sm font-medium">
        {title}
        <span className="text-muted-foreground">{count}</span>
      </h2>
      {beads.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {beads.map((bead) => (
            <BeadCard key={bead.id} project={project} bead={bead} />
          ))}
        </ul>
      )}
      {footer}
    </section>
  );
}
```

```tsx
// ClosedColumn.tsx: the newest closed beads, a few by default
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";

export function ClosedColumn({
  title,
  project,
  beads,
  limit,
  allLabel,
  empty,
}: {
  title: string;
  project: string;
  beads: readonly BeadSummary[]; // newest closed first
  limit: number;
  allLabel: (total: number) => string;
  empty: string;
}) {
  const [all, setAll] = useState(false);
  const shown = all ? beads : beads.slice(0, limit);
  const toggle =
    beads.length > limit ? (
      <Button variant="outline" size="sm" onClick={() => setAll(!all)}>
        {all ? `Show latest ${limit}` : allLabel(beads.length)}
      </Button>
    ) : null;
  return (
    <BoardColumn title={title} project={project} beads={shown} total={beads.length} empty={empty} footer={toggle} />
  );
}
```

```tsx
// BoardView.tsx
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { BOARD_COLUMNS, boardColumns, DONE_LIMIT } from "./columns";
import { ClosedColumn } from "./ClosedColumn";
import type { BeadFilters } from "./filters";

export function BoardView({ project, beads, filters }: { project: string; beads: readonly BeadSummary[]; filters: BeadFilters }) {
  const columns = boardColumns(beads);
  return (
    <div className="flex flex-wrap items-start gap-3">
      {BOARD_COLUMNS.map(({ key, title }) =>
        key === "done" ? (
          <ClosedColumn
            key={key}
            title={title}
            project={project}
            beads={columns.done}
            limit={DONE_LIMIT}
            allLabel={(total) => `Show all ${total}`}
            empty={filters.closed ? "No beads" : "Turn on Show closed to see closed beads"}
          />
        ) : (
          <BoardColumn key={key} title={title} project={project} beads={columns[key]} />
        ),
      )}
    </div>
  );
}
```

- [ ] **Step 6: validate.** The four frontend commands are green; `BeadsPage.test.tsx` and `App.test.tsx` still pass unchanged apart from Track 2's fixtures.

### Track 4: Focus, grouping, finished and keyboard
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-030 (Focus view restored from the URL), REQ-UI-033, REQ-UI-034, REQ-UI-035, REQ-UI-037
- **Files**: create `frontend/src/features/beads/{FocusOptions.tsx,FocusView.tsx,useCardKeys.ts,FocusView.test.tsx}`; modify `frontend/src/features/beads/BeadsView.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the listed REQs has a vitest test; the Focus columns follow the spec; grouping, "Recently finished" and the keyboard shortcuts work on both Board and Focus; the rules of the previous frontend reviews hold.
- **Estimated complexity**: medium

Interfaces consumed: Tracks 2 and 3. Produced: `FocusView`, `FocusOptions`, `useCardKeys(enabled, clearSearch)`.

- [ ] **Step 1: failing tests** `FocusView.test.tsx` (same helpers and set-up as `BoardView.test.tsx`; render `<BeadsPage />`):
  - REQ-UI-030 restored: `?project=alpha&view=focus` shows the regions `In flight`, `Blocked` and `Next up`.
  - REQ-UI-033 columns: beads `p-1` (in_progress), `h-1` (hooked), `b-1` (`blocked: true`), `n-1` (ready P1), `n-3` (ready P3), `pb-1` (in_progress and `blocked: true`): `In flight` holds `p-1`, `h-1` and `pb-1`, `Blocked` holds only `b-1`, `Next up` holds `n-1`, and `n-3` appears nowhere; each region shows its count.
  - REQ-UI-034 rows: beads for bob, alice and nobody; choosing `Assignee` in the `Group by` select puts `group=assignee` in the URL and shows the sections `alice`, `bob`, `No assignee` in that order (`screen.getAllByRole("heading", { level: 2 })` filtered to the row headings, or `getByRole("region", { name: "alice" })` and `within`); a bead in a row appears under its assignee; choosing `None` brings back the single set of columns and removes `group` from the URL; an assignee with no bead in the three columns has no row.
  - REQ-UI-035 latest seven: 12 closed beads with increasing `closed_at`, URL `...&view=focus&closed=1&finished=1`: the region `Recently finished` lists 7, says `7 of 12`, starts with the newest; `Show all 12 completed` lists 12; `Show latest 7` goes back; search and the lane apply before the cut (searching one bead leaves 1).
  - REQ-UI-035 needs closed beads: from `?project=alpha&view=focus` (no `closed`), checking `Recently finished` makes the URL contain `finished=1` and `closed=1`, and `fetch` is called with `closed=1`.
  - REQ-UI-037 search shortcut: on the Board, with focus on `document.body`, `await user.keyboard("/")` focuses the search box (`toHaveFocus`) and the box stays empty; typing `/` inside the box types it.
  - REQ-UI-037 move and open: Board with three cards; `ArrowDown` focuses the first card link, again the second, `ArrowUp` goes back; `Enter` on the focused link makes `location.pathname` `/beads/alpha/<id>`; the same works on Focus.
  - REQ-UI-037 escape: type `fix` in the search box, `Escape` clears it (the URL loses `q`), a second `Escape` leaves the box (`not.toHaveFocus`).
  - REQ-UI-037 not on the List view: pressing `/` on the List view does not move focus.

  Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: `FocusOptions.tsx`:**

```tsx
import type { BeadFilters } from "./filters";

export function FocusOptions({ filters, onChange }: { filters: BeadFilters; onChange: (next: BeadFilters) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <label className="flex items-center gap-1">
        Group by
        <select
          value={filters.group}
          onChange={(event) => onChange({ ...filters, group: event.target.value === "assignee" ? "assignee" : "" })}
          className="rounded border bg-background px-2 py-1"
        >
          <option value="">None</option>
          <option value="assignee">Assignee</option>
        </select>
      </label>
      <label className="flex items-center gap-1">
        <input
          type="checkbox"
          checked={filters.finished}
          // closed beads are only loaded while "Show closed" is on
          onChange={(event) =>
            onChange({ ...filters, finished: event.target.checked, closed: event.target.checked || filters.closed })
          }
        />
        Recently finished
      </label>
    </div>
  );
}
```

- [ ] **Step 3: `FocusView.tsx`:**

```tsx
import type { BeadSummary } from "./api";
import { BoardColumn } from "./BoardColumn";
import { ClosedColumn } from "./ClosedColumn";
import { closedNewestFirst, FINISHED_LIMIT, FOCUS_COLUMNS, focusRows } from "./columns";
import type { BeadFilters } from "./filters";
import { FocusOptions } from "./FocusOptions";

export function FocusView({
  project,
  beads,
  filters,
  onChange,
}: {
  project: string;
  beads: readonly BeadSummary[];
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
}) {
  const rows = focusRows(beads, filters.group);
  return (
    <div className="flex flex-col gap-4">
      <FocusOptions filters={filters} onChange={onChange} />
      {rows.map((row) => {
        const columns = (
          <div className="flex flex-wrap items-start gap-3">
            {FOCUS_COLUMNS.map(({ key, title }) => (
              <BoardColumn key={key} title={title} project={project} beads={row.columns[key]} />
            ))}
          </div>
        );
        return row.title === null ? (
          <div key="all">{columns}</div>
        ) : (
          <section key={row.title} aria-label={row.title} className="flex flex-col gap-2">
            <h2 className="font-medium">{row.title}</h2>
            {columns}
          </section>
        );
      })}
      {filters.finished && (
        <ClosedColumn
          title="Recently finished"
          project={project}
          beads={closedNewestFirst(beads)}
          limit={FINISHED_LIMIT}
          allLabel={(total) => `Show all ${total} completed`}
          empty={filters.closed ? "No beads" : "Turn on Show closed to see closed beads"}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: `useCardKeys.ts`:**

```ts
import { useEffect } from "react";

const typing = (target: EventTarget | null) =>
  target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;

const cards = () => Array.from(document.querySelectorAll<HTMLAnchorElement>("[data-card] a"));

function move(step: 1 | -1) {
  const list = cards();
  if (list.length === 0) return;
  const at = list.findIndex((link) => link === document.activeElement);
  const next = at === -1 ? (step === 1 ? 0 : list.length - 1) : (at + step + list.length) % list.length;
  list.at(next)?.focus();
}

/** `/` search, `Esc` leave search, arrows between cards; Enter opens the focused card link natively. */
export function useCardKeys(enabled: boolean, clearSearch: () => void): void {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const target = event.target;
      if (event.key === "Escape" && target instanceof HTMLInputElement && target.type === "search") {
        if (target.value !== "") clearSearch();
        else target.blur();
        return;
      }
      if (typing(target)) return;
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("bead-search")?.focus();
      } else if (event.key === "ArrowDown" || event.key === "ArrowRight") {
        event.preventDefault();
        move(1);
      } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        move(-1);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, clearSearch]);
}
```

- [ ] **Step 5: `BeadsView.tsx`.** Call `useCardKeys(filters.view !== "list", clearSearch)` at the top level of the component (before any early return), with `const clearSearch = () => onChange({ ...filters, q: "" });`; add the branch `{filters.view === "focus" && <FocusView project={project} beads={scoped} filters={filters} onChange={onChange} />}` next to the Board branch. The Focus "Recently finished" column uses `scoped` (search, filters and lane already applied), so it is cut after them.

- [ ] **Step 6: validate.** The four frontend commands and `uv --directory backend run pytest -q` are green. The real-host check (`list_beads` on qwikfone, as in Track 1) is run by the orchestrator, not the worker; the owner checks `/beads?project=qwikfone&view=board` and `view=focus` in the browser after the build and a restart.

## Integration
- **Branch**: `feat/gin-console-rm-beads-native` in the worktree `.planning/worktrees/gin-console-rm-beads-native`
- **Merge strategy**: sequential (fast-forward into master after archiving the change)

## Validation
- [ ] `uv --directory backend run pytest -q`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` pass
- [ ] `gin-workflow specs lint --change gin-console-rm-beads-native` and `specs trace` show every REQ covered
- [ ] Manual (owner, after the build and a restart): `/beads?project=qwikfone&view=board` and `view=focus` match `bd ready` and `bd blocked`; grouping, Recently finished, the lane and the keyboard work; a reload restores the view

## Notes
- Model guidance is planning metadata, not Beads state.
- Shipping this change must not close the epic `gin-console-rm-beads-native`; change C remains.
