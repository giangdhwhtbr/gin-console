# Design: Filters assignee sprint

Epic: gin-console-5mi

## Architecture
- **Filter State & URL Sync (`filters.ts`)**:
  - `BeadFilters` removes `lane: string` and introduces `assignee: string` and `sprint: string`.
  - `parseFilters(search)`: parses `assignee` and `sprint` query parameters from `location.search`. Ignores deprecated `lane`.
  - `filtersToSearch(filters)`: serializes non-empty `assignee` and `sprint` to the query string.
- **Options Extraction (`optionsOf`)**:
  - `assignees`: gathers unique non-null `bead.assignee` values, sorted alphabetically. Includes an `"unassigned"` option if any beads have `assignee === null`.
  - `sprints`: scans `bead.labels` for strings matching `^sprint:(.+)$`, extracting the sprint name. Deduplicates and sorts in descending natural alphanumeric order.
- **Filtering Pipeline (`filterBeads`)**:
  - Builds a mapping of bead id to sprint names from direct `sprint:<name>` labels.
  - Matches a bead against selected `filters.sprint` if either:
    1. The bead carries the `sprint:<name>` label directly, OR
    2. The bead has a `parent` ID whose corresponding epic carries `sprint:<name>`.
  - Matches `filters.assignee`:
    1. If `"unassigned"`, matches `bead.assignee === null || bead.assignee === ""`.
    2. If specified, matches `bead.assignee === filters.assignee`.
  - Closed bead inclusion: retains closed beads if `filters.closed || filters.sprint !== "" || bead.status !== "closed"`.
- **UI Components (`BeadFilterBar.tsx`, `BeadsView.tsx`, `Breadcrumb.tsx`)**:
  - `BeadFilterBar`: replaces `<FilterSelect label="Lane" ... />` with two `<FilterSelect>` controls: `Assignee` and `Sprint`. Updates `Clear filters` button to clear `assignee` and `sprint`.
  - `BeadsView`: queries `useBeads(project, filters.closed || filters.sprint !== "")` so backend fetches closed beads when viewing a sprint. Removes `inLane` scoping.
  - `Breadcrumb`: counts `assignee` and `sprint` in active filter counts; drops `lane`.
  - `columns.ts` & `ListView.tsx`: remove `inLane` filtering logic.

## Data Flow
Browser URL (`?assignee=...&sprint=...`) -> `parseFilters` -> `BeadFilters` passed to `BeadsView`.
`BeadsView` calls `useBeads(project, closed = filters.closed || filters.sprint !== "")`.
`optionsOf(beads)` generates options for `Assignee` and `Sprint`.
`filterBeads(beads, filters)` evaluates status, priority, label, type, assignee, and sprint (with parent inheritance and closed sprint inclusion).
Filtered beads are rendered into `BoardView`, `FocusView`, or `ListView`.
User selections dispatch `onChange({ ...filters, ...patch })` which updates browser history via `filtersToSearch`.

## Error Handling
- Unknown or malformed `assignee` or `sprint` parameters in the URL simply result in no beads matching (empty column/view state) rather than runtime crashes.
- Beads missing expected fields (e.g. `parent` pointing to an unlisted ID or nonexistent epic) fall back safely to checking only direct labels.
- Sprints with special characters in names are safely URI-encoded/decoded in search parameters.

## Testing
- Unit tests in `filters.test.ts`:
  - `optionsOf`: verifies extraction of sorted assignees (excluding nulls) and sprints extracted from `sprint:*` labels.
  - `parseFilters` & `filtersToSearch`: verifies round-trip query serialization for `assignee` and `sprint`; verifies obsolete `lane` is dropped.
  - `filterBeads`:
    - Assignee filtering (direct match and "unassigned").
    - Sprint filtering (direct label match and parent epic inheritance).
    - Preserves closed beads when a sprint filter is active even when `closed` is false.
- Component & Integration tests (`BoardView.test.tsx`, `ListView.test.tsx`, `BeadFilterBar`):
  - Renders `Assignee` and `Sprint` selects; does not render `Lane`.
  - Selecting an assignee or sprint filters cards and syncs to URL.
  - "Clear filters" resets assignee and sprint selections.
  - Breadcrumb counts active assignee and sprint filters.
