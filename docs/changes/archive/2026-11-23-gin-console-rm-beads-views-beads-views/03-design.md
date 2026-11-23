# Design: Beads views

Epic: gin-console-rm-beads-views

## Architecture

The change stays in the frontend's `beads` context (ADR 0001); the backend and the API do not change. The URL stays the one source of the filters, the view, the selection and the scope, and no URL key is added: every control calls the `onChange` that the page already passes to `BeadsView` (`BeadsPage.tsx`, `MilestonePage.tsx`, `EpicPage.tsx`), which writes the URL with `navigate(..., { replace: true })`.

### Filters

- `frontend/src/features/beads/filterDefs.ts` (new): one array `FILTER_DEFS` of filter definitions, each with `key`, `label`, `place` (`"bar"` or `"more"`), the value it has by default, `isActive(filters, context)`, `values(filters, options)` (the text of a chip) and `clear` (the part of `BeadFilters` that resets it). Bar: Milestone, Status, Assignee. More: Priority, Labels (with `labelMode`), Type, Kind, Capability, Sprint. The context carries whether the milestone is fixed, whether capabilities and sprints exist, and the milestone in effect without `milestone` in the URL, so Milestone is active only when it differs from that one (REQ-UI-143). The same file exports:
  - `activeFilters(filters, context)`: the search plus the active definitions; the count of "Filters" in the sheet and the condition for "Clear filters" (REQ-UI-084, REQ-UI-143).
  - `moreCount(filters, context)`: the active definitions placed in `more` (REQ-UI-145).
  - `clearFilters(filters)`: the filters with `q` and every definition reset, `milestone` set to `""`; `project`, `closed`, `view`, `group`, `finished`, `select` and `scope` untouched.
  - The breadcrumb (REQ-UI-072) shows `activeFilters` too, so every filter count of the page means the same; `Breadcrumb.tsx` loses its own `activeFilters`, and the remembered place carries the context the count needs (fixed milestone, milestone in effect without `milestone`).
- `FilterChip.tsx` (new): a button with the filter's name while it has no value; a chip in the identity style with "<name> <values>" and a "×" button labelled "Remove <name> filter" while it has one. The body opens a popover (the `@base-ui/react` popover that `MultiSelectPopover.tsx` already uses) holding the filter's menu. Values cut with an ellipsis and their full text as `title` (REQ-UI-107).
- `MoreFilters.tsx` (new): the button "More filters" with the count pill of `moreCount`, and a popover holding the definitions placed in `more`, in their order, with the controls they have today (`MultiSelectPopover`'s list, `LabelsPopover`'s list and mode, `FilterSelect`).
- `BeadFilterBar.tsx`: rebuilt from `FILTER_DEFS`. From 768px: the search box (`id="bead-search"` kept) with a `kbd` hint `/` at its right end and right padding so the text ends before it, a `FilterChip` per bar definition (Milestone left out when fixed), `MoreFilters`, "Clear filters" while `activeFilters > 0`, then the count and "Show closed" as a `role="switch"` checkbox. The search, chips and "More filters" sit in one row that does not wrap from 1024px (the search box at least 8rem wide, each chip shrinking its values only); "Clear filters", the count and "Show closed" sit in a second flex item that wraps below when the row is full. It takes the count as a prop, `null` on an epic page's tabs.
- `MobileFiltersSheet.tsx`: its sections follow `FILTER_DEFS` (Milestone, Status, Assignee, then the `more` definitions); its trigger count is `activeFilters`; "Show closed" leaves the sheet; "Clear all" becomes "Clear filters", shown under the same condition as in the bar.
- `MilestoneFilter.tsx` and `milestoneChoice.ts`: the grouping of the choices (All, No milestone, Active, Planned by `start`, Closed by latest `end`) moves into `milestoneChoice.ts` as one function, used by the Milestone chip's menu and by `MilestoneFilter`, which stays a native select for My Tasks (REQ-UI-105, unchanged). The chip reads "Milestone…" while the state is `loading`; its menu says "Milestones unavailable" when it is `error`. `milestoneInEffect` does not change.
- `BeadsView.tsx`: the "N of M" line moves into the bar; the bar gets `fixedMilestone !== undefined || fixed !== undefined` as today.

### Selection and opening

- `useChoose.ts` (new): `useChoose({ project, selected, select, open? })` returns `click(id)`, `open(id)` and `onKey(event, id)`. It reads `useWide()`. `click` selects from 1024px and opens below. `open` calls `navigate("/beads/<project>/<id>")`, which already saves the scroll position and the opened id for Back (`app/route.ts`, REQ-UI-127). `onKey` handles `Enter`: select when wide and not selected, else open. The five views use it, so the rule has one home (REQ-UI-147).
- `ListView.tsx`, `ListRow.tsx`, `treeKeys.ts`: the row's `onClick` calls `click`, a new `onDoubleClick` calls `open`; `treeKeyDown` gets an `enter(id)` action in place of `select`. The open/close button and the title link keep stopping the event. The List keeps three fifths and two fifths.
- `BoardView.tsx`, `FocusView.tsx`, `BoardColumn.tsx`, `ClosedColumn.tsx`, `BeadCard.tsx`: the views take `onChange` (the Board does not today) and render the panel like the Graph view: a grid `lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]` while a bead is selected, the columns wrapping in the first cell. `BeadCard` gets `selected`, `tabStop`, `onClick`, `onDoubleClick` and `onKeyDown`; the card is the focus target (one card in the tab order, the selected one or the first, as in the List), shows the identity wash and bar when selected, and marks it with `aria-current="true"`. The title link stops the click so it opens the page at every width. Closing removes `select` and focuses the card, as `ListView` does.
- `useCardKeys.ts`: the arrows move between `[data-card]` elements, not their links; `/` and the search box's Escape stay.
- `GraphView.tsx`, `LanesView.tsx`: `onSelect` becomes `click`, `onOpen` becomes `open` (no scope change); the panel gets `hidden lg:block` like the List's. A `select` that names a bead the view does not draw keeps the panel open with the note "Not in the current list", where today it closes it. Closing still writes `select=none`.
- `GraphNode.tsx`: the selected node shows the identity wash and a 3px bar inside its left edge (REQ-UI-141) in place of today's ring; Enter on the button goes through `onKey`, so a second `Enter` opens the page.
- `DetailsPanel.tsx` and `BeadDetailPage.tsx`: `DetailsPanel` takes an optional `onShowChildren`; the embedded `BeadDetailPage` renders a button "Show children" next to "Open page" when it is given. `GraphView` and `LanesView` pass it while `hasChildren(beads, selected)` and the view is not on an epic page's tab (the `trail` prop is already `false` there); it calls `onChange({ ...filters, scope: id, select: "" })`. In the Graph and Lanes panels the embedded page hides "View in graph" (REQ-UI-053).
- `ViewTabs.tsx`, `MilestonePage.tsx`, `EpicPage.tsx`: no change. `ViewTabs` already keeps `select` and turns `none` into `""`; the milestone page already hides the Milestone filter and drops `milestone` from its URL; `EpicPage`'s jump to a child's page when the scope changes is no longer reached.

## Data Flow

- The filter bar: `docs/specs/ui/diagrams/filter-bar-activity.md`, use case `docs/specs/ui/use-cases/narrow-the-beads-list.md`. A control's change goes through `onChange` to the URL; `parseFilters` reads it back, `filterBeads` keeps the matching beads, and `FILTER_DEFS` gives the chips and the counts from the same `BeadFilters`.
- The click rule: `docs/specs/ui/diagrams/select-and-open-activity.md`, use case `docs/specs/ui/use-cases/select-and-open-a-bead.md`. A selection writes `select`; an opening is a `navigate` push that saves the place for Back.
- The details panel: `docs/specs/ui/diagrams/details-panel-activity.md` (updated: five views, no panel below 1024px, the note, "Show children").
- Filtering by milestone: `docs/specs/ui/diagrams/filter-by-milestone-activity.md` with use case `docs/specs/ui/use-cases/filter-by-milestone.md` (the chip, its removal and Clear filters).
- The Graph view: `docs/specs/ui/diagrams/graph-view-activity.md` (updated: a double click opens the page, "Show children" sets the scope).
- The milestone page's Beads tab: `docs/specs/ui/diagrams/browse-milestone-beads-activity.md` with use case `docs/specs/ui/use-cases/browse-milestone-beads.md` (both updated for "Show children"), and `docs/specs/milestone-ui/diagrams/milestone-beads-tab-activity.md` (no Milestone filter).

## Error Handling

- Milestones loading: the Milestone chip reads "Milestone…" and the page filters with "All", as `milestoneInEffect` does today (REQ-UI-104).
- Milestones failing: the chip's menu shows "Milestones unavailable"; the page behaves as with "All". A `milestone` that names no milestone counts as "All", as today.
- A bead that cannot be loaded shows its error and Retry inside the panel (`BeadDetailPage` embedded, REQ-UI-029); the view stays.
- A `select` that names no loaded bead keeps the panel open; the embedded page says "Bead not found" (REQ-UI-029) under the note "Not in the current list".
- Unknown `kind` and `label_mode` values are ignored by `parseFilters`, as today. Unknown `status`, `priority`, `type` and `sprint` values still match no bead and show as chip values or menu choices, as today; this epic does not change that.
- The window crossing 1024px while a bead is selected shows or hides the panel, because `useWide` follows the media query; `select` stays in the URL.

## Testing

- vitest, each test named with its REQ:
  - `filterDefs.test.ts`: REQ-UI-143 active filters (search, each definition, Milestone only when it differs from the one in effect without `milestone`, never when fixed, label mode alone not active, unknown `kind` and `label_mode`), `clearFilters` (removed and kept keys, `milestone` back to `""`), REQ-UI-145 `moreCount`, REQ-UI-084 the sheet count, REQ-UI-072 `breadcrumbCount` unchanged.
  - `FilterChip.test.tsx`: REQ-UI-144 button without a value, chip text and identity style, the body opens the menu, "×" removes one filter, the Milestone chip of the current milestone and its "×" to `milestone=all`, "Milestone…" while loading, "Milestones unavailable" in the menu.
  - `BeadFilterBar.test.tsx`: REQ-UI-142 the order of the controls, no Milestone filter when fixed, no count on an epic page's tab; REQ-UI-146 the `kbd` hint; REQ-UI-143 "Clear filters" shown only while a filter is active.
  - `MoreFilters.test.tsx`: REQ-UI-145 order, Capability and Sprint only when present, the count pill hidden at 0.
  - `MobileFiltersSheet.test.tsx`: REQ-UI-084 the count (the current milestone left out, `milestone=all` counted), the order of the sections, no "Show closed", "Clear filters".
  - `useChoose.test.tsx`: REQ-UI-147 wide click selects, narrow click opens, a click on the selected item keeps it, `Enter` twice (select, then open), `Enter` below 1024px opens, double click opens.
  - `BoardView.test.tsx` and `FocusView.test.tsx`: REQ-UI-147, REQ-UI-148 and REQ-UI-037 a card click selects and shows the panel, two thirds and one third, close and Escape return the focus to the card, the arrows move between cards, the title link opens the page, the note "Not in the current list".
  - `DetailsPanel.test.tsx`, `GraphView.test.tsx`, `LanesView.test.tsx`: REQ-UI-149 "Show children" sets `scope` and clears `select`, absent for a bead without children, in the List, Board and Focus panels and on an epic page's tab; REQ-UI-148 no panel below 1024px; REQ-UI-051 the chain highlighted with no panel at 800px.
  - Update: `ListKeys.test.tsx` "REQ-UI-046 select with Enter" (a second `Enter` opens the page); `GraphView.test.tsx` "REQ-UI-106 drill down to an epic and back to the milestone" and `GraphCanvas.test.tsx` "a click selects and a double click opens" (a double click on a node with children opens its page; the scope changes only through "Show children"); `LanesView.test.tsx` "REQ-UI-111 opening a card goes to its page"; `BeadsPage.test.tsx` around "Clear filters" (shown only while a filter is active, the current milestone back, `closed` and `view` kept) and "REQ-UI-108 Clear filters clears kind and capability"; the tests that find the Milestone `select` by its role on the Beads page.
- gin-qa: `gin-qa cases plan --change gin-console-rm-beads-views` lists a case per scenario of the added and modified REQs; the cases of REQ-UI-084, REQ-UI-104 and REQ-UI-106 that click a Milestone select or double-click into a scope get new steps. The e2e specs under `qa/e2e/ui/` follow the cases, one per REQ.
- `qa/e2e/ui/readability.spec.ts` checks the Beads page, with the bar, at 390, 1024, 1440 and 1920px in both themes (REQ-UI-110).
- TC-1 in `05-tests.md`: Claude runs Playwright on the Tailscale build.
- Checks: `pnpm -C frontend test --run`, `typecheck`, `lint` and `build`.

## Open Technical Questions

<!-- In team mode, a discuss run by a member with no technical role lists each technical point it does not
     decide here, one per line: `- TQ-1: <question>`. Plan asks the technical member about each one and adds an
     indented `Decision: <answer>` line right under it. `gin record plan-approved` refuses while a question has no
     decision. Leave the section empty when there is none. -->
