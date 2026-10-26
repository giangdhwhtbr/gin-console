# Design: Filters multi select popovers

Epic: gin-console-r4m

## Architecture
The filtering subsystem lives in `frontend/src/features/beads/`:
1. **`filters.ts`**: Pure filtering models and URL conversion helpers.
   - `BeadFilters`: `q: string`, `status: string[]`, `priority: string[]`, `label: string[]`, `labelMode: "any" | "all"`, `type: string`, `assignee: string[]`, `sprint: string`, `closed: boolean`.
   - `parseFilters(search: string)`: parses comma-separated lists for array fields, defaulting missing keys to empty arrays, `labelMode` to `"any"`, `closed` to `false`.
   - `filtersToSearch(filters: BeadFilters)`: converts non-empty filters into `URLSearchParams`, joining array values with commas.
   - `filterBeads(beads, filters)`: filters beads against active filter criteria.
   - `optionsOf(beads)`: extracts options for filters. `labels` excludes `sprint:*` items.
2. **`MultiSelectPopover.tsx`**: Reusable Base UI popover primitive for selecting multiple items.
   - Renders trigger button with label and count badge when items are selected.
   - Renders panel with item checkboxes, "Select all", and "Clear".
3. **`LabelsPopover.tsx`**: MultiSelectPopover extension with Any/All match mode switch.
4. **`MobileFiltersSheet.tsx`**: Base UI Dialog/Drawer rendering vertically stacked filter controls on viewport `< md`.
5. **`BeadFilterBar.tsx`**: Integrates search input, laptop popovers on `md+`, single mobile filter trigger button on `< md`, Show closed toggle, and Clear filters button.

## Data Flow
1. URL changes or page load invoke `parseFilters(location.search)`.
2. Filter state `filters` is passed to `useBeads` (which auto-fetches closed beads when `filters.closed || (filters.sprint !== "" && filters.sprint !== "none")`).
3. `optionsOf(beads)` extracts available statuses, priorities, types, assignees, labels (excluding sprint:*), and sprints.
4. User interactions with filter controls trigger `onChange({ ...filters, ...patch })`.
5. `BeadsView` updates the URL search query via `filtersToSearch(nextFilters)` and passes filtered beads `filterBeads(beads, filters)` down to `BoardView` / `ListView` / `FocusView`.

## Error Handling
- Invalid URL parameters (unknown statuses, invalid priority numbers, malformed comma strings) parse safely into valid empty or filtered arrays without throwing or corrupting application state.
- Empty search or non-matching combinations gracefully render the empty bead state ("No beads match your search and filters").

## Testing
- Unit tests in `frontend/src/features/beads/filters.test.ts`:
  - `parseFilters` / `filtersToSearch` roundtrips with comma-separated values.
  - Multi-status, multi-priority, multi-assignee, and "unassigned" filtering.
  - Label filtering with Any vs All mode.
  - Sprint filtering: sprint inheritance, `sprint=none`, and empty sprint list hiding.
- Component & integration tests:
  - `BeadFilterBar.test.tsx`: popover toggles, item selection, count badges, Any/All switch, and mobile sheet opening.
  - `ListView.test.tsx` & `BoardView.test.tsx`: verifying end-to-end multi-filter application.
