# Plan: One hierarchical List view

Epic: gin-console-3yc
Spec: `docs/changes/gin-console-3yc-list-hierarchy/` (`proposal.md`, `spec-delta.md`, `design.md`, `tests.md`)

## Objective
The List view shows the beads as an indented hierarchy with the card language (state mark, type pill, indicators), the Tree's selection panel, keyboard navigation and "match with its ancestors" filtering; the Tree tab, the Blocking mode and the flat table are gone; the Beads page remembers its place and the open branches in the browser tab, and the bead page shows a breadcrumb that returns to exactly that place.

**Goal:** REQ-UI-072 to 074 and the modified REQ-UI-024, 030, 041, 043, 044, 045, 046 pass their scenarios; REQ-UI-042 is gone.
**Architecture:** the Tree's engine (`tree.ts`, `treeKeys.ts`, selection panel) renamed to the List and restyled; two small module stores in the style of `discussion.ts` (`returnState.ts`, `useWide.ts`); a `Breadcrumb` component used by the bead page.
**Tech Stack:** React 19, TypeScript 6, Tailwind 4, lucide-react, vitest + Testing Library (all installed). No new dependency.

**Global Constraints (verbatim from the spec):**
- Frontend only, in `frontend/src/features/beads/` and `frontend/src/app/`. No backend change, no new dependency.
- Non-goals: restoring the scroll position, a flat table, a Blocking mode (the per-bead graph, epic gin-console-s77, answers it), new filters (epic gin-console-r4m), the bug and reopen indicators (epic gin-console-le3).
- A remembered `search` that names a view that no longer exists (for example `tree`) falls back to the List through `parseFilters`. A remembered project different from the bead's is ignored. Refused storage keeps the values in memory for the visit.
- The List keeps the limit of 2000 rows with "N more not shown" (moved from REQ-UI-042 to REQ-UI-044).

**Spec amendment included in this plan (needs the user's approval with the plan):** while planning, REQ-UI-042 was found to hold the only statement of the 2000-row limit, so removing it would have dropped the limit. `spec-delta.md` now adds the limit and a scenario "Row limit" to REQ-UI-044 and says so in the Reason of the removal. Already committed with this plan.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`: `brainstorm`: `high_reasoning`, `design`: `high_reasoning`, `plan`: `standard_impl`, `implement`: `standard_impl`, `review`: `high_reasoning`, `docs`: `cheap_simple`
- `override_rule`: Use `high_reasoning` for planning only when execution boundaries, dependency sequencing, or major tradeoffs are still unresolved.

## Requirement Analysis
- Problem statement: List and Tree look alike and the Tree looks poor; the "Back to beads" link loses the view and filters; the open branches are lost on leaving the page.
- Success criteria: a bead opened from any view returns to the same view, filters and open branches; the List shows the hierarchy in the card language; `pnpm -C frontend typecheck`, `lint`, `test --run`, `build` pass.
- Constraints and non-goals: see Global Constraints.

## Approach Options
### Option 1: Build the List on the Tree's engine (chosen)
- Summary: rename and restyle `TreeView`/`TreeRow`, keep `tree.ts`, `treeKeys.ts` and the panel, delete the Blocking code and `BeadTable`.
- Pros: the hard parts (keyboard, ARIA, selection, ancestor-keeping filter, limits) exist and are tested.
- Cons: many test files are renamed and edited.

### Option 2: Indent the existing `BeadTable`
- Summary: keep the table, add an indent to the title cell.
- Pros: small visual change.
- Cons: tree keyboard, ARIA and selection would have to be written again for a table.

### Recommended Approach
- Selected option: 1.
- Reasoning: least new behaviour, most reuse; the cost is mechanical edits to tests.

## Scope
- In scope: `frontend/src/features/beads/` (new `returnState.ts`, `useWide.ts`, `ListView.tsx`, `ListRow.tsx`, `Breadcrumb.tsx`; edits to `tree.ts`, `treeKeys.ts`, `filters.ts`, `ViewTabs.tsx`, `BeadsView.tsx`, `BeadsPage.tsx`, `BeadDetailPage.tsx`; deletion of `TreeView.tsx`, `TreeRow.tsx`, `TreeToolbar.tsx`, `BeadTable.tsx`; the tests that name them).
- Out of scope: see Global Constraints.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three code tracks in one feature folder that touch overlapping files and tests, then one track only a person with a browser can finish; no independent parallel work.
```

## Tasks

### Track 1: Remembered place, remembered branches and the width hook
- **Dependencies**: none
- **Requirements**: REQ-UI-073, REQ-UI-074
- **Files**: create `frontend/src/features/beads/returnState.ts`, `returnState.test.ts`, `useWide.ts`, `useWide.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the store remembers the search and the open branches per project in `sessionStorage`, survives a module reload, keeps the value in memory when writing is refused, and ignores damaged text; `useWide` follows `(min-width: 1024px)` and is `true` when `matchMedia` is missing.
- **Estimated complexity**: medium

**Interfaces produced** (exact):
```ts
// returnState.ts
export const RETURN_KEY: "gin-console-beads-return";
export type Saved = { search: string; open: Record<string, string[]> };
export function getReturn(): Saved;
export function rememberSearch(search: string): void;           // search starts with "?" or is ""
export function rememberOpen(project: string, ids: readonly string[]): void;
export function clearReturn(): void;
export function useReturn(): Saved;
// useWide.ts
export function useWide(): boolean;
```

- [ ] **Step 1: Failing tests.** `returnState.test.ts`:
```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearReturn, getReturn, RETURN_KEY, rememberOpen, rememberSearch } from "./returnState";

beforeEach(() => {
  window.sessionStorage.clear();
  clearReturn();
});
afterEach(() => vi.restoreAllMocks());

describe("returnState", () => {
  it("REQ-UI-073 remembers the search", () => {
    rememberSearch("?project=a&view=board&status=open");
    expect(getReturn().search).toBe("?project=a&view=board&status=open");
  });

  it("REQ-UI-074 remembers the open branches per project and keeps the search", () => {
    rememberSearch("?project=a");
    rememberOpen("a", ["e-1"]);
    rememberOpen("b", ["x-1", "x-2"]);
    expect(getReturn()).toEqual({ search: "?project=a", open: { a: ["e-1"], b: ["x-1", "x-2"] } });
  });

  it("REQ-UI-073 a fresh module reads what the tab stored", async () => {
    rememberSearch("?project=a&view=focus");
    vi.resetModules();
    const fresh = await import("./returnState");
    expect(fresh.getReturn().search).toBe("?project=a&view=focus");
  });

  it("REQ-UI-073 keeps the value for the visit when storage refuses to write", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    rememberSearch("?project=a&view=board");
    expect(getReturn().search).toBe("?project=a&view=board");
  });

  it("REQ-UI-073 ignores damaged text in storage", () => {
    window.sessionStorage.setItem(RETURN_KEY, "{not json");
    expect(getReturn()).toEqual({ search: "", open: {} });
    window.sessionStorage.setItem(RETURN_KEY, JSON.stringify({ search: 3, open: {} }));
    expect(getReturn()).toEqual({ search: "", open: {} });
  });
});
```
`useWide.test.tsx`:
```tsx
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWide } from "./useWide";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubMedia(matches: boolean) {
  const listeners = new Set<() => void>();
  const media = {
    matches,
    addEventListener: (_: string, l: () => void) => listeners.add(l),
    removeEventListener: (_: string, l: () => void) => listeners.delete(l),
  };
  vi.stubGlobal("matchMedia", () => media);
  return (next: boolean) => {
    media.matches = next;
    listeners.forEach((l) => l());
  };
}

describe("useWide", () => {
  it("REQ-UI-045 is true from 1024px and false below", () => {
    stubMedia(false);
    expect(renderHook(() => useWide()).result.current).toBe(false);
    cleanup();
    stubMedia(true);
    expect(renderHook(() => useWide()).result.current).toBe(true);
  });

  it("REQ-UI-045 follows the window", () => {
    const set = stubMedia(true);
    const { result } = renderHook(() => useWide());
    act(() => set(false));
    expect(result.current).toBe(false);
  });

  it("REQ-UI-045 is true when matchMedia is missing", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(renderHook(() => useWide()).result.current).toBe(true);
  });
});
```
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run returnState useWide`
- [ ] **Step 3: `returnState.ts`:**
```ts
import { useMemo, useSyncExternalStore } from "react";

export const RETURN_KEY = "gin-console-beads-return";
export type Saved = { search: string; open: Record<string, string[]> };

const EMPTY: Saved = { search: "", open: {} };
const listeners = new Set<() => void>();
let memory: string | null = null; // what was set in this visit: wins over storage, which may refuse writes

function raw(): string {
  if (memory !== null) return memory;
  try {
    return window.sessionStorage.getItem(RETURN_KEY) ?? "";
  } catch {
    return ""; // storage refused: nothing is remembered yet
  }
}

function isLists(value: unknown): value is Record<string, string[]> {
  return (
    typeof value === "object" &&
    value !== null &&
    Object.values(value).every((list) => Array.isArray(list) && list.every((id) => typeof id === "string"))
  );
}

function parse(text: string): Saved {
  try {
    const value: unknown = JSON.parse(text);
    if (typeof value !== "object" || value === null) return EMPTY;
    const search: unknown = Reflect.get(value, "search");
    const open: unknown = Reflect.get(value, "open");
    return typeof search === "string" && isLists(open) ? { search, open } : EMPTY;
  } catch {
    return EMPTY; // empty or damaged text
  }
}

export const getReturn = (): Saved => parse(raw());

function save(next: Saved): void {
  const text = JSON.stringify(next);
  memory = text;
  try {
    window.sessionStorage.setItem(RETURN_KEY, text);
  } catch {
    // storage refused: `memory` holds it for this visit
  }
  listeners.forEach((listener) => listener());
}

export function rememberSearch(search: string): void {
  const now = getReturn();
  if (now.search !== search) save({ ...now, search });
}

export function rememberOpen(project: string, ids: readonly string[]): void {
  const now = getReturn();
  save({ ...now, open: { ...now.open, [project]: [...ids] } });
}

export function clearReturn(): void {
  memory = null;
  try {
    window.sessionStorage.removeItem(RETURN_KEY);
  } catch {
    // storage refused: nothing to remove
  }
  listeners.forEach((listener) => listener());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useReturn(): Saved {
  const text = useSyncExternalStore(subscribe, raw);
  return useMemo(() => parse(text), [text]);
}
```
`useWide.ts`:
```ts
import { useSyncExternalStore } from "react";

const QUERY = "(min-width: 1024px)";
const query = () => (typeof window.matchMedia === "function" ? window.matchMedia(QUERY) : null);

const subscribe = (listener: () => void) => {
  const media = query();
  media?.addEventListener("change", listener);
  return () => media?.removeEventListener("change", listener);
};

/** True from 1024px; true too when the browser cannot tell, so that the wide behaviour is the default. */
export const useWide = (): boolean => useSyncExternalStore(subscribe, () => query()?.matches ?? true);
```
- [ ] **Step 4: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`
- [ ] **Step 5: Commit:** `git add frontend && git commit -m "feat(frontend): remember the beads place and the open branches in the tab"`

### Track 2: The hierarchical List
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-024, REQ-UI-030, REQ-UI-041, REQ-UI-043, REQ-UI-044, REQ-UI-045, REQ-UI-046, REQ-UI-074
- **Files**: modify `tree.ts`, `treeKeys.ts`, `filters.ts`, `ViewTabs.tsx`, `BeadsView.tsx`, `BeadsPage.tsx`; create `ListView.tsx`, `ListRow.tsx`; delete `TreeView.tsx`, `TreeRow.tsx`, `TreeToolbar.tsx`, `BeadTable.tsx`, `BeadTable.test.tsx`; rename and edit `TreeView.test.tsx` to `ListView.test.tsx`, `TreeKeys.test.tsx` to `ListKeys.test.tsx`, `TreePanel.test.tsx` to `ListPanel.test.tsx`; edit `tree.test.ts`, `filters.test.ts`, `BeadsPage.test.tsx` and any other test that fails (all under `frontend/src/features/beads/`)
- **Provider role**: `frontend`
- **Reasoning**: `high`
- **Acceptance criteria**: the List is the hierarchy as the REQs say, with every old Tree behaviour that the REQs keep (open/close, expand all, ancestor-keeping filters, selection panel, keyboard, 2000-row limit), none of Blocking; no Tree tab and no `tree` parameter; every renamed or edited test keeps the REQ-ID of the behaviour it tests, none is deleted except the Blocking and flat-table ones whose REQs are removed or rewritten.
- **Estimated complexity**: high

**Interfaces consumed:** `getReturn`, `rememberOpen`, `useWide` (Track 1), `StateMark`, `TypeBadge`, `CountBadge`. **Produced** (exact):
```ts
// tree.ts (hierarchy only)
export const TREE_LIMIT: 2000;
export type TreeIndex = { byId; roots; kids; parents };   // no `mode`
export type TreeRow = { key; bead; level; hasKids; open; totalKids; closedKids };   // no `repeated`, no `blockers`
export function treeIndex(beads: readonly BeadSummary[]): TreeIndex;
// filters.ts: VIEWS = ["list", "board", "focus", "graph"]; BeadFilters has no `tree`
// ListRow.tsx
export const COLUMNS: string;
export function ListRow(props: { project: string; row: TreeRow; selected: boolean; tabStop: boolean; onToggle: (id: string, open: boolean) => void; onSelect: (id: string) => void }): JSX.Element;
// ListView.tsx
export function ListView(props: { project: string; beads: readonly BeadSummary[]; filters: BeadFilters; onChange: (next: BeadFilters) => void }): JSX.Element;
```

- [ ] **Step 1: Tests first.** (a) `git mv` the three Tree test files to the List names. (b) In them: every URL `view=tree` becomes `view=list` (or loses the parameter), the text "Not in the current tree" becomes "Not in the current list", the tab click `getByRole("button", { name: "Tree" })` becomes "List", describe names say List, REQ-IDs of the Tree REQs stay (041, 043, 044, 045, 046); delete the whole Blocking tests (those with `tree=blocking`, "also above", "blocked by N") and the `Group`/`Hierarchy`/`Blocking` button assertions; rename the test "REQ-UI-042 limit: 2100 root beads" to "REQ-UI-044 row limit: 2100 root beads". (c) In `tree.test.ts` remove the Blocking cases and call `treeIndex(beads)` with one argument. (d) `filters.test.ts`: remove `tree` from the "restores every filter" `toEqual`, delete the `tree=blocking` tests, and add:
```ts
  it("REQ-UI-030 an old Tree link shows the List", () => {
    expect(parseFilters("?view=tree").view).toBe("list");
    expect(filtersToSearch(parseFilters("?view=list&tree=blocking"))).toBe("");
  });
```
(e) `BeadsPage.test.tsx` "REQ-UI-024 row content and order": the rows are now tree items: replace `getAllByRole("row")` by `getAllByRole("treeitem")`, the first item is `alpha-p1` and the second `alpha-p2`, state names ("Ready", "In progress") instead of raw status, the type through `getByText("bug")`, and the updated time through `toLocaleDateString()`; the "count and empty" test stays. (f) Add to `ListView.test.tsx` (imports as in that file; add `beforeEach(() => clearReturn())` from `./returnState` to its `beforeEach`):
```tsx
  it("REQ-UI-044 a row shows the id, title link, state, type, priority, indicators, assignee and three labels", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() =>
      json([
        bead("t-1", {
          title: "Fix it",
          blocked: true,
          priority: 1,
          issue_type: "bug",
          assignee: "alice",
          comment_count: 2,
          labels: ["ui", "qa", "a", "b"],
        }),
      ]),
    );
    render(<BeadsPage />);
    const row = await screen.findByRole("treeitem");
    expect(within(row).getByRole("link", { name: "Fix it" })).toHaveAttribute("href", "/beads/alpha/t-1");
    expect(within(row).getByText("Blocked")).toBeInTheDocument();
    expect(within(row).getByText("bug")).toHaveAttribute("data-type", "bug");
    expect(within(row).getByText("P1")).toBeInTheDocument();
    expect(within(row).getByRole("img", { name: "2 comments" })).toBeInTheDocument();
    expect(within(row).getByText("alice")).toBeInTheDocument();
    expect(within(row).getAllByText(/^(ui|qa|a)$/)).toHaveLength(3);
    expect(within(row).queryByText("b")).toBeNull();
  });

  it("REQ-UI-045 under 1024px a click opens the bead page", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("t-1", { title: "Task One" })]));
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("treeitem", { name: /t-1/ }));
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });

  it("REQ-UI-074 the open branches come back", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("e-1", { issue_type: "epic", title: "Epic" }), bead("t-1", { parent: "e-1", title: "Child" })]));
    render(<BeadsPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Expand e-1" }));
    expect(screen.getByText("Child")).toBeInTheDocument();
    cleanup();
    render(<BeadsPage />);
    expect(await screen.findByText("Child")).toBeInTheDocument();
  });

  it("REQ-UI-074 a remembered bead that is gone is ignored and other projects stay closed", async () => {
    rememberOpen("alpha", ["e-9"]);
    rememberOpen("beta", ["e-1"]);
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("e-1", { issue_type: "epic", title: "Epic" }), bead("t-1", { parent: "e-1", title: "Child" })]));
    render(<BeadsPage />);
    expect(await screen.findByText("Epic")).toBeInTheDocument();
    expect(screen.queryByText("Child")).toBeNull();
  });

  it("REQ-UI-046 Enter on the title link follows the link instead of selecting", async () => {
    window.history.replaceState(null, "", "/beads?project=alpha");
    stubBeads(() => json([bead("t-1", { title: "Task One" })]));
    render(<BeadsPage />);
    const link = await screen.findByRole("link", { name: "Task One" });
    link.focus();
    await userEvent.keyboard("{Enter}");
    expect(window.location.pathname).toBe("/beads/alpha/t-1");
  });
```
(import `rememberOpen` next to `clearReturn`, `vi` from vitest if missing).
- [ ] **Step 2: Run, expect FAIL** (missing modules and removed behaviour): `pnpm -C frontend test --run ListView ListKeys ListPanel tree.test filters.test BeadsPage`.
- [ ] **Step 3: `tree.ts`.** Delete `TreeMode`, the `mode` field and argument, `repeated`, `blockers` and the `blocked_by` branch; keep the cycle guard. The changed parts:
```ts
export type TreeIndex = {
  byId: ReadonlyMap<string, BeadSummary>;
  roots: readonly BeadSummary[];
  kids: ReadonlyMap<string, readonly BeadSummary[]>;
  parents: ReadonlyMap<string, readonly string[]>;
};

export type TreeRow = {
  key: string; // the ids from the root down
  bead: BeadSummary;
  level: number;
  hasKids: boolean;
  open: boolean;
  totalKids: number;
  closedKids: number;
};

/** Index the beads as a forest by `parent`. */
export function treeIndex(beads: readonly BeadSummary[]): TreeIndex {
  const byId = new Map(beads.map((b) => [b.id, b]));
  const kidIds = new Map<string, string[]>();
  const parents = new Map<string, string[]>();
  for (const bead of beads) {
    const parent = bead.parent;
    if (parent === null || parent === bead.id || !byId.has(parent)) continue;
    push(kidIds, parent, bead.id);
    push(parents, bead.id, parent);
  }
  const kids = new Map<string, BeadSummary[]>();
  for (const [id, childIds] of kidIds) {
    kids.set(id, childIds.flatMap((childId) => byId.get(childId) ?? []).sort(byImportance));
  }
  const shown = [...beads].sort(byImportance);
  const roots = shown.filter((b) => !parents.has(b.id));
  // the `reached` loop that follows stays as it is (beads on a cycle all have a parent)
  ...
  return { byId, roots, kids, parents };
}
```
In `treeRows`: remove the `repeated` constant (use `if (path.includes(bead.id)) return;` as the first line of `visit`, before `steps`), `all = index.kids.get(bead.id) ?? []`, and drop `repeated` and `blockers` from the pushed row.
- [ ] **Step 4: `filters.ts`:** `export const VIEWS = ["list", "board", "focus", "graph"] as const;`; delete `tree: "hierarchy" | "blocking";` from `BeadFilters`, its line in `parseFilters` and in `filtersToSearch`. `ViewTabs.tsx`: `const TITLES = { list: "List", board: "Board", focus: "Focus", graph: "Graph" } as const;`.
- [ ] **Step 5: `treeKeys.ts`:** make Enter act only on the row itself, so that Enter on a link inside the row follows the link:
```ts
    case "Enter":
      if (event.target === item) {
        event.preventDefault();
        actions.select(id);
      }
      break;
```
- [ ] **Step 6: `ListRow.tsx`** (new):
```tsx
import { ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@/app/Link";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CountBadge } from "./CountBadge";
import { StateMark } from "./StateMark";
import type { TreeRow } from "./tree";
import { TypeBadge } from "./TypeBadge";

/** One grid for the headings and the rows: title, state, type, priority, indicators, assignee, updated. */
export const COLUMNS = "md:grid-cols-[minmax(0,1fr)_7.5rem_5.5rem_2.5rem_6rem_7rem_8rem]";

export function ListRow({
  project,
  row,
  selected,
  tabStop,
  onToggle,
  onSelect,
}: {
  project: string;
  row: TreeRow;
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
      className={cn(
        "grid cursor-pointer items-center gap-x-3 gap-y-1 rounded-md border px-2 py-1.5 text-sm",
        COLUMNS,
        selected ? "border-foreground bg-muted" : "border-transparent hover:bg-muted/60",
      )}
    >
      <div className="flex min-w-0 items-center gap-2" style={{ paddingLeft: `${row.level * 1.25}rem` }}>
        {row.hasKids ? (
          <button
            type="button"
            aria-label={`${row.open ? "Collapse" : "Expand"} ${bead.id}`}
            className="flex size-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            onClick={(event) => {
              event.stopPropagation();
              onToggle(bead.id, !row.open);
            }}
          >
            {row.open ? <ChevronDown aria-hidden className="size-4" /> : <ChevronRight aria-hidden className="size-4" />}
          </button>
        ) : (
          <span className="size-6 shrink-0" />
        )}
        <span className="shrink-0 font-mono text-xs text-muted-foreground">{bead.id}</span>
        <span className="min-w-0 truncate font-medium" onClick={(event) => event.stopPropagation()}>
          <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(bead.id)}`}>{bead.title}</Link>
        </span>
        {bead.issue_type === "epic" && row.totalKids > 0 && (
          <span className="hidden shrink-0 items-center gap-2 text-xs text-muted-foreground sm:flex">
            <span className="h-1.5 w-12 overflow-hidden rounded bg-muted">
              <span className="block h-full bg-foreground/60" style={{ width: `${(row.closedKids / row.totalKids) * 100}%` }} />
            </span>
            {`${row.closedKids}/${row.totalKids} closed`}
          </span>
        )}
        <span className="hidden shrink-0 items-center gap-1 md:flex">
          {bead.labels.slice(0, 3).map((label) => (
            <Badge key={label} variant="outline">
              {label}
            </Badge>
          ))}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-8 md:contents">
        <StateMark bead={bead} />
        <TypeBadge type={bead.issue_type} className="justify-self-start" />
        <span className="text-xs text-muted-foreground">{`P${bead.priority}`}</span>
        <span className="flex items-center gap-1">
          <CountBadge kind="comments" count={bead.comment_count} />
          <CountBadge kind="dependencies" count={bead.dependency_count} />
        </span>
        <span className="truncate text-muted-foreground">{bead.assignee ?? bead.owner ?? ""}</span>
        <span className="text-xs text-muted-foreground">{new Date(bead.updated_at).toLocaleDateString()}</span>
      </div>
    </li>
  );
}
```
- [ ] **Step 7: `ListView.tsx`** (new; delete `TreeView.tsx`, `TreeRow.tsx`, `TreeToolbar.tsx`, `BeadTable.tsx`, `BeadTable.test.tsx`):
```tsx
import { useState } from "react";
import { navigate } from "@/app/route";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BeadSummary } from "./api";
import { BeadDetailPage } from "./BeadDetailPage";
import { inLane } from "./columns";
import { filterBeads, type BeadFilters } from "./filters";
import { COLUMNS, ListRow } from "./ListRow";
import { getReturn, rememberOpen } from "./returnState";
import { allBranches, ancestorsOf, keepSet, treeIndex, treeRows } from "./tree";
import { treeKeyDown } from "./treeKeys";
import { useWide } from "./useWide";

export function ListView({
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
  const wide = useWide();
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set(getReturn().open[project] ?? []));
  const base = beads.filter((b) => filters.closed || b.status !== "closed");
  const index = treeIndex(base);
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

  const remember = (next: ReadonlySet<string>) => {
    setOpen(next);
    rememberOpen(project, [...next]);
  };
  const toggle = (id: string, value: boolean) => {
    const next = new Set(open);
    if (value) next.add(id);
    else next.delete(id);
    remember(next);
  };
  // from 1024px a click selects the row and fills the panel; narrower, it opens the bead page
  const choose = (id: string) =>
    wide
      ? onChange({ ...filters, select: id })
      : navigate(`/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => remember(allBranches(index))}>
            Expand all
          </Button>
          <Button size="sm" variant="outline" onClick={() => remember(new Set())}>
            Collapse all
          </Button>
        </div>
        {rows.length === 0 ? (
          <p className="text-muted-foreground">No beads match.</p>
        ) : (
          <>
            <div
              aria-hidden
              className={cn("hidden gap-x-3 px-2 text-xs font-medium text-muted-foreground md:grid", COLUMNS)}
            >
              <span>Title</span>
              <span>State</span>
              <span>Type</span>
              <span>P</span>
              <span>Activity</span>
              <span>Assignee</span>
              <span>Updated</span>
            </div>
            <ul
              role="tree"
              aria-label={`Beads of ${project}`}
              onKeyDown={(event) => treeKeyDown(event, { toggle, select: choose })}
              className="flex flex-col gap-1"
            >
              {rows.map((row) => (
                <ListRow
                  key={row.key}
                  project={project}
                  row={row}
                  selected={row.bead.id === filters.select}
                  tabStop={row.key === tabStop}
                  onToggle={toggle}
                  onSelect={choose}
                />
              ))}
            </ul>
          </>
        )}
        {omitted > 0 && (
          <p className="text-sm text-muted-foreground">{`${omitted}${walkLimited ? "+" : ""} more not shown`}</p>
        )}
      </div>
      <aside aria-label="Bead details" className="hidden min-w-0 rounded border p-3 lg:block">
        {filters.select === "" ? (
          <p className="text-muted-foreground">Select a bead to see its details</p>
        ) : (
          <div className="flex flex-col gap-2">
            {!rows.some((r) => r.bead.id === filters.select) && (
              <p className="text-sm text-muted-foreground">Not in the current list</p>
            )}
            <BeadDetailPage key={`${project}/${filters.select}`} project={project} id={filters.select} embedded />
          </div>
        )}
      </aside>
    </div>
  );
}
```
- [ ] **Step 8: `BeadsView.tsx`:** remove the imports of `BeadTable` and `TreeView`, import `ListView`; call the keys hook as `useCardKeys(true, clearSearch, filters.view !== "list" && filters.view !== "graph");`; replace the Tree block and the list block by
```tsx
          {filters.view === "list" && (
            <ListView project={project} beads={beads} filters={filters} onChange={onChange} />
          )}
```
(the Board, Focus and Graph blocks and the "N of M" line stay). Remove from `BeadsPage.tsx` nothing yet (Track 3 adds the remembering).
- [ ] **Step 9: Run the whole suite.** `pnpm -C frontend test --run`. Any other test that still names the Tree, the table or a Tree-only text now fails: change it to the List behaviour and keep its REQ-ID; do not touch tests that do not fail; do not delete a test whose REQ survives. Then `pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build` and `grep -rn "TreeView\|TreeRow\|TreeToolbar\|BeadTable\|filters.tree\|TreeMode" frontend/src` must print nothing.
- [ ] **Step 10: Commit:** `git add -A frontend && git commit -m "feat(frontend): replace the Tree and the table by one hierarchical List"`

### Track 3: Breadcrumb and return to the same place
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-072, REQ-UI-073
- **Files**: create `Breadcrumb.tsx`, `Breadcrumb.test.tsx`, `ReturnFlow.test.tsx`; modify `BeadsPage.tsx`, `BeadDetailPage.tsx`, `BeadDetailPage.test.tsx`
- **Provider role**: `frontend`
- **Reasoning**: `medium`
- **Acceptance criteria**: the bead page (not embedded) shows the breadcrumb of REQ-UI-072 in place of "Back to beads"; the first link returns to the remembered view and filters of the same project; the flow Board with filters, open a card, use the breadcrumb ends on the same Board and filters.
- **Estimated complexity**: medium

**Interfaces produced** (exact):
```ts
// Breadcrumb.tsx
export function activeFilters(filters: BeadFilters): number;     // q, status, priority, label, type, lane, closed
export function Breadcrumb(props: { project: string; id: string; parent: string | null }): JSX.Element;
```

- [ ] **Step 1: Failing tests.** `Breadcrumb.test.tsx`:
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Breadcrumb } from "./Breadcrumb";
import { clearReturn, rememberSearch } from "./returnState";

beforeEach(() => clearReturn());
afterEach(cleanup);

const crumb = () => within(screen.getByRole("navigation", { name: "Breadcrumb" }));

describe("Breadcrumb", () => {
  it("REQ-UI-072 names the view and the filters and links to the remembered place", () => {
    rememberSearch("?project=a&view=board&status=open&q=fix");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    const first = crumb().getByRole("link", { name: "Beads › Board · 2 filters" });
    const href = first.getAttribute("href") ?? "";
    expect(href.startsWith("/beads?")).toBe(true);
    for (const part of ["project=a", "view=board", "status=open", "q=fix"]) expect(href).toContain(part);
    expect(crumb().getByText("a-1")).toHaveAttribute("aria-current", "page");
  });

  it("REQ-UI-072 shows the parent as a link before the bead", () => {
    render(<Breadcrumb project="a" id="a-2" parent="a-1" />);
    expect(crumb().getByRole("link", { name: "a-1" })).toHaveAttribute("href", "/beads/a/a-1");
  });

  it("REQ-UI-072 without a remembered place it says Beads and goes to the project list", () => {
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=a");
  });

  it("REQ-UI-073 ignores the place of another project", () => {
    rememberSearch("?project=a&view=focus");
    render(<Breadcrumb project="b" id="b-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads" })).toHaveAttribute("href", "/beads?project=b");
  });

  it("REQ-UI-072 counts Show closed as a filter and says one filter in the singular", () => {
    rememberSearch("?project=a&view=list&closed=1");
    render(<Breadcrumb project="a" id="a-1" parent={null} />);
    expect(crumb().getByRole("link", { name: "Beads › List · 1 filter" })).toBeInTheDocument();
  });

  it("REQ-UI-072 only the first link stays on a phone (the other items carry the hidden class)", () => {
    render(<Breadcrumb project="a" id="a-2" parent="a-1" />);
    const items = crumb().getAllByRole("listitem");
    expect(items[0]).not.toHaveClass("hidden");
    expect(items[1]).toHaveClass("hidden", "sm:flex");
    expect(items[2]).toHaveClass("hidden", "sm:flex");
  });
});
```
`ReturnFlow.test.tsx` (the reported flow, through `App`):
```tsx
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/app/App";
import { bead, json } from "./beadFixtures";
import { clearReturn } from "./returnState";

beforeEach(() => clearReturn());
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stub() {
  const list = [bead("a-1", { title: "Ready one", ready: true }), bead("a-2", { title: "Other", ready: true })];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url, "http://localhost");
      if (url.pathname === "/api/projects") return Promise.resolve(json([{ name: "alpha", path: "/x", exists: true, workflow: null, beads: null }]));
      if (url.pathname === "/api/beads") return Promise.resolve(json(list));
      if (url.pathname.endsWith("/comments")) return Promise.resolve(json([]));
      return Promise.resolve(json({ ...list[0], description: null, design: null, notes: null, acceptance_criteria: null, close_reason: null, dependencies: [], dependents: [], children: [] }));
    }),
  );
}

describe("return to the same place", () => {
  it("REQ-UI-073 Board with a filter, open a card, use the breadcrumb: same Board and filter", async () => {
    stub();
    window.history.replaceState(null, "", "/beads?project=alpha&view=board&status=open");
    render(<App />);
    await userEvent.click(await screen.findByRole("link", { name: "Ready one" }));
    const nav = await screen.findByRole("navigation", { name: "Breadcrumb" });
    expect(window.location.pathname).toBe("/beads/alpha/a-1");
    await userEvent.click(within(nav).getByRole("link", { name: /^Beads › Board/ }));
    expect(window.location.pathname).toBe("/beads");
    expect(window.location.search).toContain("view=board");
    expect(window.location.search).toContain("status=open");
  });
});
```
(`App` is exported from `frontend/src/app/App.tsx`; adjust the fixture shapes to `beadFixtures.ts` if a field differs.) In `BeadDetailPage.test.tsx` the tests that look for the "Back to beads" link become tests of the breadcrumb: `getByRole("link", { name: "Beads" })` with `href` `/beads?project=alpha`; the 404 test ("links back to the list") looks for the same link; the embedded tests keep "Open page" and assert `queryByRole("navigation", { name: "Breadcrumb" })` is null.
- [ ] **Step 2: Run, expect FAIL:** `pnpm -C frontend test --run Breadcrumb ReturnFlow BeadDetailPage`
- [ ] **Step 3: `Breadcrumb.tsx`:**
```tsx
import { Link } from "@/app/Link";
import { filtersToSearch, parseFilters, type BeadFilters, type View } from "./filters";
import { useReturn } from "./returnState";

const VIEW_NAME: Record<View, string> = { list: "List", board: "Board", focus: "Focus", graph: "Graph" };
const enc = encodeURIComponent;

export function activeFilters(filters: BeadFilters): number {
  return [filters.q.trim(), filters.status, filters.priority, filters.label, filters.type, filters.lane].filter(
    (value) => value !== "",
  ).length + (filters.closed ? 1 : 0);
}

export function Breadcrumb({ project, id, parent }: { project: string; id: string; parent: string | null }) {
  const saved = useReturn();
  const remembered = saved.search !== "" && new URLSearchParams(saved.search).get("project") === project;
  const filters = parseFilters(remembered ? saved.search : "");
  const count = remembered ? activeFilters(filters) : 0;
  const to = remembered ? `/beads${filtersToSearch(filters)}` : `/beads?project=${enc(project)}`;
  const label = remembered
    ? `Beads › ${VIEW_NAME[filters.view]}${count > 0 ? ` · ${count} filter${count === 1 ? "" : "s"}` : ""}`
    : "Beads";
  const later = "hidden items-center gap-2 sm:flex";
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
        <li>
          <Link to={to} className="underline underline-offset-2">
            {label}
          </Link>
        </li>
        {parent !== null && (
          <li className={later}>
            <span aria-hidden>›</span>
            <Link to={`/beads/${enc(project)}/${enc(parent)}`} className="font-mono underline underline-offset-2">
              {parent}
            </Link>
          </li>
        )}
        <li className={later}>
          <span aria-hidden>›</span>
          <span aria-current="page" className="font-mono text-foreground">
            {id}
          </span>
        </li>
      </ol>
    </nav>
  );
}
```
(`filtersToSearch(filters)` rebuilds the query from the parsed filters, so a stale or unknown view such as `tree` becomes the List and the `select` parameter is kept; its output starts with `?` or is empty. The first test above expects the stored order `project, view, status, q`, but `filtersToSearch` writes `project, q, status, ... view`: write the expectation of that test as `href` equal to `"/beads" + filtersToSearch(parseFilters("?project=a&view=board&status=open&q=fix"))`, or compare with `toContain("view=board")` and `toContain("status=open")`, not as one exact string.) `View` must be exported from `filters.ts` (it already is: `export type View`).
- [ ] **Step 4: `BeadsPage.tsx`:** import `useEffect` is already there; add `import { filtersToSearch, parseFilters, type BeadFilters } from "./filters";` (already imported) and `import { rememberSearch } from "./returnState";`; after `const selected = ...` add
```tsx
  // the place the breadcrumb of a bead page returns to; the project is always in it, even when it is the default one
  useEffect(() => {
    if (selected !== "") rememberSearch(filtersToSearch({ ...filters, project: selected }));
  }, [search, selected]);
```
(ESLint's `react-hooks/exhaustive-deps` may ask for `filters`; `filters` is derived from `search`, so list `search` and `selected` and disable that one rule on that line with the comment `// filters is derived from search`.)
- [ ] **Step 5: `BeadDetailPage.tsx`:** import `Breadcrumb`; replace the `back` constant by
```tsx
  const parent = state.status === "ok" ? state.bead.parent : null;
  const back = embedded ? (
    <Link to={`/beads/${encodeURIComponent(project)}/${encodeURIComponent(id)}`} className="text-sm underline underline-offset-2">
      Open page
    </Link>
  ) : (
    <Breadcrumb project={project} id={id} parent={parent} />
  );
```
- [ ] **Step 6: Run, expect PASS:** `pnpm -C frontend test --run && pnpm -C frontend typecheck && pnpm -C frontend lint && pnpm -C frontend build`
- [ ] **Step 7: Commit:** `git add -A frontend && git commit -m "feat(frontend): add the breadcrumb that returns to the remembered place"`

### Track 4: Look at it in a browser
- **Dependencies**: Track 2, Track 3
- **Requirements**: REQ-UI-044, REQ-UI-045
- **Human gate**: a person with a browser looks at the live console on a laptop and a phone, in light and dark, and says what they saw. The agent has no browser; without that person the cases stay "not run".
- **Files**: modify `docs/changes/gin-console-3yc-list-hierarchy/tests.md` (evidence)
- **Provider role**: `frontend`
- **Reasoning**: `low`
- **Acceptance criteria**: TC-1 and TC-2 each have an evidence line that says what was seen, where, in which theme, or "not run" with the reason.
- **Estimated complexity**: low

- [ ] **Step 1:** build and put the result in the running service (`pnpm -C frontend build`, then the live `frontend/dist` as in `deploy/README.md`), so the person can open it.
- [ ] **Step 2 (the person):** TC-1: the List on a laptop in light and dark, with aligned columns, indent, chevrons, epic progress, state and type marks, and the Board to a bead and back through the breadcrumb; TC-2: at 390px a row is two lines and a tap opens the bead page, at 1280px a click fills the panel.
- [ ] **Step 3:** write one evidence line per case in `tests.md` and commit: `git add docs && git commit -m "docs(specs): record the manual checks of the list"`.

## Integration
- **Branch**: `feat/list-hierarchy` (from the updated base)
- **Merge strategy**: sequential

## Validation
- [ ] All tests pass (`pnpm -C frontend test --run`; the 2100-bead limit test can time out on a loaded machine: rerun it alone before calling it a failure)
- [ ] Type checks clean (`pnpm -C frontend typecheck`), lint (`pnpm -C frontend lint`), build (`pnpm -C frontend build`)
- [ ] `grep -rn "TreeView\|TreeRow\|TreeToolbar\|BeadTable\|filters.tree\|TreeMode" frontend/src` prints nothing
- [ ] Manual TC-1 and TC-2 recorded in `tests.md` (Track 4, needs a person)
- [ ] `gin-workflow specs trace --change gin-console-3yc` reports no missing REQ

## Notes
- Model guidance is planning metadata, not Beads state.
- Only the Parent Bead (the epic) stays open until the human-confirmed merge; track beads close after tests and review pass.
- Tracks 1 to 3 are code only. Track 4 needs a person: a goal that runs this epic unattended should stop after Track 3.
- Track 3 depends only on Track 1, but it edits `BeadsPage.tsx` and `BeadDetailPage.tsx` that Track 2 also touches in tests: run them one after the other.
