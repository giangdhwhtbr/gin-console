# Plan: Filters assignee sprint

Epic: gin-console-5mi
Spec: docs/changes/gin-console-5mi-filters-assignee-sprint/ (proposal.md, spec-delta.md, design.md, tests.md)

## Objective

Replace the duplicate "Lane" filter in gin-console with dedicated "Assignee" and "Sprint" filters across the Board, Focus, and List views. Sprints inherit to child tracks from parent epics and automatically fetch closed beads so past and active sprints can be viewed clearly. URL queries, filter counts, and clear filters controls update accordingly.

## Goal, Architecture, Tech Stack (from the spec)

- **Goal**: Allow users and teams to filter work by assignee and by sprint (including past sprints) while eliminating the redundant label lane filter.
- **Architecture**:
  - Pure frontend state and filtering in `frontend/src/features/beads/`:
    - `filters.ts`: `BeadFilters` model drops `lane` and adds `assignee` and `sprint`; `optionsOf` derives unique assignees and extracts sprints from `sprint:*` labels; `filterBeads` applies assignee matching (including "unassigned") and sprint matching (matching direct label or parent epic, retaining closed beads for the sprint).
    - `columns.ts`: removes obsolete `inLane` helper.
    - `BeadFilterBar.tsx`: renders `Assignee` and `Sprint` filter dropdowns, drops `Lane`, and resets assignee and sprint in `Clear filters`.
    - `BeadsView.tsx`: passes `closed: filters.closed || filters.sprint !== ""` to `useBeads`, removes `inLane` wrapper, and renders filtered beads.
    - `ListView.tsx`: filters using `filterBeads` without `inLane`.
    - `Breadcrumb.tsx`: counts active filters using `assignee` and `sprint` instead of `lane`.
- **Tech stack**: React 19, TypeScript 5, Vite, Vitest, Testing Library, Tailwind CSS.

## Global Constraints

- Console remains read-only: no mutations to beads or dolt databases.
- Automated tests carry the REQ-ID in the test name or a comment.
- Zero backend schema changes; backend `/api/beads` endpoint continues to be used.
- All code changes are confined to `frontend/src/features/beads/`.

## Model Guidance
- `default_model_class`: `standard_impl`
- `phase_guidance`:
  - `brainstorm`: `high_reasoning`
  - `design`: `high_reasoning`
  - `plan`: `standard_impl`
  - `implement`: `standard_impl`
  - `review`: `high_reasoning`
  - `docs`: `cheap_simple`
- `override_rule`: Standard implementation model for frontend refactor and unit/component tests.

## Requirement Analysis
- Problem statement: The "Lane" filter duplicates the "Label" filter since both operate identically on `bead.labels`. Users running in team mode cannot filter by task assignee or inspect the current state of active and past sprints.
- Success criteria:
  - Every scenario in `spec-delta.md` (`REQ-UI-082`, `REQ-UI-083`, `REQ-UI-025`, `REQ-UI-035`, `REQ-UI-043`, `REQ-UI-072`, `REQ-UI-036`) has a passing test.
  - All existing and new tests pass: `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build`.

## Approach Options
### Option 1 (Selected): Pure Frontend Extraction and Filtering
- Summary: Extract assignees and sprints client-side from loaded beads; resolve parent epic sprint tags in `filterBeads`; auto-request `closed=1` when `sprint` is active.
- Pros: Instant feedback, zero backend modifications, works uniformly across all views.
- Cons: Sprints and assignees are derived from beads loaded in the current project context.

### Option 2: Backend Sprint Endpoints & Server-Side Filtering
- Summary: Add dedicated `/api/sprints` endpoint and server-side query filters.
- Pros: Resolves parent links on backend.
- Cons: Overengineered, adds latency, duplicates client filter logic, invalidates client caching.

### Recommended Approach
Option 1, as confirmed during the design discussion.

## Scope
- In scope: `REQ-UI-082`, `REQ-UI-083`, `REQ-UI-025`, `REQ-UI-035`, `REQ-UI-043`, `REQ-UI-072`, `REQ-UI-036`.
- Out of scope: Backend API changes, creating/editing beads, sprint planning mutations.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Two sequential tracks: Track 1 defines the pure data models, extraction, and filtering rules with full unit test coverage. Track 2 wires the components, URL synchronization, and UI view tests on top of the established interfaces.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `frontend/src/features/beads/filters.ts` (modify) | Update `BeadFilters`, `parseFilters`, `filtersToSearch`, `optionsOf`, and `filterBeads` | 1 |
| `frontend/src/features/beads/columns.ts` (modify) | Remove obsolete `inLane` function | 1 |
| `frontend/src/features/beads/filters.test.ts` (modify) | Unit tests for assignee/sprint extraction, serialization, and filtering | 1 |
| `frontend/src/features/beads/columns.test.ts` (modify) | Remove obsolete `inLane` tests | 1 |
| `frontend/src/features/beads/BeadFilterBar.tsx` (modify) | Remove Lane select, add Assignee and Sprint selects, update Clear filters | 2 |
| `frontend/src/features/beads/BeadsView.tsx` (modify) | Auto-fetch closed beads when sprint is active, remove `inLane` call | 2 |
| `frontend/src/features/beads/ListView.tsx` (modify) | Drop `inLane` filtering and use `filterBeads` | 2 |
| `frontend/src/features/beads/Breadcrumb.tsx` (modify) | Update active filter count for assignee and sprint | 2 |
| `frontend/src/features/beads/BoardView.test.tsx` (modify) | Component tests for Assignee/Sprint selects and removal of Lane | 2 |
| `frontend/src/features/beads/ListView.test.tsx` (modify) | Component tests for List view assignee filtering without Lane | 2 |
| `frontend/src/features/beads/Breadcrumb.test.tsx` (modify) | Component tests for breadcrumb filter counting | 2 |

---

## Tasks

### Track 1: Data Model, Extraction & Pure Filtering Logic
- **Dependencies**: none
- **Requirements**: REQ-UI-082, REQ-UI-083, REQ-UI-025, REQ-UI-035, REQ-UI-036
- **Role**: frontend
- **Reasoning**: standard_impl
- **Files**:
  - `frontend/src/features/beads/filters.ts`
  - `frontend/src/features/beads/columns.ts`
  - `frontend/src/features/beads/filters.test.ts`
  - `frontend/src/features/beads/columns.test.ts`
- **Interfaces**:
  - `BeadFilters`:
    ```ts
    export type BeadFilters = {
      project: string;
      q: string;
      status: string;
      priority: string;
      label: string;
      type: string;
      closed: boolean;
      view: View;
      group: "" | "assignee";
      finished: boolean;
      assignee: string;
      sprint: string;
      select: string;
    };
    ```
  - `optionsOf(beads: readonly BeadSummary[])`:
    Returns `{ statuses: string[]; priorities: number[]; labels: string[]; types: string[]; assignees: string[]; sprints: string[] }`.
  - `filterBeads(beads: readonly BeadSummary[], filters: BeadFilters): BeadSummary[]`:
    Filters on `q`, `status`, `priority`, `label`, `type`, `assignee`, `sprint` (with parent epic inheritance), and `closed`.

#### Steps:
1. **Failing tests in `filters.test.ts`**:
   - Test `parseFilters`: parses `?assignee=alice` and `?sprint=sprint-1`; ignores `?lane=...`.
   - Test `filtersToSearch`: serializes `assignee` and `sprint`; drops `lane`.
   - Test `optionsOf`: extracts sorted assignees, including `"unassigned"` if any bead has null assignee; extracts sorted sprint names from `sprint:<name>` labels.
   - Test `filterBeads`:
     - Filter by specific assignee (`assignee: "alice@example.com"`).
     - Filter by `"unassigned"`.
     - Filter by sprint directly tagged on bead (`sprint: "1"`).
     - Filter by sprint inherited from parent epic (`parent` has label `sprint:1`).
     - Retains closed beads matching the sprint even when `filters.closed === false`.
2. **Implement in `filters.ts`**:
   - Update `BeadFilters` interface: replace `lane: string` with `assignee: string` and `sprint: string`.
   - Update `parseFilters`: read `assignee` and `sprint` query parameters.
   - Update `filtersToSearch`: append `assignee` and `sprint` when non-empty.
   - Update `optionsOf`:
     - Extract distinct assignees: gather `b.assignee` if string non-empty, sort with `localeCompare`. If `beads.some(b => !b.assignee)`, include `"unassigned"`.
     - Extract distinct sprints: regex match `/^sprint:(.+)$/` on all `b.labels`. Sort descending alphanumeric (e.g. `b.localeCompare(a, undefined, { numeric: true })`).
   - Update `filterBeads`:
     - Build `epicSprintMap = new Map<string, string[]>()` for fast lookup of parent epic sprints.
     - Match assignee: `filters.assignee === "" || (filters.assignee === "unassigned" ? !bead.assignee : bead.assignee === filters.assignee)`.
     - Match sprint: if `filters.sprint === ""`, true; else check if `bead.labels.includes("sprint:" + filters.sprint)` or `(bead.parent && epicSprintMap.get(bead.parent)?.includes(filters.sprint))`.
     - Closed retention: `filters.closed || filters.sprint !== "" || bead.status !== "closed"`.
3. **Clean up `columns.ts` & `columns.test.ts`**:
   - Delete unused `inLane` export in `columns.ts`.
   - Remove `REQ-UI-036 inLane` unit test from `columns.test.ts`.
4. **Verification**:
   - Run `pnpm -C frontend test --run src/features/beads/filters.test.ts src/features/beads/columns.test.ts`.

---

### Track 2: UI Controls, View Integration & Breadcrumbs
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-082, REQ-UI-083, REQ-UI-025, REQ-UI-043, REQ-UI-072
- **Role**: frontend
- **Reasoning**: standard_impl
- **Files**:
  - `frontend/src/features/beads/BeadFilterBar.tsx`
  - `frontend/src/features/beads/BeadsView.tsx`
  - `frontend/src/features/beads/ListView.tsx`
  - `frontend/src/features/beads/Breadcrumb.tsx`
  - `frontend/src/features/beads/BoardView.test.tsx`
  - `frontend/src/features/beads/ListView.test.tsx`
  - `frontend/src/features/beads/Breadcrumb.test.tsx`
- **Interfaces**:
  - `BeadFilterBar`:
    Renders `<FilterSelect label="Assignee" ... />` and `<FilterSelect label="Sprint" ... />`.
    "Clear filters" button sets `{ q: "", status: "", priority: "", label: "", type: "", assignee: "", sprint: "" }`.
  - `BeadsView`:
    Calls `useBeads(project, filters.closed || filters.sprint !== "")`. Passes filtered beads directly without `inLane`.
  - `Breadcrumb`:
    Calculates active filter count using `filters.assignee` and `filters.sprint` instead of `filters.lane`.

#### Steps:
1. **Update `BeadFilterBar.tsx`**:
   - Remove `{filters.view !== "list" && <FilterSelect label="Lane" ... />}`.
   - Add `<FilterSelect label="Assignee" value={filters.assignee} options={options.assignees.map(a => ({ value: a, label: a === "unassigned" ? "Unassigned" : a }))} onChange={assignee => set({ assignee })} />`.
   - Add `<FilterSelect label="Sprint" value={filters.sprint} options={options.sprints.map(same)} onChange={sprint => set({ sprint })} />`.
   - Update `Clear filters` onClick to reset `assignee: ""` and `sprint: ""`.
2. **Update `BeadsView.tsx`**:
   - Change `useBeads(project, filters.closed)` to `useBeads(project, filters.closed || filters.sprint !== "")`.
   - Remove `const scoped = inLane(shown, filters.lane);`.
   - Pass `shown` to `BoardView` and `FocusView`.
   - Update count text: `${shown.length} of ${beads.length}`.
3. **Update `ListView.tsx`**:
   - Remove `filters.lane !== ""` from `matching`.
   - Replace `inLane(filterBeads(beads, filters), filters.lane)` with `filterBeads(beads, filters)`.
4. **Update `Breadcrumb.tsx`**:
   - In `filterCount`, replace `filters.lane` with `filters.assignee` and `filters.sprint`.
5. **Update Component Tests**:
   - In `BoardView.test.tsx`:
     - Replace `REQ-UI-036 lane` test with `REQ-UI-082 assignee` and `REQ-UI-083 sprint` tests.
     - Verify selecting an assignee updates URL search to `assignee=<val>` and filters cards.
     - Verify selecting a sprint updates URL search to `sprint=<val>` and includes child tasks from parent epic.
     - Verify `Clear filters` resets assignee and sprint.
   - In `ListView.test.tsx`:
     - Update `REQ-UI-043` tests to verify assignee filtering instead of lane.
   - In `Breadcrumb.test.tsx`:
     - Verify breadcrumb filter count includes assignee and sprint filters.
6. **Verification**:
   - Run full test suite: `pnpm -C frontend test --run`.
   - Run typecheck: `pnpm -C frontend typecheck`.
   - Run linter: `pnpm -C frontend lint`.
   - Run build: `pnpm -C frontend build`.
