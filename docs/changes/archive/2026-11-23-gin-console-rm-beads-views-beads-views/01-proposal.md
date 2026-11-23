# Beads views

Epic: gin-console-rm-beads-views
Kind: capability
Points: 8 (one-line filter bar with chips and More filters, one click rule over 5 views, details panel for Board and Focus, Show children in Graph and Lanes, medium)
Date: 2026-11-23

<!-- Kind is capability, technical, or parity; for technical epics see technical-design.md. -->

## Why

The UX review of 2026-11-21 found that the filters of the Beads page take about 300px and that each view reacts to a click in its own way. The code shows both:
- The filter bar holds the search, Status, Priority, Labels, Type, Kind, Capability, Assignee, Sprint, the Milestone select, "Show closed" and "Clear filters", and wraps onto several lines (`frontend/src/features/beads/BeadFilterBar.tsx`). The count "N of M" sits on its own line under it (`BeadsView.tsx`).
- "Clear filters" is always shown, even when nothing is filtered.
- In the List view a click on a row selects it from 1024px and opens the bead page below, and `Enter` does what a click does, so from 1024px it never opens the page (`ListView.tsx`, `treeKeys.ts`).
- On the Board and Focus views only the title link of a card reacts; the arrow keys move between those links and `Enter` follows them (`BeadCard.tsx`, `useCardKeys.ts`). These views have no details panel.
- In the Graph and Lanes views a click selects at every width, the panel stacks under the canvas below 1024px, and a double click on a bead with children changes the scope while a double click on any other bead opens its page (`GraphView.tsx`, `LanesView.tsx`).
- `/` already moves the focus to the search box in every view, but nothing on the page says so.

The epic's only comment is the `[gin ship]` note that gin-console-rm-nav-shell shipped (merge 2ca8410). That epic moved the one-line filter bar, the click rule and the search shortcut out of its own scope into this one. Two epics shipped since then. gin-console-rm-strung gave the chip style, and its REQ-UI-140 checks the count pill of a filter control; it left the chips and the one-line bar to this epic. gin-console-k4l removed the project select from the Beads page, so the project switcher sets the project.

User decisions 2026-11-23:
- From 768px the bar reads: the search box with a visible `/` key hint, the filters Milestone, Status and Assignee, "More filters" with its count, then the count "N of M" and "Show closed". From 1024px everything before the count stays on one line; at 1440px the whole bar does.
- A bar filter without a value is a button with its name; with a value it is a chip "<name> <values> ×" in the identity style. Its body opens a popover menu and its "×" removes it. The current milestone shows as a chip, and its "×" sets `milestone=all`. The native milestone select becomes a popover menu with the same choices.
- "More filters" holds Priority, Labels with Any/All, Type, Kind, and Capability and Sprint while they exist. Its count is the number of active filters inside it, hidden at 0.
- "Clear filters" shows only while a filter differs from its default. It removes every filter and the search and returns to the current milestone, and leaves "Show closed", view, group, selection and scope alone.
- Below 768px: the search box and a button "Filters" with the count of active filters, the milestone counted only when it is not the current one; its sheet lists Milestone, Status, Assignee, the More filters group and "Clear filters". No chips and no `/` hint.
- A page that fixes the milestone (the Beads tab of a milestone page, the Graph and Lanes tabs of an epic page) shows no Milestone filter, and its "Clear filters" leaves the milestone.
- One click rule in the List, Board, Focus, Graph and Lanes views on those three pages. From 1024px a click selects and shows the details panel; below 1024px it opens the bead page. The title link, a double click, and `Enter` on the selected item open the bead page. Controls inside an item keep their own action.
- The arrow keys move the focus as today; Board and Focus cards take the focus themselves. `Enter` selects an item that is not selected (below 1024px it opens the page), and Escape closes the panel and returns the focus to the item.
- A double click in Graph and Lanes no longer enters a child scope. The panel of a bead with children offers "Show children", which sets `scope` and clears `select`. On a phone the way down is the bead page.
- Every view shows the same details panel as a side column from 1024px: three fifths and two fifths for the List, two thirds and one third for the others. No view shows it below 1024px. `select` is kept across views, with the note "Not in the current list" when the view does not draw the bead.
- Errors behave as today: "Milestone…" while milestones load, the error in the menu when they fail, a bead error inside the panel, unknown URL values ignored.
- Frontend only, with no API change and no new URL key. One list of filter definitions drives the bar, "More filters", the sheet and every count.

Confirmed summary: the Beads page gets a one-line filter bar where the current milestone and every chosen filter show as removable chips, the rest sit under "More filters", and "Clear filters" returns to the current milestone. All five views follow one click rule and show the same details panel from 1024px, Board and Focus included. In Graph and Lanes, "Show children" in the panel replaces the double click that entered a child's scope. No backend or API change is needed.

Comments considered: 1, latest 2026-11-21T16:00:32Z

## What Changes

- Filter bar: the search box with a `/` key hint, then Milestone, Status and Assignee as buttons or chips, "More filters", "Clear filters" while a filter is active, the count and "Show closed", on one line from 1024px.
- Chips: a chosen filter reads "<name> <values> ×"; the body opens its popover menu and "×" removes it. The Milestone select becomes a popover menu, and the current milestone is a chip.
- More filters: one popover for Priority, Labels, Type, Kind, Capability and Sprint, with the count of its active filters.
- Clear filters: shown only while a filter is active; removes the search and the filters and returns to the current milestone.
- Phone: the search box and "Filters" with the count of active filters; the sheet follows the order of the bar; "Show closed" leaves the sheet and sits with the count on the line under the search box.
- Click rule: one behaviour for a click, a double click, `Enter` and Escape in the List, Board, Focus, Graph and Lanes views, on the Beads page, the milestone page's Beads tab and the epic page's Graph and Lanes tabs.
- Details panel: Board and Focus get the panel of the List; Graph and Lanes lose the panel under the canvas below 1024px; the selected item shows the identity wash and bar.
- Show children: the panel of a bead with children in Graph and Lanes offers it next to "Open page"; a double click opens the bead page instead.
- Frontend: `filterDefs.ts`, `FilterChip.tsx`, `MoreFilters.tsx` and `useChoose.ts` are new; the filter bar, the sheet, the five views, the cards and the details panel change. No backend change.

## User Stories

### US-1: Narrow the Beads list from one line
As a developer, I want the search and every filter I use on one line, with my choices shown as removable chips, so that the list starts high on the page and I see at a glance what narrows it.
REQ: REQ-UI-142, REQ-UI-144, REQ-UI-145, REQ-UI-146, REQ-UI-104, REQ-UI-140, REQ-UI-037

Acceptance criteria:
- At 1440px the search box, the Milestone chip, Status, Assignee, "More filters", the count and "Show closed" are on one line.
- At 1024px everything up to "Clear filters" stays on one line, and a long chip ends with "…" and shows its full text on hover.
- Choosing "open" in the Status menu turns the button into the chip "Status open ×", and its "×" removes the filter.
- Choosing P1 in "More filters" shows the count 1 on the button.
- The search box shows `/` at its right end, and pressing `/` puts the focus in it.

### US-2: Get back to the current milestone in one step
As a team lead, I want "Clear filters" to show only when something is filtered and to bring back the current milestone, so that I never lose the milestone view by clearing.
REQ: REQ-UI-143, REQ-UI-072, REQ-MILESTONE-UI-018

Acceptance criteria:
- With only the current milestone in effect, there is no "Clear filters".
- After "×" on the Milestone chip and a Status filter, "Clear filters" brings back the chip of the current milestone and removes the Status filter.
- "Clear filters" keeps "Show closed", the view and the selection.
- On a milestone page's Beads tab there is no Milestone filter, and "Clear filters" keeps the milestone.

### US-3: Filter on a phone
As a team member on a phone, I want one "Filters" button that counts what is active and opens every filter in a sheet, so that the list stays on screen.
REQ: REQ-UI-084

Acceptance criteria:
- At 390px the bar shows the search box and "Filters", with no chip and no `/` hint.
- The count on "Filters" leaves out the current milestone and counts any other milestone choice.
- The sheet lists Milestone, Status, Assignee, then the filters of "More filters", and ends with "Clear filters" while a filter is active.

### US-4: Select and open a bead the same way in every view
As a developer, I want a click to select a bead and a second action to open it, in every view, so that I do not have to learn five behaviours.
REQ: REQ-UI-147, REQ-UI-046, REQ-UI-037, REQ-UI-051, REQ-UI-106

Acceptance criteria:
- From 1024px a click on a row, card or node selects it and shows the panel; clicking it again keeps it selected.
- Below 1024px a click opens the bead page, and Back returns to the view with the item focused.
- A double click, the title link, or `Enter` on the selected item opens the bead page.
- On a Board card, the arrow keys move between cards and `Enter` selects the focused card.
- The open/close control of a List row only opens or closes its branch.

### US-5: Read a bead beside the Board and Focus
As a team lead, I want the details panel next to the Board and Focus views too, so that I read a bead without leaving the columns.
REQ: REQ-UI-148, REQ-UI-078

Acceptance criteria:
- On the Board at 1440px a selected card shows the panel in a third of the width, and the columns wrap in the rest.
- "Close details" and Escape close the panel and return the focus to the card.
- Switching from the List to Focus keeps the selected bead in the panel, with "Not in the current list" when Focus has no card for it.
- Below 1024px no view shows the panel.

### US-6: Look inside a bead from the Graph or Lanes view
As a team lead, I want "Show children" in the panel of a bead with children, so that I go down a level on purpose and a double click always opens the page.
REQ: REQ-UI-149, REQ-UI-106, REQ-UI-053

Acceptance criteria:
- In the Graph view of a milestone, the panel of an epic with tasks offers "Show children", which draws its tasks and extends the breadcrumb.
- A bead without children, a List, Board or Focus panel, and the tabs of an epic page offer no "Show children".
- A double click on an epic node opens the epic's page without changing the scope.

## Capabilities Affected

- `ui`:
  - ADDED: REQ-UI-142, REQ-UI-143, REQ-UI-144, REQ-UI-145, REQ-UI-146, REQ-UI-147, REQ-UI-148, REQ-UI-149.
  - MODIFIED: REQ-UI-037, REQ-UI-046, REQ-UI-051, REQ-UI-053, REQ-UI-072, REQ-UI-078, REQ-UI-084, REQ-UI-104, REQ-UI-106, REQ-UI-140.
  - Diagrams: new `docs/specs/ui/diagrams/filter-bar-activity.md`, `docs/specs/ui/diagrams/select-and-open-activity.md` `docs/specs/ui/diagrams/browse-milestone-beads-activity.md` and `docs/specs/ui/diagrams/filter-by-milestone-activity.md`; updated `docs/specs/ui/diagrams/details-panel-activity.md` and `docs/specs/ui/diagrams/graph-view-activity.md`.
  - Use cases: new `docs/specs/ui/use-cases/narrow-the-beads-list.md` and `docs/specs/ui/use-cases/select-and-open-a-bead.md`; updated `docs/specs/ui/use-cases/browse-milestone-beads.md` and `docs/specs/ui/use-cases/filter-by-milestone.md` (the chip, its removal, and My Tasks following the switcher since gin-console-k4l).
  - Assets: the confirmed `docs/specs/ui/assets/2026-11-22/` (`index.html#beads`, `beads-light.png`), cited by REQ-UI-142, REQ-UI-144, REQ-UI-145 and REQ-UI-146. No new asset.
- `milestone-ui`:
  - MODIFIED: REQ-MILESTONE-UI-018.
  - Diagrams: updated `docs/specs/milestone-ui/diagrams/milestone-beads-tab-activity.md` (no Milestone filter).

## Assumptions

- The Lanes view, added after the roadmap entry, follows the same click rule and panel as the other views.
- "Show closed" is not a filter: it stays outside "More filters", "Clear filters" leaves it, and no filter count includes it. Below 768px it leaves the sheet and sits with the count on the line under the search box.
- No chips below 768px.
- On a phone the way into a child scope is the bead page: an epic page has Graph and Lanes tabs, and another bead with children offers "View in graph" (REQ-UI-053).
- Board and Focus get a side panel like the Graph view, two thirds and one third.
- The count on "More filters" and "Filters" is the count pill of REQ-UI-140 seen in the asset, not the text "(n)".
- A Graph node or Lanes card is one button with no title link; it opens with a double click or `Enter` on the selected node.
- "Show children" is not offered on the tabs of an epic page, whose scope is fixed; "Open page" leads to the child's page there.
- The breadcrumb's filter count (REQ-UI-072) counts the active filters of REQ-UI-143, like "More filters" and "Filters", so it no longer counts "Show closed" and counts Kind, Capability and a changed Milestone.
- My Tasks keeps its native Milestone select (REQ-UI-105); it shares the grouping of the choices with the new menu.
- The tabs of an epic page keep showing no count "N of M", because the count is of the project's beads.
- The sheet's "Clear all" becomes "Clear filters", and a chip's "×" is labelled "Remove <name> filter".
- "View in graph" (REQ-UI-053) leaves the panel of the Graph and Lanes views, where the bead is already drawn and "Show children" opens its children; the panels of List, Board and Focus and the bead page keep it.
- Only the unknown values the console ignores today stay ignored: `kind`, `label_mode` and a `milestone` that names no milestone. An unknown `status`, `priority`, `type` or `sprint` still matches no bead.

## Non-goals

- Visual tokens (epic gin-console-rm-strung) and the shared navigation (epic gin-console-rm-nav-shell).
- The matching rules of the filters (REQ-UI-025, REQ-UI-043, REQ-UI-082, REQ-UI-083, REQ-UI-085, REQ-UI-108).
- The filters of My Tasks.
- Any backend or API change, and any new URL key.
- The layout of the bead page and of the epic page.

## Success Criteria

- Every scenario of the added and modified REQs has a test that names its REQ.
- `gin specs lint --change gin-console-rm-beads-views --against master` prints `ok`, and `gin specs trace` lists no missing REQ.
- Frontend checks and the full test suites pass.
- TC-1 (05-tests.md) passes on the Tailscale build at 1440, 1024 and 390px in the light and the dark theme.
