# Plan: Filters multi select popovers

Epic: gin-console-r4m
Spec: docs/changes/gin-console-r4m-filters-multi-select-popovers/ (proposal.md, spec-delta.md, design.md, tests.md)

## Objective
Upgrade the Beads filtering experience with multi-select support for status, priority, assignee, and labels; comma-separated URL query synchronization; label Any/All matching; sprint visibility refinements; Base UI desktop button popovers; and a mobile bottom sheet drawer.

## Goal, Architecture, Tech Stack (from the spec)

- **Goal**: Enable users to filter beads by multiple statuses, priorities, assignees, and labels simultaneously with responsive desktop popovers and a mobile bottom sheet, while preserving filter state in the URL query.
- **Architecture**:
  - Pure frontend filtering subsystem in `frontend/src/features/beads/`:
    - `filters.ts`: `BeadFilters` model supports arrays for multi-select (`status`, `priority`, `label`, `assignee`) and `labelMode: "any" | "all"`. `parseFilters` and `filtersToSearch` handle comma-separated serialization and backward-compatible single-value parsing. `filterBeads` implements multi-value inclusion, Any/All label matching, and `sprint=none` filtering. `optionsOf` derives unique labels excluding `sprint:*`.
    - `MultiSelectPopover.tsx`: Reusable Base UI popover primitive displaying trigger button with active count badge, and a popover dropdown containing checkboxes, "Select all", and "Clear".
    - `LabelsPopover.tsx`: Extends multi-select popover with an Any/All segmented switch.
    - `MobileFiltersSheet.tsx`: Responsive Base UI dialog drawer rendering vertically stacked filter controls on viewport `< md`.
    - `BeadFilterBar.tsx`: Integrates search input, desktop popovers on `md+`, mobile sheet trigger button on `< md`, Show closed toggle, and Clear filters button.
    - `BeadsView.tsx`, `ListView.tsx`, `Breadcrumb.tsx`: Auto-fetch closed beads when sprint is active (and not "none"), update active filter count, and filter rendered beads.
- **Tech stack**: React 19, TypeScript 5, `@base-ui/react`, Tailwind CSS, Vite, Vitest, Testing Library.

## Global Constraints

- Console remains read-only: zero mutations to beads or dolt databases.
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
- Problem statement: Current single-select filters prevent users from filtering by multiple statuses, priorities, assignees, or labels concurrently. On mobile screens, inline filter selects clutter the header. Labels include `sprint:*` tags which causes redundant controls.
- Success criteria:
  - Every scenario in `spec-delta.md` (`REQ-UI-025`, `REQ-UI-082`, `REQ-UI-083`, `REQ-UI-084`, `REQ-UI-085`) has a passing test.
  - All existing and new tests pass: `pnpm -C frontend test --run`, `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build`.

## Approach Options
### Option 1 (Selected): Base UI Popovers & Sheet with Comma-Delimited URL Serialization
- Summary: Use `@base-ui/react` popover and dialog primitives; serialize array filters as comma-separated values in the URL; maintain purely client-side filtering.
- Pros: Excellent accessibility, clean URL parameters, responsive layout for desktop and mobile, full backward compatibility.
- Cons: Introduces new component files in `features/beads/`.

### Option 2: Custom Lightweight Tailwind Popover & Sheet
- Summary: Build custom React dropdowns and modal drawers with manual outside-click and escape listeners.
- Pros: No Base UI dependency.
- Cons: Manual focus trapping and accessibility boilerplate.

### Recommended Approach
Option 1, as agreed during design discussion.

## Scope
- In scope: `REQ-UI-025`, `REQ-UI-082`, `REQ-UI-083`, `REQ-UI-084`, `REQ-UI-085`.
- Out of scope: Backend API changes, mutating beads, multi-select for Type or Sprint.

## Execution Strategy

```yaml
execution_strategy:
  mode: direct
  workers:
    mode: sequential
  rationale: Three sequential tracks: Track 1 updates the pure data models, URL serialization, and filtering logic with comprehensive unit tests. Track 2 implements the Base UI popovers, Any/All label selector, and mobile sheet component. Track 3 wires everything into BeadFilterBar and the views with full integration tests.
```

## File Map

| File | Responsibility | Track |
|---|---|---|
| `frontend/src/features/beads/filters.ts` (modify) | Update `BeadFilters` interface, `parseFilters`, `filtersToSearch`, `filterBeads`, and `optionsOf` | 1 |
| `frontend/src/features/beads/filters.test.ts` (modify) | Unit tests for multi-select parsing, comma-separated URL roundtrip, Any/All label filtering, and sprint=none | 1 |
| `frontend/src/features/beads/MultiSelectPopover.tsx` (create) | Reusable Base UI popover multi-select component with badge and checkboxes | 2 |
| `frontend/src/features/beads/LabelsPopover.tsx` (create) | Multi-select popover with Any/All match mode segmented switch | 2 |
| `frontend/src/features/beads/MobileFiltersSheet.tsx` (create) | Responsive Base UI dialog drawer for mobile filter controls on screens < md | 2 |
| `frontend/src/features/beads/MultiSelectPopover.test.tsx` (create) | Component tests for popover toggling, multi-selection, and accessibility | 2 |
| `frontend/src/features/beads/BeadFilterBar.tsx` (modify) | Replace selects with popovers, integrate mobile sheet, add No sprint and hide empty sprint | 3 |
| `frontend/src/features/beads/Breadcrumb.tsx` (modify) | Update active filter count computation for array and string filters | 3 |
| `frontend/src/features/beads/BeadsView.tsx` (modify) | Update `useBeads` closed condition for sprint !== "none" | 3 |
| `frontend/src/features/beads/ListView.tsx` (modify) | Update `filtering` flag check for array filters | 3 |
| `frontend/src/features/beads/BoardView.test.tsx` (modify) | Integration tests for board view with multi-select popovers | 3 |
| `frontend/src/features/beads/ListView.test.tsx` (modify) | Integration tests for list view with multi-select popovers | 3 |
| `frontend/src/features/beads/Breadcrumb.test.tsx` (modify) | Integration tests for active filter counter | 3 |

---

## Tasks

### Track 1: Filter Data Models, Pure Logic & URL Query Serialization
- **Dependencies**: none
- **Requirements**: REQ-UI-025, REQ-UI-082, REQ-UI-083, REQ-UI-085
- **Provider role**: frontend
- **Reasoning**: medium
- **Files**:
  - `frontend/src/features/beads/filters.ts` (modify)
  - `frontend/src/features/beads/filters.test.ts` (modify)
- **Interfaces**:
  - Consumed: `Bead` type from `@/types/bead`
  - Produced:
    ```typescript
    export interface BeadFilters {
      q: string;
      status: string[];
      priority: string[];
      label: string[];
      labelMode: "any" | "all";
      type: string;
      assignee: string[];
      sprint: string;
      closed: boolean;
    }
    ```
- **Acceptance criteria**:
  - `parseFilters("?status=open,in_progress&priority=0,1&assignee=alice%40example.com,unassigned&label=ui,backend&label_mode=all&sprint=none")` parses array values, `labelMode="all"`, and `sprint="none"`.
  - Single-value queries (e.g. `?status=open`) backward-compatibly parse into single-item arrays (`["open"]`).
  - `filtersToSearch` serializes arrays as comma-separated values, omits default `label_mode="any"`, and outputs `sprint=none` when sprint is `"none"`.
  - `optionsOf` derives unique labels excluding those starting with `sprint:`.
  - `filterBeads` matches beads having ANY of selected statuses, ANY of selected priorities, ANY of selected assignees (including `"unassigned"`).
  - `filterBeads` with `labelMode="any"` matches beads having at least one selected label; with `labelMode="all"` matches beads having all selected labels.
  - `filterBeads` with `sprint="none"` matches beads without direct or parent epic `sprint:*` label.
- **Steps**:
  1. Write failing unit tests in `frontend/src/features/beads/filters.test.ts` covering `REQ-UI-025`, `REQ-UI-082`, `REQ-UI-083`, and `REQ-UI-085`.
  2. Run `pnpm -C frontend test --run src/features/beads/filters.test.ts` and verify test failures.
  3. Update `BeadFilters`, `parseFilters`, `filtersToSearch`, `optionsOf`, and `filterBeads` in `frontend/src/features/beads/filters.ts`.
  4. Run `pnpm -C frontend test --run src/features/beads/filters.test.ts` and verify all tests pass.
  5. Run `pnpm -C frontend typecheck`.

---

### Track 2: Multi-Select Popover, Labels Filter & Mobile Sheet Components
- **Dependencies**: Track 1
- **Requirements**: REQ-UI-084, REQ-UI-085
- **Provider role**: frontend
- **Reasoning**: medium
- **Files**:
  - `frontend/src/features/beads/MultiSelectPopover.tsx` (create)
  - `frontend/src/features/beads/LabelsPopover.tsx` (create)
  - `frontend/src/features/beads/MobileFiltersSheet.tsx` (create)
  - `frontend/src/features/beads/MultiSelectPopover.test.tsx` (create)
- **Interfaces**:
  - `MultiSelectPopover`:
    ```typescript
    export function MultiSelectPopover({
      label,
      values,
      options,
      onChange,
    }: {
      label: string;
      values: string[];
      options: { value: string; label: string }[];
      onChange: (next: string[]) => void;
    }): React.JSX.Element
    ```
  - `LabelsPopover`:
    ```typescript
    export function LabelsPopover({
      values,
      options,
      mode,
      onValuesChange,
      onModeChange,
    }: {
      values: string[];
      options: { value: string; label: string }[];
      mode: "any" | "all";
      onValuesChange: (next: string[]) => void;
      onModeChange: (next: "any" | "all") => void;
    }): React.JSX.Element
    ```
  - `MobileFiltersSheet`:
    ```typescript
    export function MobileFiltersSheet({
      filters,
      options,
      onChange,
      onClear,
    }: {
      filters: BeadFilters;
      options: BeadOptions;
      onChange: (patch: Partial<BeadFilters>) => void;
      onClear: () => void;
    }): React.JSX.Element
    ```
- **Acceptance criteria**:
  - `MultiSelectPopover` renders button with count badge (e.g. `Status 2`) when values are selected, and opens popover panel on click.
  - Checking/unchecking options invokes `onChange` with updated array; "Select all" and "Clear" buttons work.
  - `LabelsPopover` displays segmented Any/All toggle button and invokes `onModeChange`.
  - `MobileFiltersSheet` opens a dialog on click, presents all filter sections vertically, and closes on backdrop click or close button.
- **Steps**:
  1. Write failing component test `MultiSelectPopover.test.tsx` testing open/close, checkbox toggles, and badge count.
  2. Run `pnpm -C frontend test --run src/features/beads/MultiSelectPopover.test.tsx` and verify failure.
  3. Implement `MultiSelectPopover.tsx`, `LabelsPopover.tsx`, and `MobileFiltersSheet.tsx` using `@base-ui/react`.
  4. Run `pnpm -C frontend test --run src/features/beads/MultiSelectPopover.test.tsx` and verify pass.
  5. Run `pnpm -C frontend typecheck` and `pnpm -C frontend lint`.

---

### Track 3: Filter Bar Integration, View Adaptations & End-to-End Tests
- **Dependencies**: Track 2
- **Requirements**: REQ-UI-025, REQ-UI-082, REQ-UI-083, REQ-UI-084, REQ-UI-085
- **Provider role**: frontend
- **Reasoning**: medium
- **Files**:
  - `frontend/src/features/beads/BeadFilterBar.tsx` (modify)
  - `frontend/src/features/beads/Breadcrumb.tsx` (modify)
  - `frontend/src/features/beads/BeadsView.tsx` (modify)
  - `frontend/src/features/beads/ListView.tsx` (modify)
  - `frontend/src/features/beads/BoardView.test.tsx` (modify)
  - `frontend/src/features/beads/ListView.test.tsx` (modify)
  - `frontend/src/features/beads/Breadcrumb.test.tsx` (modify)
- **Interfaces**:
  - Integrates `MultiSelectPopover`, `LabelsPopover`, and `MobileFiltersSheet` into `BeadFilterBar`.
  - `Breadcrumb` calculates active filter count based on non-empty arrays and strings.
  - `BeadsView` requests `closed=1` when `filters.closed || (filters.sprint !== "" && filters.sprint !== "none")`.
- **Acceptance criteria**:
  - Filter bar renders desktop popovers on `md+` and mobile sheet on `< md`.
  - Sprint dropdown includes "No sprint" option and is hidden when `options.sprints.length === 0`.
  - Active filter count in breadcrumb reflects total count of active filters.
  - "Clear filters" resets all multi-select and single-select filters to initial defaults.
  - All unit, component, and view tests pass across the entire suite.
- **Steps**:
  1. Update `BeadFilterBar.tsx` to use popovers on desktop, single sheet button on mobile, hide sprint if empty, and add "No sprint".
  2. Update `Breadcrumb.tsx`, `BeadsView.tsx`, and `ListView.tsx` for array filters.
  3. Update `BoardView.test.tsx`, `ListView.test.tsx`, and `Breadcrumb.test.tsx` with REQ-UI annotations and assertions for multi-select and responsive behavior.
  4. Run full test suite: `pnpm -C frontend test --run`.
  5. Run `pnpm -C frontend typecheck`, `pnpm -C frontend lint`, and `pnpm -C frontend build`.

---

## Integration
- **Branch**: `feat/filters-multi-select-popovers`
- **Merge strategy**: sequential

## Validation
- [ ] `pnpm -C frontend test --run` passes (all unit, component, and view tests)
- [ ] `pnpm -C frontend typecheck` passes cleanly
- [ ] `pnpm -C frontend lint` passes cleanly
- [ ] `pnpm -C frontend build` passes cleanly
- [ ] `uv --directory backend run pytest` passes cleanly
- [ ] `uv --directory backend run ruff check .` passes cleanly
- [ ] `uv --directory backend run mypy` passes cleanly
