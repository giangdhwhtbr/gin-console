# Beads views interaction: one-line filter bar and one click rule

**Context**
The UX review of 2026-11-21 found that the Beads filters took about 300px and that each view handled clicks differently. Epic gin-console-rm-beads-views (2026-11-23) took over the parts that gin-console-rm-nav-shell and gin-console-rm-strung had left out: the one-line bar with chips, one click rule, a details panel for Board and Focus, and a visible `/` hint.

**Decision/Solution**
- **One set of filter definitions** (`frontend/src/features/beads/filterDefs.ts`):
  - `FILTER_DEFS` gives each filter its key, label, place (`bar` or `more`), default, `isActive` and `clear`.
  - `activeFilters`, `moreCount` and `clearFilters` take a `FilterContext`: whether the milestone is fixed, the milestone in effect without `milestone` in the URL, and whether capabilities and sprints are offered.
  - The bar, the "More filters" popover, the phone sheet and the breadcrumb all count with `activeFilters` (REQ-UI-143, REQ-UI-072). "Show closed" is not a filter.
  - The remembered place in `app/origin.ts` carries `milestone: { inEffect, byDefault }`. `BeadsPage` resets it during render when the project changes, so another project's milestone never goes with a place.
- **The bar** (`BeadFilterBar.tsx`):
  - In order: the search (`md:min-w-32`, a `kbd` "/" with `aria-hidden`, `aria-keyshortcuts="/"`), one `FilterChip` each for Milestone, Status and Assignee, and `MoreFilters`.
  - "Clear filters", the "N of M" count and the `role="switch"` "Show closed" form a second group, which wraps below when the first line is full.
  - The milestone `<select>` became `MilestoneMenu` (a radiogroup). Its × sets `milestone=all`. `MultiSelectPopover` and `LabelsPopover` became `MultiSelectList` and `LabelMode`.
- **Chips:**
  - The name and × are `shrink-0`. The values `truncate`, with the full text as `title`.
  - A chosen chip gets the inline minimum width `calc(<label>ch + 4rem)`, so only its values give way at 1024px.
  - Plain filter controls use `border-input`. A chosen chip uses `border-identity` at full opacity, so the outlines reach 3:1 (REQ-UI-059, bug .7).
- **Click rule** (`useChoose.ts`):
  - `click` selects from 1024px and opens the bead page below it. `enter` selects, then opens on a second press. Title links open the page.
  - No item has its own `onDoubleClick`. Two capture-phase listeners on `document` drop a `detail >= 2` click and open the remembered item on `dblclick`, both within `DOUBLE_CLICK_MS` (500).
  - `useCardChoice` gives Board and Focus one tab stop, focus return and closing. Their "Show all" state lives in `BoardView` and `FocusView`. The Lanes arrow keys keep their own `onSelect` (REQ-UI-114).
- **Panel** (`DetailsPanel.tsx`):
  - It is `hidden lg:block` in every view.
  - `graphLink={false}` hides "View in graph" in Graph and Lanes.
  - `onShowChildren` is passed only when the scope is not fixed and the bead has children. It sets `scope` and clears `select`.
  - Closing writes no `select` in List, Board and Focus, and `select=none` in Graph and Lanes.

**Consequences**
- **Double click:** a browser double click is click (detail 1), click (detail 2), then dblclick. When the first click opens the panel and moves the layout, the second click lands on another item or link. Only the capture listener keeps the right item. A double click on a Graph node no longer enters a child scope; use "Show children".
- **Tests:**
  - Canvas tests with `fakeChoose` never see `open` on `userEvent.dblClick`. Test double-click-opens through a real view, or in `useChoose.test.tsx`.
  - A base-ui Popover stays open after a radio or checkbox choice, so a second click on its trigger closes it.
  - In Graph and Lanes tests the default stub answers 404 for a bead detail, and the panel remounts. Use `stubDetails`.
- **Layout:** jsdom cannot see widths. The chip squeeze at 1024px, where names were cut and × overlapped the text, showed only in Playwright on a built UI. At 1024px three chips, a usable search and "Clear filters" do not fit on one line, so "Clear filters" wraps with the count. REQ-UI-142 now says the whole bar fits at 1440px only with no filter active.
- **E2E:**
  - The one-line bar made the Graph page fit 900px, so TC-UI-193 and TC-UI-198 use 1440x800 to keep the page taller than the window.
  - Specs that found "Show closed" as a checkbox, or the Status control as "Status 1", needed updates. A full run of `ui` and `milestone-ui` found 17 of them.
- **Open:** "Expand all" and other outline buttons still use the decoration border in the light theme (1.21:1). They predate this epic and fall under REQ-UI-059.

**References**
- Change: `docs/changes/archive/2026-11-23-gin-console-rm-beads-views-beads-views/`. Diagrams: `docs/specs/ui/diagrams/{filter-bar,select-and-open,browse-milestone-beads,filter-by-milestone}-activity.md`. Use cases: `docs/specs/ui/use-cases/{narrow-the-beads-list,select-and-open-a-bead}.md`.
- Evidence:
  - TC-1: `qa/evidence/2026-11-23-beads-views-tc1/` (171/171).
  - e2e runs: `qa/evidence/2026-11-23T10-34-33` (414 passed) and `2026-11-23T10-44-27` (7/7).
- Beads: gin-console-rm-beads-views (tracks .1 to .6, bug .7).
- Related: [beads-filters-and-epic-kind](beads-filters-and-epic-kind.md), [navigation-shell](navigation-shell.md), [strung-visual-system](strung-visual-system.md), [epic-page](epic-page.md).

**Scope**
The Beads filter bar, its chips and sheet, filter counts, selection and opening in the five Beads views, the details panel, and e2e specs that drive them.
