# Plan: Dependency tree

Epic: gin-console-rm-beads-native
Spec: docs/changes/gin-console-rm-beads-native-tree/ (proposal.md, spec-delta.md, design.md, tests.md)

This is change D of five under the epic (A browse, B Board and Focus and C comments and authors are shipped; D dependency tree; E retire Scotty). Shipping it must NOT close the epic.

## Objective

The Beads page has a Tree view beside List, Board and Focus: a collapsible tree of the project's beads grouped by parent (Hierarchy) or by what blocks what (Blocking), narrowed by the shared search, filters and lane, with a detail panel beside it for the selected bead and a keyboard-operable tree. The list endpoint gains `blocked_by`, read from dependencies that `bd list` already prints. Everything is read-only.

## Goal, Architecture, Tech Stack (from the spec)

- Goal: see how beads depend on each other natively in the console, so that Scotty is no longer needed for it (change D of the epic that ends with retiring Scotty).
- Architecture: backend `beads/source.py` reads the `dependencies` rows of `bd list --json` into `BeadSummary.blocked_by`. Frontend: `tree.ts` holds the pure rules (index, filter, rows); `TreeView.tsx`, `TreeRow.tsx`, `TreeToolbar.tsx`, `TreeKeys` handle the screen; `filters.ts` gains `tree` and `select`; `BeadDetailPage` gains `embedded` and is shown in the panel. No new endpoint, command or dependency.
- Tech stack: Python 3.12, FastAPI, pydantic v2, pytest, ruff, mypy; React, TypeScript, Tailwind, shadcn/ui, vitest, Testing Library.

## Global Constraints

- Read-only: no new `bd` command runs (the existing `bd list`, `bd show`, `bd dep list`, `bd ready`, `bd blocked` and `bd comments` only); nothing is ever created, updated, closed or deleted.
- Single machine, Tailscale-only access; no authentication.
- Non-goals: drawing nodes and edges as a graph, dragging, editing dependencies, the `related`, `discovered-from` and `supersedes` relations, several projects in one tree, a tree for a single bead inside the bead page, retiring Scotty (change E).
- Titles, labels and every other text come from people and agents: render them as plain text only; ids in links go through `encodeURIComponent`.
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
- Problem statement: the console cannot show what blocks what or the parent-child structure as a tree, so Scotty is still needed for it.
- Success criteria: every scenario in `spec-delta.md` has a passing test; `verify.checks` pass; on the live host `/beads?project=qwikfone&view=tree` shows the epics with their children and, in Blocking mode, the beads that unlock others; clicking a node shows the bead and its comments beside the tree and a reload restores the selection.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Derive the tree in the browser from the list (selected in discuss)
- Summary: `blocked_by` joins the list rows; `tree.ts` builds the tree from the loaded beads.
- Pros: no new `bd` call, endpoint or cache; the same data feeds the filters; switching view needs no request; the rules are pure and easy to test.
- Cons: the browser walks the open part of the tree on every render (bounded by the 2000-row cap).

### Option 2: A tree endpoint backed by `bd dep tree`
- Pros: the server does the walking.
- Cons: one `bd` call per root, heavy rows (each carries the description), a new cache, and filters would need another round trip.

### Recommended Approach
- Selected option: Option 1.
- Reasoning: confirmed in discuss.

## Scope
- In scope: REQ-BEADS-010, REQ-UI-030 (modified), REQ-UI-041..046.
- Out of scope: everything under non-goals.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Four tracks in a dependency chain (backend field, pure tree rules and URL state, tree screen, panel and keyboard); each needs the previous one's interface, so one agent working in order is simplest.
```

## Verified facts about `bd` (checked on this host; the code below relies on them)

- `bd list --json` prints for each bead a `dependencies` list of rows `{issue_id, depends_on_id, type, created_at, created_by, metadata}`; `issue_id` is the bead itself and `depends_on_id` is what it depends on (a `parent-child` row has the parent as `depends_on_id`; a `blocks` row has the blocker). On qwikfone (all beads, 500): 681 rows, of which 360 `blocks`, 256 `parent-child`, 40 `discovered-from`, 22 `related`, and one each of `relates-to`, `supersedes` and `blocked-by`; every `depends_on_id` is a bead of the list.
- `parent` already carries the parent, so `parent-child` rows are not needed.

## File Map

| File | Responsibility | Track |
|---|---|---|
| `backend/src/gin_console/beads/models.py` (modify) | `blocked_by` on `BeadSummary` | 1 |
| `backend/src/gin_console/beads/source.py` (modify) | read `blocks`/`blocked-by` rows into `blocked_by` | 1 |
| `backend/tests/fake_bd.py` (modify) | `dep` helper | 1 |
| `backend/tests/test_beads_source.py`, `test_beads_api.py` (modify) | REQ-BEADS-010 | 1 |
| `frontend/src/features/beads/api.ts` (modify) | `blocked_by` and its guard | 2 |
| `frontend/src/features/beads/filters.ts` (modify) | `tree`, `select`, the `tree` view | 2 |
| `frontend/src/features/beads/tree.ts` (create) | pure tree rules | 2 |
| `frontend/src/features/beads/{tree,filters,api}.test.ts` and the bead fixtures of `beadFixtures.ts`, `BeadsPage.test.tsx`, `BeadDetailPage.test.tsx`, `filters.test.ts`, `frontend/src/app/App.test.tsx` (modify/create) | tests; fixtures get `blocked_by` | 2 |
| `frontend/src/features/beads/{TreeToolbar,TreeRow,TreeView}.tsx` (create), `ViewTabs.tsx`, `BeadsView.tsx` (modify) | the Tree view | 3 |
| `frontend/src/features/beads/TreeView.test.tsx` (create) | REQ-UI-030, 041, 042, 043, 044 and the selection part of 045 | 3 |
| `frontend/src/features/beads/BeadDetailPage.tsx`, `TreeView.tsx`, `BeadsView.tsx`, `useCardKeys.ts` (modify), `treeKeys.ts` (create) | panel, tree keyboard | 4 |
| `frontend/src/features/beads/TreeKeys.test.tsx`, `TreePanel.test.tsx` (create) | REQ-UI-045, 046 | 4 |

## Tasks

### Track 1: Blocking dependencies in the list
- **Dependencies**: none
- **Requirements**: REQ-BEADS-010
- **Files**: modify `backend/src/gin_console/beads/{models,source}.py`, `backend/tests/{fake_bd,test_beads_source,test_beads_api}.py`
- **Provider role**: `backend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-BEADS-010 has a passing pytest test named/commented with its REQ-ID; a malformed dependency row never drops the bead or fails the list; ruff and mypy clean; independent review approved.
- **Estimated complexity**: low

Interfaces produced: `BeadSummary.blocked_by: list[str]` (ids; `[]` when none).

- [ ] **Step 1: helper.** In `backend/tests/fake_bd.py` add:

```python
def dep(issue: str, target: str, kind: str) -> dict[str, Any]:
    """A row of the `dependencies` list that `bd list --json` prints for a bead."""
    return {"issue_id": issue, "depends_on_id": target, "type": kind}
```

- [ ] **Step 2: failing tests.** Append to `test_beads_source.py` (add `dep` to the `fake_bd` import):

```python
# REQ-BEADS-010
def test_beads_010_blocks_and_blocked_by_rows() -> None:
    row = bead("a-5", dependencies=[dep("a-5", "a-1", "blocks"), dep("a-5", "a-2", "blocked-by")])
    (summary,) = list_beads(FakeBd([row]), CWD, closed=False)
    assert summary.blocked_by == ["a-1", "a-2"]


# REQ-BEADS-010
def test_beads_010_other_types_are_ignored() -> None:
    row = bead(
        "a-5",
        dependencies=[
            dep("a-5", "e-1", "parent-child"),
            dep("a-5", "a-1", "related"),
            dep("a-5", "a-2", "discovered-from"),
            dep("a-5", "a-3", "supersedes"),
        ],
    )
    (summary,) = list_beads(FakeBd([row]), CWD, closed=False)
    assert summary.blocked_by == []


# REQ-BEADS-010
def test_beads_010_a_malformed_row_is_skipped_not_the_bead() -> None:
    row = bead(
        "a-5",
        dependencies=[
            {"issue_id": "a-5", "depends_on_id": 7, "type": "blocks"},
            "x",
            {"issue_id": "a-5", "type": "blocks"},
            dep("a-5", "a-1", "blocks"),
            dep("a-5", "a-1", "blocks"),
        ],
    )
    (summary,) = list_beads(FakeBd([row]), CWD, closed=False)
    assert summary.id == "a-5" and summary.blocked_by == ["a-1"]  # the duplicate is dropped too


# REQ-BEADS-010
@pytest.mark.parametrize("dependencies", [None, [], "text", {"x": 1}])
def test_beads_010_no_or_odd_dependencies_give_an_empty_list(dependencies: Any) -> None:
    extra = {} if dependencies is None else {"dependencies": dependencies}
    (summary,) = list_beads(FakeBd([bead("a-5", **extra)]), CWD, closed=False)
    assert summary.blocked_by == []
```

Append to `test_beads_api.py` (add `dep` to the `fake_bd` import):

```python
# REQ-BEADS-010
def test_beads_010_blocked_by_over_http(tmp_path: Path) -> None:
    rows = [bead("a-1"), bead("a-2", dependencies=[dep("a-2", "a-1", "blocks")])]
    body = make(tmp_path, FakeBd(rows)).get("/api/beads", params={"project": "proj"}).json()
    by_id = {r["id"]: r for r in body}
    assert by_id["a-1"]["blocked_by"] == [] and by_id["a-2"]["blocked_by"] == ["a-1"]
```

Run `uv --directory backend run pytest -q`; the new tests fail.

- [ ] **Step 3: models.** In `beads/models.py` add to `BeadSummary`, after `created_by: Text | None = None`: `blocked_by: list[Text] = []`.

- [ ] **Step 4: source.** In `beads/source.py` add (above `_summary`):

```python
_BLOCKING = ("blocks", "blocked-by")


def _blocked_by(rows: Any) -> list[str]:
    """Ids a bead depends on as blockers; `bd list` prints rows {issue_id, depends_on_id, type}."""
    ids: list[str] = []
    for row in rows if isinstance(rows, list) else []:
        if isinstance(row, dict) and row.get("type") in _BLOCKING:
            target = row.get("depends_on_id")
            if isinstance(target, str):
                ids.append(target)
    return list(dict.fromkeys(ids))
```

and change the validation in `_summary` to:

```python
        return BeadSummary.model_validate(
            {
                **{k: raw[k] for k in _SUMMARY_KEYS if k in raw},
                "blocked_by": _blocked_by(raw.get("dependencies")),
            }
        )
```

(`get_bead` is unchanged: in `bd show` output `dependencies` are full beads, and the detail's `blocked_by` stays `[]`.)

- [ ] **Step 5: validate.** `uv --directory backend run pytest -q`, `ruff check .`, `mypy` are green (run `ruff format` only on the files you touched). The real-host check is run by the orchestrator, not the worker: `list_beads(run_bd, Path.home() / "qwikfone", True)` has about 361 ids in total across the `blocked_by` lists, and every id is a bead of the list.

### Track 2: Frontend data and tree rules
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-030 (the `tree` view and its URL), REQ-UI-041, REQ-UI-042, REQ-UI-043, REQ-UI-044 (row data), REQ-UI-045 (the `select` URL) (pure rules and URL parts; the screens are Tracks 3 and 4)
- **Files**: modify `frontend/src/features/beads/{api.ts,filters.ts,api.test.ts,filters.test.ts}` and only the bead fixtures (add `blocked_by: []`) in `frontend/src/features/beads/{beadFixtures.ts,BeadsPage.test.tsx,BeadDetailPage.test.tsx}` and `frontend/src/app/App.test.tsx`; create `frontend/src/features/beads/{tree.ts,tree.test.ts}`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the guard requires `blocked_by` (array of strings); unknown `tree`/`select`/`view` URL values fall back to defaults; the pure rules match the scenarios (roots, children, order, Blocking unlock chains, diamonds, cycles, the cap, filter with ancestors); input is never mutated; all earlier frontend tests pass after their fixtures get the new field; the four frontend commands are green.
- **Estimated complexity**: medium

Interfaces consumed: Track 1 JSON. Produced: `BeadSummary.blocked_by: string[]`; `VIEWS` gains `"tree"`; `BeadFilters.tree: "hierarchy" | "blocking"`, `BeadFilters.select: string`; from `tree.ts`: `TREE_LIMIT`, `TreeMode`, `TreeIndex`, `TreeRow`, `TreeRows`, `treeIndex`, `treeRows`, `keepSet`, `ancestorsOf`, `allBranches`.

- [ ] **Step 1: failing tests.**
  - `tree.test.ts` (each title carries its REQ-ID; the helper makes beads with the `bead` helper of `beadFixtures.ts`):

```ts
import { describe, expect, it } from "vitest";
import { bead } from "./beadFixtures";
import { allBranches, ancestorsOf, keepSet, TREE_LIMIT, treeIndex, treeRows } from "./tree";

const names = (rows: { level: number; bead: { id: string }; repeated: boolean }[]) =>
  rows.map((r) => `${"-".repeat(r.level)}${r.bead.id}${r.repeated ? "*" : ""}`);
const expanded = (index: ReturnType<typeof treeIndex>) => treeRows(index, allBranches(index), null);

describe("tree", () => {
  // REQ-UI-041
  it("REQ-UI-041 roots are beads without a loaded parent; children follow their parent", () => {
    const index = treeIndex(
      [
        bead("e-1", { issue_type: "epic", priority: 1 }),
        bead("t-1", { parent: "e-1", priority: 1 }),
        bead("t-2", { parent: "e-1", priority: 2 }),
        bead("x-1", { priority: 3 }),
        bead("o-1", { parent: "gone", priority: 4 }),
      ],
      "hierarchy",
    );
    expect(names(expanded(index).rows)).toEqual(["e-1", "-t-1", "-t-2", "x-1", "o-1"]);
  });

  // REQ-UI-041
  it("REQ-UI-041 only the roots show until a branch is open", () => {
    const index = treeIndex([bead("e-1"), bead("t-1", { parent: "e-1" })], "hierarchy");
    expect(names(treeRows(index, new Set(), null).rows)).toEqual(["e-1"]);
    expect(names(treeRows(index, new Set(["e-1"]), null).rows)).toEqual(["e-1", "-t-1"]);
  });

  // REQ-UI-041
  it("REQ-UI-041 siblings are ordered by priority, then newest update", () => {
    const index = treeIndex(
      [
        bead("p2", { priority: 2, updated_at: "2026-10-09T00:00:00Z" }),
        bead("p1-old", { priority: 1, updated_at: "2026-10-01T00:00:00Z" }),
        bead("p1-new", { priority: 1, updated_at: "2026-10-08T00:00:00Z" }),
      ],
      "hierarchy",
    );
    expect(names(expanded(index).rows)).toEqual(["p1-new", "p1-old", "p2"]);
  });

  // REQ-UI-041
  it("REQ-UI-041 a parent cycle still shows every bead once as a root", () => {
    const index = treeIndex([bead("a", { parent: "b" }), bead("b", { parent: "a" })], "hierarchy");
    expect(names(expanded(index).rows)).toEqual(["a", "-b", "--a*"]);
  });

  // REQ-UI-042
  it("REQ-UI-042 blocking: roots block others and are blocked by none; children are what they block", () => {
    const index = treeIndex(
      [
        bead("a-1"),
        bead("a-2", { blocked_by: ["a-1"] }),
        bead("a-3", { blocked_by: ["a-2"] }),
        bead("lone"),
        bead("gone-child", { blocked_by: ["not-loaded"] }),
      ],
      "blocking",
    );
    expect(names(expanded(index).rows)).toEqual(["a-1", "-a-2", "--a-3"]);
  });

  // REQ-UI-042
  it("REQ-UI-042 blocking: a bead blocked from two places shows under both", () => {
    const index = treeIndex(
      [bead("a-1", { priority: 1 }), bead("a-2", { priority: 2 }), bead("a-3", { blocked_by: ["a-1", "a-2"] })],
      "blocking",
    );
    expect(names(expanded(index).rows)).toEqual(["a-1", "-a-3", "a-2", "-a-3"]);
  });

  // REQ-UI-042
  it("REQ-UI-042 blocking: a cycle is finite and the repeat is a leaf marked repeated", () => {
    const index = treeIndex(
      [bead("a-1", { blocked_by: ["a-2"] }), bead("a-2", { blocked_by: ["a-1"] })],
      "blocking",
    );
    const { rows } = expanded(index);
    expect(names(rows)).toEqual(["a-1", "-a-2", "--a-1*"]);
    expect(rows[2]?.hasKids).toBe(false);
  });

  // REQ-UI-042
  it("REQ-UI-042 a bead that blocks itself is ignored", () => {
    const index = treeIndex([bead("a-1", { blocked_by: ["a-1"] })], "blocking");
    expect(expanded(index).rows).toEqual([]);
  });

  // REQ-UI-042
  it("REQ-UI-042 shows at most TREE_LIMIT rows and counts the rest", () => {
    const beads = Array.from({ length: TREE_LIMIT + 100 }, (_, i) => bead(`n-${i}`));
    const result = expanded(treeIndex(beads, "hierarchy"));
    expect(result.rows).toHaveLength(TREE_LIMIT);
    expect(result.omitted).toBe(100);
  });

  // REQ-UI-043
  it("REQ-UI-043 keepSet holds the matches and their ancestors; rows show only those", () => {
    const index = treeIndex(
      [
        bead("e-1", { issue_type: "epic" }),
        bead("t-1", { parent: "e-1", title: "Fix login" }),
        bead("t-2", { parent: "e-1", title: "Add search" }),
      ],
      "hierarchy",
    );
    const keep = keepSet(index, new Set(["t-1"]));
    expect([...keep].sort()).toEqual(["e-1", "t-1"]);
    expect(names(treeRows(index, keep, keep).rows)).toEqual(["e-1", "-t-1"]);
  });

  // REQ-UI-043
  it("REQ-UI-043 ancestorsOf lists the ancestors without the bead itself", () => {
    const index = treeIndex(
      [bead("e-1"), bead("t-1", { parent: "e-1" }), bead("s-1", { parent: "t-1" })],
      "hierarchy",
    );
    expect([...ancestorsOf(index, "s-1")].sort()).toEqual(["e-1", "t-1"]);
    expect([...ancestorsOf(index, "e-1")]).toEqual([]);
  });

  // REQ-UI-044
  it("REQ-UI-044 rows carry level, branch state, child progress and blocker count", () => {
    const index = treeIndex(
      [
        bead("e-1", { issue_type: "epic" }),
        bead("t-1", { parent: "e-1", status: "closed" }),
        bead("t-2", { parent: "e-1", blocked_by: ["t-1", "gone"] }),
      ],
      "hierarchy",
    );
    const [epic, , second] = expanded(index).rows;
    expect(epic).toMatchObject({ level: 0, hasKids: true, open: true, totalKids: 2, closedKids: 1 });
    expect(second).toMatchObject({ level: 1, hasKids: false, blockers: 1 });
    expect(treeRows(index, new Set(), null).rows[0]).toMatchObject({ open: false });
  });

  // REQ-UI-044
  it("REQ-UI-044 allBranches lists the beads that have children", () => {
    const index = treeIndex([bead("e-1"), bead("t-1", { parent: "e-1" })], "hierarchy");
    expect([...allBranches(index)]).toEqual(["e-1"]);
  });
});
```

  - `filters.test.ts`: the `bead` helper gets `blocked_by: []`; the full-object test of `parseFilters` (REQ-UI-025) now also expects `tree: "hierarchy", select: ""`; add: REQ-UI-030 `parseFilters("?view=tree").view === "tree"`; REQ-UI-042 `?tree=blocking` gives `"blocking"`, `?tree=x` and `""` give `"hierarchy"`; REQ-UI-045 `?select=t-1` gives `"t-1"`; `filtersToSearch({ ...empty, view: "tree", tree: "blocking", select: "a b" })` is `"?view=tree&tree=blocking&select=a+b"`, `tree: "hierarchy"` and `select: ""` write nothing, and a round trip is stable.
  - `api.test.ts`: its summary helper gets `blocked_by: []`; add REQ-BEADS-010 / REQ-UI-042: a summary without `blocked_by` is rejected (`Could not load beads (unexpected response)`), `blocked_by: "a-1"` and `blocked_by: [1]` are rejected, `["a-1", "a-2"]` is accepted.
  - Fixtures: add `blocked_by: []` to `bead` in `beadFixtures.ts`, `BeadsPage.test.tsx`, `filters.test.ts`, `beadDetail` in `BeadDetailPage.test.tsx` and the two inline bead objects in `App.test.tsx`.
  Run `pnpm -C frontend test --run`; the new tests fail.

- [ ] **Step 2: `api.ts`.** Add `blocked_by: string[];` to `BeadSummary` (after `created_by`). In `isSummary` add `isStringArray(field(value, "blocked_by")) &&` next to the existing `isStringArray(field(value, "labels"))`.

- [ ] **Step 3: `filters.ts`.** `VIEWS` becomes `["list", "board", "focus", "tree"] as const`. Add to `BeadFilters`: `tree: "hierarchy" | "blocking"; select: string;`. In `parseFilters` add `tree: p.get("tree") === "blocking" ? "blocking" : "hierarchy",` and `select: p.get("select") ?? "",`. In `filtersToSearch`, after the `lane` line:

```ts
  if (filters.tree === "blocking") p.set("tree", "blocking");
  if (filters.select !== "") p.set("select", filters.select);
```

- [ ] **Step 4: `tree.ts`:**

```ts
import type { BeadSummary } from "./api";

export const TREE_LIMIT = 2000;
const WALK_LIMIT = 100_000; // ponytail: a pathological DAG stops being counted here; the count then reads "N+ more"

export type TreeMode = "hierarchy" | "blocking";

export type TreeIndex = {
  mode: TreeMode;
  byId: ReadonlyMap<string, BeadSummary>;
  roots: readonly BeadSummary[];
  kids: ReadonlyMap<string, readonly BeadSummary[]>;
  parents: ReadonlyMap<string, readonly string[]>;
};

export type TreeRow = {
  key: string; // the ids from the root down, unique even when a bead shows in several places
  bead: BeadSummary;
  level: number;
  hasKids: boolean;
  open: boolean;
  repeated: boolean; // already above on this branch: shown as a leaf
  totalKids: number;
  closedKids: number;
  blockers: number; // loaded beads that block this one
};

export type TreeRows = { rows: TreeRow[]; omitted: number; walkLimited: boolean };

const time = (text: string) => Date.parse(text) || 0;
const byImportance = (a: BeadSummary, b: BeadSummary) =>
  a.priority - b.priority || time(b.updated_at) - time(a.updated_at);

const push = (map: Map<string, string[]>, key: string, value: string) => {
  const list = map.get(key);
  if (list === undefined) map.set(key, [value]);
  else list.push(value);
};

/** Index the beads as a forest: by `parent` (hierarchy) or by `blocked_by` (blocking). */
export function treeIndex(beads: readonly BeadSummary[], mode: TreeMode): TreeIndex {
  const byId = new Map(beads.map((b) => [b.id, b]));
  const kidIds = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const bead of beads) {
    const upstream = mode === "hierarchy" ? (bead.parent === null ? [] : [bead.parent]) : bead.blocked_by;
    for (const id of new Set(upstream)) {
      if (id === bead.id || !byId.has(id)) continue;
      push(kidIds, id, bead.id);
      push(parents, bead.id, id);
    }
  }
  const kids = new Map<string, BeadSummary[]>();
  for (const [id, childIds] of kidIds) {
    kids.set(
      id,
      childIds.flatMap((childId) => byId.get(childId) ?? []).sort(byImportance),
    );
  }

  const shown = beads.filter((b) => mode === "hierarchy" || kids.has(b.id)).sort(byImportance);
  const roots = shown.filter((b) => !parents.has(b.id));
  const reached = new Set<string>();
  const reach = (start: BeadSummary) => {
    const stack = [start.id];
    for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
      if (reached.has(id)) continue;
      reached.add(id);
      for (const child of kids.get(id) ?? []) stack.push(child.id);
    }
  };
  roots.forEach(reach);
  // beads on a cycle all have a parent: start from the first one nobody reached
  for (const bead of shown) {
    if (!reached.has(bead.id)) {
      roots.push(bead);
      reach(bead);
    }
  }
  return { mode, byId, roots, kids, parents };
}

/** The ids of the beads that have children: "Expand all". */
export function allBranches(index: TreeIndex): Set<string> {
  return new Set(index.kids.keys());
}

/** The ids reached by walking up from `ids`, the ids themselves included. */
export function keepSet(index: TreeIndex, ids: ReadonlySet<string>): Set<string> {
  const keep = new Set<string>();
  const stack = [...ids].filter((id) => index.byId.has(id));
  for (let id = stack.pop(); id !== undefined; id = stack.pop()) {
    if (keep.has(id)) continue;
    keep.add(id);
    stack.push(...(index.parents.get(id) ?? []));
  }
  return keep;
}

/** The ancestors of a bead, not the bead itself. */
export function ancestorsOf(index: TreeIndex, id: string): Set<string> {
  const above = keepSet(index, new Set([id]));
  above.delete(id);
  return above;
}

/** The rows to show: open branches only, at most TREE_LIMIT, optionally only the beads in `keep`. */
export function treeRows(
  index: TreeIndex,
  open: ReadonlySet<string>,
  keep: ReadonlySet<string> | null,
): TreeRows {
  const rows: TreeRow[] = [];
  let omitted = 0;
  let steps = 0;
  let walkLimited = false;

  const visit = (bead: BeadSummary, level: number, path: readonly string[]) => {
    if (steps >= WALK_LIMIT) {
      walkLimited = true;
      return;
    }
    steps += 1;
    const repeated = path.includes(bead.id);
    const all = repeated ? [] : (index.kids.get(bead.id) ?? []);
    const shownKids = keep === null ? all : all.filter((k) => keep.has(k.id));
    const isOpen = shownKids.length > 0 && open.has(bead.id);
    if (rows.length < TREE_LIMIT) {
      rows.push({
        key: [...path, bead.id].join("/"),
        bead,
        level,
        hasKids: shownKids.length > 0,
        open: isOpen,
        repeated,
        totalKids: all.length,
        closedKids: all.filter((k) => k.status === "closed").length,
        blockers: new Set(bead.blocked_by.filter((id) => index.byId.has(id) && id !== bead.id)).size,
      });
    } else {
      omitted += 1;
    }
    if (isOpen) for (const child of shownKids) visit(child, level + 1, [...path, bead.id]);
  };

  for (const root of index.roots) if (keep === null || keep.has(root.id)) visit(root, 0, []);
  return { rows, omitted, walkLimited };
}
```

- [ ] **Step 5: validate.** `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` are green; all earlier tests pass.

### Track 3: The Tree view
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-030 (the Tree view), REQ-UI-041, REQ-UI-042, REQ-UI-043, REQ-UI-044, REQ-UI-045 (selection in the URL and the selected mark)
- **Files**: create `frontend/src/features/beads/{TreeToolbar,TreeRow,TreeView}.tsx`, `frontend/src/features/beads/TreeView.test.tsx`; modify `frontend/src/features/beads/{ViewTabs,BeadsView}.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of the listed REQs that does not involve the panel or the keyboard has a vitest test; switching to Tree makes no request; the tree follows the shared search, filters, lane and Show closed; the mode and the selection live in the URL; rules of the previous frontend reviews hold (cleanup in tests, fresh `Response` per call, no setState in effects, no clock read during render, no `as`/`any`/`!` (`as const` is fine), one component per file, plain-text rendering).
- **Estimated complexity**: medium

Interfaces consumed: Track 2. Produced: `TreeView`, `TreeRow`, `TreeToolbar`; the tab title `Tree`.

- [ ] **Step 1: failing tests** `TreeView.test.tsx`. Use `stubBeads`, `bead`, `json` from `beadFixtures.ts`; `beforeEach` `window.history.replaceState(null, "", "/beads")`; `afterEach` `cleanup()`, `vi.useRealTimers()`, `vi.restoreAllMocks()`, `vi.unstubAllGlobals()`. Render `<BeadsPage />`; the tree is `screen.getByRole("tree")`, a node `within(tree).getByRole("treeitem", { name: /t-1/ })`. Tests (each title carries the REQ-ID):
  - REQ-UI-030 Tree view: `?project=alpha&view=tree` shows `getByRole("tree")`; switching from List with the `Tree` button puts `view=tree` in the URL, keeps `q`, makes no new request (`fetchMock.mock.calls.length` unchanged).
  - REQ-UI-041 hierarchy: an epic `e-1` with children `t-1`, `t-2` and a root `x-1`: at first only `e-1` and `x-1` are shown (no `t-1`); the button `Expand e-1` shows `t-1` and `t-2` (their `aria-level` is 2); `Collapse e-1` hides them; a bead whose parent is closed (Show closed off) is a root.
  - REQ-UI-042 blocking: `?...&view=tree&tree=blocking` with `a-1` blocking `a-2` blocking `a-3`: the root is `a-1`, `Expand a-1` then `Expand a-2` reveal `a-2` and `a-3`; `a-2` shows `blocked by 1`; the `Group` buttons `Hierarchy` and `Blocking` switch the mode and set/remove `tree=blocking` in the URL; a cycle shows a node with the text `also above`; an unknown `tree=x` gives Hierarchy.
  - REQ-UI-042 limit: 2100 root beads: 2000 treeitems and the text `100 more not shown`.
  - REQ-UI-043 filters: epic `e-1` with children titled `Fix login` and `Add search`: searching `login` shows `e-1` (open) and `Fix login` and not `Add search`; a closed child is absent until `Show closed` is on; the lane `frontend` keeps only frontend beads and their ancestors.
  - REQ-UI-044 rows: each node shows id, title, status, `P<n>` and type as text; an epic with 5 children (3 closed, `closed=1`) says `3/5 closed`; `Expand all` opens every branch and `Collapse all` leaves only the roots; a title `<script>window.hacked = 1</script>` is text and `container.querySelector("script")` is null.
  - REQ-UI-045 selection: clicking the title of `t-1` puts `select=t-1` in the URL (`history.length` does not grow) and the node has `aria-selected="true"`; with `?...&view=tree&select=t-1` at load the node is selected and its parent branch is open.
  - Refresh keeps state: with fake timers, after `Expand e-1` and a 10 s refresh the branch is still open and the selection kept.
  Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: `ViewTabs.tsx`.** `TITLES` gets `tree: "Tree"`: `const TITLES = { list: "List", board: "Board", focus: "Focus", tree: "Tree" } as const;`.

- [ ] **Step 3: `TreeToolbar.tsx`:**

```tsx
import { Button } from "@/components/ui/button";
import type { BeadFilters } from "./filters";

export function TreeToolbar({
  filters,
  onChange,
  onExpandAll,
  onCollapseAll,
}: {
  filters: BeadFilters;
  onChange: (next: BeadFilters) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span>Group</span>
      {(["hierarchy", "blocking"] as const).map((mode) => (
        <Button
          key={mode}
          size="sm"
          variant={filters.tree === mode ? "default" : "outline"}
          aria-pressed={filters.tree === mode}
          onClick={() => onChange({ ...filters, tree: mode })}
        >
          {mode === "hierarchy" ? "Hierarchy" : "Blocking"}
        </Button>
      ))}
      <Button size="sm" variant="outline" onClick={onExpandAll}>
        Expand all
      </Button>
      <Button size="sm" variant="outline" onClick={onCollapseAll}>
        Collapse all
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: `TreeRow.tsx`:**

```tsx
import { Badge } from "@/components/ui/badge";
import type { TreeMode, TreeRow as Row } from "./tree";

export function TreeRow({
  row,
  mode,
  selected,
  tabStop,
  onToggle,
  onSelect,
}: {
  row: Row;
  mode: TreeMode;
  selected: boolean;
  tabStop: boolean;
  onToggle: (id: string, open: boolean) => void;
  onSelect: (id: string) => void;
}) {
  const { bead } = row;
  return (
    <li
      role="treeitem"
      aria-level={row.level + 1}
      aria-selected={selected}
      aria-expanded={row.hasKids ? row.open : undefined}
      data-id={bead.id}
      tabIndex={tabStop ? 0 : -1}
      onClick={() => onSelect(bead.id)}
      style={{ paddingLeft: `${row.level * 1.25}rem` }}
      className={`flex cursor-pointer flex-wrap items-center gap-2 rounded px-2 py-1 text-sm ${selected ? "border border-primary bg-muted" : "border border-transparent"}`}
    >
      {row.hasKids ? (
        <button
          type="button"
          aria-label={`${row.open ? "Collapse" : "Expand"} ${bead.id}`}
          className="w-4 text-xs"
          onClick={(event) => {
            event.stopPropagation();
            onToggle(bead.id, !row.open);
          }}
        >
          {row.open ? "▾" : "▸"}
        </button>
      ) : (
        <span className="w-4" />
      )}
      <span className="font-mono text-xs">{bead.id}</span>
      <span className="font-medium">{bead.title}</span>
      <Badge variant="secondary">{bead.status}</Badge>
      <span>{`P${bead.priority}`}</span>
      <span className="text-muted-foreground">{bead.issue_type}</span>
      {mode === "hierarchy" && bead.issue_type === "epic" && row.totalKids > 0 && (
        <span className="text-muted-foreground">{`${row.closedKids}/${row.totalKids} closed`}</span>
      )}
      {mode === "blocking" && row.blockers > 0 && (
        <span className="text-muted-foreground">{`blocked by ${row.blockers}`}</span>
      )}
      {row.repeated && <span className="text-xs text-muted-foreground">also above</span>}
    </li>
  );
}
```

- [ ] **Step 5: `TreeView.tsx`:**

```tsx
import { useState } from "react";
import type { BeadSummary } from "./api";
import { inLane } from "./columns";
import { filterBeads, type BeadFilters } from "./filters";
import { allBranches, ancestorsOf, keepSet, treeIndex, treeRows } from "./tree";
import { TreeRow } from "./TreeRow";
import { TreeToolbar } from "./TreeToolbar";

export function TreeView({
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
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const base = beads.filter((b) => filters.closed || b.status !== "closed");
  const index = treeIndex(base, filters.tree);
  const filtering =
    filters.q.trim() !== "" ||
    filters.status !== "" ||
    filters.priority !== "" ||
    filters.label !== "" ||
    filters.type !== "" ||
    filters.lane !== "";
  const keep = filtering
    ? keepSet(index, new Set(inLane(filterBeads(beads, filters), filters.lane).map((b) => b.id)))
    : null;
  // a branch is open when the user opened it, when it leads to a match, or when it holds the selection
  const shownOpen = new Set<string>([
    ...open,
    ...(keep ?? []),
    ...(filters.select === "" ? [] : ancestorsOf(index, filters.select)),
  ]);
  const { rows, omitted, walkLimited } = treeRows(index, shownOpen, keep);
  const tabStop = rows.find((r) => r.bead.id === filters.select)?.key ?? rows[0]?.key;

  const toggle = (id: string, value: boolean) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });
  const select = (id: string) => onChange({ ...filters, select: id });

  return (
    <div className="flex flex-col gap-3">
      <TreeToolbar
        filters={filters}
        onChange={onChange}
        onExpandAll={() => setOpen(allBranches(index))}
        onCollapseAll={() => setOpen(new Set())}
      />
      {rows.length === 0 ? (
        <p className="text-muted-foreground">No beads match.</p>
      ) : (
        <ul role="tree" aria-label={`Beads of ${project}`} className="flex flex-col gap-1">
          {rows.map((row) => (
            <TreeRow
              key={row.key}
              row={row}
              mode={filters.tree}
              selected={row.bead.id === filters.select}
              tabStop={row.key === tabStop}
              onToggle={toggle}
              onSelect={select}
            />
          ))}
        </ul>
      )}
      {omitted > 0 && (
        <p className="text-sm text-muted-foreground">{`${omitted}${walkLimited ? "+" : ""} more not shown`}</p>
      )}
    </div>
  );
}
```

  (Track 4 wraps this in the two-column layout with the panel.)

- [ ] **Step 6: `BeadsView.tsx`.** Import `TreeView` and add next to the other views: `{filters.view === "tree" && <TreeView project={project} beads={beads} filters={filters} onChange={onChange} />}`. The tree uses all loaded beads (it filters them itself), not `scoped`.

- [ ] **Step 7: validate.** The four frontend commands are green; the earlier tests pass.

### Track 4: Detail panel and tree keyboard
- **Dependencies**: Track 3
- **Requirements**: REQ-UI-045, REQ-UI-046
- **Files**: create `frontend/src/features/beads/treeKeys.ts`, `frontend/src/features/beads/TreePanel.test.tsx`, `frontend/src/features/beads/TreeKeys.test.tsx`; modify `frontend/src/features/beads/{BeadDetailPage,TreeView,BeadsView}.tsx` and `frontend/src/features/beads/useCardKeys.ts`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: every scenario of REQ-UI-045 and REQ-UI-046 has a vitest test; the panel shows the selected bead with its comments, without the "Back to beads" link and with "Open page"; a selection change never lets the previous bead's late comments through; the tree follows the standard tree keys and roles; the Board and Focus arrow keys are not taken over in the Tree view; rules of the previous frontend reviews hold.
- **Estimated complexity**: medium

Interfaces consumed: Tracks 2 and 3. Produced: `BeadDetailPage` prop `embedded?: boolean`, `treeKeys.ts` `treeKeyDown`, `useCardKeys(enabled, clearSearch, arrows?)`.

- [ ] **Step 1: failing tests.**
  - `TreePanel.test.tsx` (same set-up as `TreeView.test.tsx`; `stubBeads` handles `/api/beads` only, so extend the stub in the test with a second `vi.stubGlobal("fetch", ...)` that also answers `/api/beads/alpha/<id>` with a full detail JSON (the `bead` fixture plus `description`, `design`, `notes`, `acceptance_criteria`, `close_reason`, `dependencies`, `dependents`, `children`: all `null` or `[]`) and `/api/beads/alpha/<id>/comments` with a list):
    - REQ-UI-045 select shows the panel: clicking `t-1` puts `select=t-1` in the URL, the node is `aria-selected`, and the panel (`getByRole("complementary", { name: "Bead details" })`) shows the title heading and, with `comment_count: 1`, the comment text.
    - REQ-UI-045 nothing selected: the panel says `Select a bead to see its details`.
    - REQ-UI-045 restored: `?...&view=tree&select=t-1` at load selects `t-1`, opens its parent branch and shows the panel.
    - REQ-UI-045 not in the tree: with `select=t-1` and the search `zzz` (matching nothing) the panel still shows `t-1` and the text `Not in the current tree`.
    - REQ-UI-045 open page link: the panel has a link `Open page` with `href="/beads/alpha/t-1"` and no link `Back to beads`.
    - REQ-UI-045 selection changes: hold the comments answer of `t-1` with a deferred promise, click `t-2` (comments answer immediately), then release `t-1`'s answer: `t-2`'s comment is shown and `t-1`'s never appears.
  - `TreeKeys.test.tsx` (same set-up; `userEvent`): 
    - REQ-UI-046 roles: the tree has `role="tree"`; an open epic is a `treeitem` with `aria-expanded="true"` and `aria-level="1"`, its children `aria-level="2"`; a leaf has no `aria-expanded`; a collapsed epic has `aria-expanded="false"`.
    - REQ-UI-046 move: focus the first `treeitem` (`.focus()`), `ArrowDown` moves focus to the next shown node, `ArrowUp` back; `ArrowUp` on the first and `ArrowDown` on the last do nothing.
    - REQ-UI-046 open and close: on a collapsed epic `ArrowRight` opens it (`aria-expanded="true"`), a second `ArrowRight` moves focus to its first child; on a child `ArrowLeft` moves focus to the parent; on the open parent `ArrowLeft` closes it.
    - REQ-UI-046 select with Enter: `Enter` on a node puts `select=<id>` in the URL.
    - REQ-UI-046 keys are the tree's own: in the Tree view `ArrowDown` pressed with focus on `document.body` does not move focus to a card (there are none) and does not call `preventDefault` (as in the Board test for an empty view); `/` still focuses the search box and `Escape` still clears it.
  Run `pnpm -C frontend test --run`; expect failures.

- [ ] **Step 2: `BeadDetailPage.tsx`.** Add the prop and use it for the top link:

```tsx
export function BeadDetailPage({ project, id, embedded = false }: { project: string; id: string; embedded?: boolean }) {
```

Replace the definition of `back` by

```tsx
  const back = embedded ? (
    <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`} className="text-sm underline underline-offset-2">
      Open page
    </Link>
  ) : (
    <Link to={`/beads?project=${encodeURIComponent(project)}`} className="text-sm underline underline-offset-2">
      Back to beads
    </Link>
  );
```

(the rest of the component is unchanged, so "Bead not found" in the panel also shows `Open page` instead of `Back to beads`).

- [ ] **Step 3: `treeKeys.ts`:**

```ts
import type { KeyboardEvent } from "react";

const items = (tree: HTMLElement) => Array.from(tree.querySelectorAll<HTMLElement>('[role="treeitem"]'));
const levelOf = (item: HTMLElement) => Number(item.getAttribute("aria-level"));

/** Standard tree keys on a `role="tree"` element: the handler goes on the tree. */
export function treeKeyDown(
  event: KeyboardEvent<HTMLElement>,
  actions: { toggle: (id: string, open: boolean) => void; select: (id: string) => void },
): void {
  if (event.ctrlKey || event.metaKey || event.altKey) return;
  const item = event.target instanceof HTMLElement ? event.target.closest<HTMLElement>('[role="treeitem"]') : null;
  if (item === null) return;
  const list = items(event.currentTarget);
  const at = list.indexOf(item);
  const id = item.dataset.id ?? "";
  const expanded = item.getAttribute("aria-expanded");
  const go = (target: HTMLElement | undefined) => {
    if (target === undefined) return;
    event.preventDefault();
    target.focus();
  };
  switch (event.key) {
    case "ArrowDown":
      go(list.at(at + 1));
      break;
    case "ArrowUp":
      go(at > 0 ? list.at(at - 1) : undefined);
      break;
    case "ArrowRight":
      if (expanded === "false") {
        event.preventDefault();
        actions.toggle(id, true);
      } else if (expanded === "true") {
        go(list.at(at + 1));
      }
      break;
    case "ArrowLeft":
      if (expanded === "true") {
        event.preventDefault();
        actions.toggle(id, false);
      } else {
        go(list.slice(0, at).reverse().find((candidate) => levelOf(candidate) < levelOf(item)));
      }
      break;
    case "Enter":
      event.preventDefault();
      actions.select(id);
      break;
    default:
  }
}
```

(`list.at(at + 1)` is `undefined` past the end, so nothing happens there; `ArrowRight` on a leaf, which has no `aria-expanded`, does nothing.)

- [ ] **Step 4: `useCardKeys.ts`.** Add a third parameter `arrows = true` to `useCardKeys(enabled, clearSearch, arrows = true)` and guard the two arrow branches: `} else if (arrows && (event.key === "ArrowDown" || event.key === "ArrowRight")) {` and `} else if (arrows && (event.key === "ArrowUp" || event.key === "ArrowLeft")) {`. In `BeadsView.tsx` call `useCardKeys(filters.view !== "list", clearSearch, filters.view !== "tree");`.

- [ ] **Step 5: `TreeView.tsx`.** Wrap the tree and a panel in a two-column layout and wire the keys. Import `BeadDetailPage` and `treeKeyDown`. Replace the returned JSX's outer element by

```tsx
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-3">
        {/* toolbar, tree (with onKeyDown below) and the "more not shown" line, as in Track 3 */}
      </div>
      <aside aria-label="Bead details" className="min-w-0 rounded border p-3">
        {filters.select === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!rows.some((r) => r.bead.id === filters.select) && (
              <p className="text-sm text-muted-foreground">Not in the current tree</p>
            )}
            <BeadDetailPage key={`${project}/${filters.select}`} project={project} id={filters.select} embedded />
          </div>
        )}
      </aside>
    </div>
```

and give the `<ul role="tree">` the handler `onKeyDown={(event) => treeKeyDown(event, { toggle, select })}`. (`aside` has the implicit role `complementary`, named by its `aria-label`. The `key` remounts the page and its comments when the selection changes, so a late answer of the previous bead cannot replace the current one.)

- [ ] **Step 6: validate.** The four frontend commands and `uv --directory backend run pytest -q` are green. The real-host check (`blocked_by` on qwikfone, as in Track 1) is run by the orchestrator, not the worker; the owner checks `/beads?project=qwikfone&view=tree` in the browser after the build and a restart.

## Integration
- **Branch**: `feat/gin-console-rm-beads-native` in the worktree `.planning/worktrees/gin-console-rm-beads-native`
- **Merge strategy**: sequential (fast-forward into master after archiving the change)

## Validation
- [ ] `uv --directory backend run pytest -q`, `ruff check .`, `mypy` pass
- [ ] `pnpm -C frontend test --run`, `lint`, `typecheck`, `build` pass
- [ ] `gin-workflow specs lint --change gin-console-rm-beads-native` and `specs trace` show every REQ covered
- [ ] Manual (owner, after the build and a restart): `/beads?project=qwikfone&view=tree` shows the epics with their children; `&tree=blocking` shows what finishing a bead unlocks; clicking a node shows the bead and its comments beside the tree and a reload restores the selection; search and lane narrow the tree; the arrow keys, Enter and the open/close keys work

## Notes
- Model guidance is planning metadata, not Beads state.
- Shipping this change must not close the epic `gin-console-rm-beads-native`; change E remains.
