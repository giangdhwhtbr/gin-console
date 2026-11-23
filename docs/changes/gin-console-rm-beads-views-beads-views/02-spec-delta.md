# Spec Delta: Beads views

<!-- One block per requirement: "### REQ-<CAP>-<NNN>: <title>", one SHALL/MUST statement,
     and at least one "#### Scenario:" with "- GIVEN", "- WHEN", "- THEN" bullets.
     Get new IDs from `gin specs next-id <cap>`.
     MODIFIED and REMOVED blocks put an HTML comment "base: <hash>" on the line after the heading,
     the living block hash from `gin specs hash <REQ-ID>`; REMOVED blocks add "Reason: <why>".
     A requirement taken from a confirmed input adds "Source:" after its statement, with backticked paths
     relative to the living spec.md, such as `assets/<YYYY-MM-DD>/mockup/index.html#<screen-id>`.
     Preferred sentence patterns (EARS): "WHEN <trigger>, the <system> SHALL <response>",
     "WHILE <state>, ...", "IF <unwanted condition>, THEN ...", "WHERE <feature>, ...".
     A requirement may add, right under its heading, `Type: functional | non-functional | business-rule`
     (default functional). A non-functional one adds `Category:` (performance, security, reliability,
     usability, compatibility, maintainability, portability, constraint) and either a scenario or `Measure:`
     with a measurable target; it needs no activity diagram. A business rule keeps a scenario; use cases
     cite it on `Requirements:`. -->

## ADDED

### REQ-UI-142: One-line filter bar
WHILE the window is 768px wide or more, the bead filter bar of the Beads views SHALL show, in this order, the search box with the key hint of REQ-UI-146 at its right end, the filters Milestone, Status and Assignee as REQ-UI-144 describes, the button "More filters" of REQ-UI-145, "Clear filters" while REQ-UI-143 offers it, then the count "N of M" of REQ-UI-024 and the switch "Show closed" of REQ-UI-026. WHILE the window is 1024px wide or more, the search box, those three filters and "More filters" SHALL stay on one line, the search box narrowing to its minimum width of 8rem and a chip cutting its values short as REQ-UI-107 describes, and "Clear filters", the count and "Show closed" SHALL move together to the line below only when they do not fit; WHILE it is 1440px wide or more and no filter is active (REQ-UI-143), the whole bar SHALL fit on one line. A chip SHALL keep its name and its "×" whole and cut only its values short. WHERE the milestone is fixed, on the Beads tab of a milestone page (REQ-MILESTONE-UI-018) and on the Graph and Lanes tabs of an epic page (REQ-UI-119), the bar SHALL show no Milestone filter, and the tabs of an epic page SHALL show no count. Below 768px the bar SHALL follow REQ-UI-084.
Source: `assets/2026-11-22/index.html#beads`, `assets/2026-11-22/beads-light.png`

#### Scenario: Order on a wide window
- GIVEN the Beads page of `example` at 1440px, whose current milestone `ex-m2` is titled "Checkout v2", with no other filter
- WHEN it is shown
- THEN one line holds the search box with the hint "/", the chip "Milestone Checkout v2 ×", the buttons "Status", "Assignee" and "More filters", the count "<shown> of <loaded>" and the switch "Show closed", in that order, and there is no "Clear filters"

#### Scenario: One line at 1024px
- GIVEN the Beads page at 1024px with the current milestone "Checkout v2" in effect and `status=open,in_progress&assignee=alice&priority=1`
- WHEN it is shown
- THEN the search box, at least 8rem wide, the chips Milestone, Status and Assignee and "More filters" share one line, "Clear filters", the count and "Show closed" are on the line below, a chip whose values do not fit ends with "…" and has its full text as `title` while its name and "×" stay whole, and no text overlaps another

#### Scenario: Fixed milestone
- GIVEN the Beads tab of milestone `m2` at 1440px
- WHEN it is shown
- THEN the bar has no Milestone filter and starts with the search box, "Status", "Assignee" and "More filters"

#### Scenario: Tab of an epic page
- GIVEN the Graph tab of epic `ex-e12` at 1440px
- WHEN it is shown
- THEN the bar shows the search box, "Status", "Assignee", "More filters" and "Show closed", with no Milestone filter and no count

### REQ-UI-143: Active filters and Clear filters
A filter of the bead filter bar SHALL be active WHILE its value differs from its default: the search WHILE it holds a character other than a space; Status, Assignee, Priority, Labels and Capability WHILE a value is chosen, the Any/All mode of Labels not counting on its own; Type, Kind and Sprint WHILE a choice other than "All" is made; and Milestone WHILE the milestone in effect (REQ-UI-104) differs from the one in effect when the URL has no `milestone`. "Show closed" SHALL NOT be a filter. WHILE a filter is active, the bead filter bar and its sheet (REQ-UI-084) SHALL offer "Clear filters", and SHALL NOT offer it otherwise. WHEN the user chooses "Clear filters", the page SHALL remove `q`, `status`, `priority`, `label`, `label_mode`, `type`, `kind`, `capability`, `assignee`, `sprint` and `milestone` from the URL, so that the current milestone is in effect again, and SHALL keep `project`, `closed`, `view`, `group`, `finished`, `select` and `scope`. WHERE the milestone is fixed (REQ-UI-142), Milestone SHALL never be active and "Clear filters" SHALL leave the milestone as it is. IF the URL holds a `kind` or `label_mode` value the console does not know, THEN the page SHALL ignore it.

#### Scenario: Nothing to clear
- GIVEN the Beads page of a project whose current milestone is `m2`, with no `milestone` and no other filter in the URL
- WHEN it is shown at 1440px
- THEN there is no "Clear filters"

#### Scenario: A search is a filter
- GIVEN the same page
- WHEN the user types "pay" into the search box
- THEN "Clear filters" is offered

#### Scenario: Back to the current milestone
- GIVEN the Beads page at `?project=example&milestone=all&q=pay&status=open&priority=1&label=ui&label_mode=all&closed=1&view=board&select=ex-e3`, whose current milestone `ex-m2` is titled "Checkout v2"
- WHEN the user chooses "Clear filters"
- THEN the URL is `?project=example&closed=1&view=board&select=ex-e3`, the chip "Milestone Checkout v2 ×" is shown and "Clear filters" is gone

#### Scenario: Current milestone named in the URL
- GIVEN the Beads page at `?project=example&milestone=ex-m2`, where `ex-m2` is the current milestone
- WHEN it is shown
- THEN no filter is active and there is no "Clear filters"

#### Scenario: Fixed milestone
- GIVEN the Beads tab of milestone `m2` of project `p` with `status=open`
- WHEN the user chooses "Clear filters"
- THEN the URL is `/milestones/p/m2?tab=beads` and the beads of `m2` are shown

#### Scenario: Unknown values
- GIVEN the Beads page at `?project=example&kind=epicish&label_mode=some` with the current milestone in effect
- WHEN it is shown
- THEN no Kind filter is active, Labels match Any, "More filters" shows no count and there is no "Clear filters"

### REQ-UI-144: Filter chips
WHILE the window is 768px wide or more, each of the filters Milestone, Status and Assignee of the bead filter bar SHALL be a button with its name WHILE it has no value, and a chip in the identity style (REQ-UI-141) that reads "<name> <values> ×" WHILE it has one, its values named as its menu names them and joined by ", ". A click on the button or on the body of the chip SHALL open the filter's menu, a popover with the choices of that filter, where the user changes its value; the "×" SHALL be a button labelled "Remove <name> filter" that removes the value of that filter only. The Milestone filter SHALL show the milestone in effect (REQ-UI-104), the current milestone included, as the chip "Milestone <title> ×", and "No milestone" as "Milestone No milestone ×"; its "×" SHALL set `milestone=all`, after which the filter is the button "Milestone"; and its menu SHALL list the choices of REQ-UI-104 in their groups.
Source: `assets/2026-11-22/index.html#beads`, `assets/2026-11-22/beads-light.png`

#### Scenario: Button without a value
- GIVEN the Beads page at 1440px without `status`
- WHEN it is shown
- THEN Status is a button "Status" with no "×"

#### Scenario: Chip with values
- GIVEN the Beads page at 1440px with `status=open,in_progress`
- WHEN the user clicks the body of the Status chip
- THEN the chip reads "Status open, in_progress ×" in the identity style, and its menu opens with "open" and "in_progress" chosen

#### Scenario: Remove one filter
- GIVEN the Beads page with `status=open&assignee=alice`
- WHEN the user chooses the "×" labelled "Remove Status filter"
- THEN the URL has no `status` and still has `assignee=alice`, and Status is the button "Status"

#### Scenario: Current milestone as a chip
- GIVEN a project whose current milestone `ex-m2` is titled "Checkout v2", and no `milestone` in the URL
- WHEN the Beads page is shown and the user chooses the "×" of the Milestone chip
- THEN the chip read "Milestone Checkout v2 ×", and now the URL has `milestone=all`, the filter is the button "Milestone" and every bead is shown

#### Scenario: Milestone menu
- GIVEN the Beads page at 1440px with the Milestone chip "Milestone Checkout v2 ×"
- WHEN the user clicks the body of the chip and chooses `ex-m3`, titled "Payments"
- THEN the menu listed "All", "No milestone", then the groups Active, Planned and Closed, and the URL has `milestone=ex-m3` and the chip reads "Milestone Payments ×"

### REQ-UI-145: More filters
WHILE the window is 768px wide or more, the bead filter bar SHALL offer a button "More filters" that opens a popover holding, in this order, Priority, Labels with its Any/All mode (REQ-UI-085), Type, Kind (REQ-UI-108), Capability (REQ-UI-108) only while a loaded bead has a capability, and Sprint (REQ-UI-083) only while a loaded bead or its parent has a `sprint:<name>` label, each with the choices and URL keys of its requirement; the button SHALL show the number of active filters (REQ-UI-143) in the popover as a count pill (REQ-UI-140), and no count while there is none.
Source: `assets/2026-11-22/index.html#beads`, `assets/2026-11-22/beads-light.png`

#### Scenario: Contents
- GIVEN a project whose beads have capabilities and `sprint:<name>` labels
- WHEN the user opens "More filters" at 1440px
- THEN the popover holds Priority, Labels, Type, Kind, Capability and Sprint in that order

#### Scenario: No capability and no sprint
- GIVEN a project whose beads have no capability and no `sprint:<name>` label
- WHEN the user opens "More filters"
- THEN the popover holds Priority, Labels, Type and Kind

#### Scenario: Count of active filters inside
- GIVEN the Beads page with `priority=1&label=ui&label_mode=all&kind=technical&status=open`
- WHEN it is shown at 1440px
- THEN "More filters" shows the count 3

#### Scenario: No count
- GIVEN the Beads page with `label_mode=all` and no other filter in the popover
- WHEN it is shown at 1440px
- THEN "More filters" shows no count

### REQ-UI-146: Search key hint
WHILE the window is 768px wide or more, the search box of the bead filter bar SHALL show at its right end the key `/` in a `kbd` element, as the hint that `/` moves the focus to the search box (REQ-UI-037), the text typed into the box ending before the hint, and SHALL NOT show the hint below 768px.
Source: `assets/2026-11-22/index.html#beads`, `assets/2026-11-22/beads-light.png`

#### Scenario: Hint and shortcut
- GIVEN the Beads page at 1440px with the focus on a List row
- WHEN the user presses `/`
- THEN the search box showed `/` in a `kbd` element at its right end, and now the search box has the focus and holds no `/`

#### Scenario: No hint on a phone
- GIVEN the Beads page at 390px
- WHEN it is shown
- THEN the search box has no `kbd` hint

### REQ-UI-147: One click rule in the Beads views
In the List, Board, Focus, Graph and Lanes views, on the Beads page, on the Beads tab of a milestone page and on the Graph and Lanes tabs of an epic page, the frontend SHALL treat a row, card or node alike: WHILE the window is 1024px wide or more, a click on the item SHALL select it, keeping its id in the URL as `select` without adding a history entry, and show its details panel (REQ-UI-148), and a click on the selected item SHALL keep it selected; WHILE the window is narrower than 1024px, a click on the item SHALL open its bead page, remembering the place for the Back button (REQ-UI-127); a click on the title link of a row or card SHALL open the bead page at every width; a double click on the item outside its controls SHALL open the bead page; and a click on the open/close control of a row, or on another control inside an item, SHALL do only that control's action. WHEN the user presses `Enter` on a focused item, the frontend SHALL select the item WHILE it is not selected and the window is 1024px wide or more, and SHALL open its bead page otherwise. WHEN the user presses Escape while an item is selected and focus is not in a text field, the frontend SHALL clear the selection as REQ-UI-148 describes and move focus to that item.

#### Scenario: Select a card
- GIVEN the Board in a window 1280px wide
- WHEN the user clicks the card of `t-1` outside its title
- THEN the URL has `select=t-1`, the card has the identity wash and bar, and the details panel shows `t-1`

#### Scenario: Click the selected item
- GIVEN `t-1` is selected on the Board in a window 1280px wide
- WHEN the user clicks its card again
- THEN `t-1` stays selected and the panel still shows it

#### Scenario: Phone
- GIVEN the Focus view in a window 390px wide
- WHEN the user taps the card of `t-1`
- THEN the bead page of `t-1` is shown, and the browser Back button returns to the Focus view with the card of `t-1` focused

#### Scenario: Title link
- GIVEN the List view in a window 1280px wide
- WHEN the user clicks the title link of `t-1`
- THEN the bead page of `t-1` is shown

#### Scenario: Double click
- GIVEN the Graph view of milestone `m2` in a window 1440px wide, with epic `e1` that has tasks
- WHEN the user double-clicks the node of `e1`
- THEN the bead page of `e1` is shown

#### Scenario: Enter twice
- GIVEN the List view in a window 1280px wide with the focus on the row of `t-2`, which is not selected
- WHEN the user presses `Enter`, then `Enter` again
- THEN the first `Enter` selects `t-2` and shows its panel, and the second opens the bead page of `t-2`

#### Scenario: Enter on a phone
- GIVEN the Board in a window 390px wide with the focus on the card of `t-1`
- WHEN the user presses `Enter`
- THEN the bead page of `t-1` is shown

#### Scenario: Open/close control
- GIVEN the List view in a window 1280px wide with the epic `e-1` closed and nothing selected
- WHEN the user clicks the open/close control of `e-1`
- THEN the branch opens and the URL has no `select`

#### Scenario: Escape
- GIVEN `t-1` is selected on the Board in a window 1280px wide and its card has the focus
- WHEN the user presses Escape
- THEN the URL has no `select`, the panel is gone and the card of `t-1` has the focus

#### Scenario: Tab of an epic page
- GIVEN the Lanes tab of epic `ex-e12` in a window 1440px wide
- WHEN the user clicks the card of `ex-e12.2`, then double-clicks it
- THEN the click puts `select=ex-e12.2` in the URL and shows its panel, and the double click opens the bead page of `ex-e12.2`

### REQ-UI-148: Details panel in every Beads view
WHILE the window is 1024px wide or more and `select` names a bead, the List, Board, Focus, Graph and Lanes views SHALL show the details panel of REQ-UI-045 (the embedded bead page with "Open page" and "Close details" and without the breadcrumb) as a column beside the view that stays in view and scrolls on its own (REQ-UI-078): the List view takes three fifths of the width and the panel two fifths, and the Graph, Lanes, Board and Focus views take two thirds and the panel one third, the columns of the Board and Focus views wrapping in the width left. WHILE the window is narrower than 1024px, no view SHALL show the panel. "Close details" and Escape SHALL clear the selection, removing `select` in the List, Board and Focus views and setting `select=none` in the Graph and Lanes views (REQ-UI-051), and SHALL move focus to the item that was selected. The frontend SHALL keep `select` when the user changes view, `select=none` becoming no `select`, and WHILE the selected bead is not drawn in the current view, the panel SHALL show it with the note "Not in the current list". The selected row, card or node SHALL show the identity wash and bar of REQ-UI-141. IF the bead cannot be loaded, THEN the panel SHALL show the error of REQ-UI-029 inside itself and the view SHALL stay as it is.

#### Scenario: Board with a panel
- GIVEN the Board in a window 1440px wide with `select=t-1`
- WHEN it is shown
- THEN the panel shows `t-1` with "Open page" and "Close details" and no breadcrumb in a column a third of the width, and the Board columns wrap in the other two thirds

#### Scenario: Close on the Focus view
- GIVEN `t-1` is selected on the Focus view in a window 1280px wide
- WHEN the user chooses "Close details"
- THEN the URL has no `select`, the panel is gone, the columns take the full width and the card of `t-1` has the focus

#### Scenario: No panel under 1024px
- GIVEN the Graph view in a window 800px wide with `select=b`
- WHEN it is shown
- THEN no details panel is shown

#### Scenario: Selection kept across views
- GIVEN the List view in a window 1280px wide with `select=x-1`, a ready P3 bead that no Focus column holds
- WHEN the user chooses Focus
- THEN the URL still has `select=x-1` and the panel shows `x-1` with the note "Not in the current list"

#### Scenario: Selected node
- GIVEN the Graph view in a window 1440px wide with `select=b`
- WHEN it is shown
- THEN the node of `b` has the identity wash and a 3px identity bar inside its left edge

#### Scenario: Bead fails to load
- GIVEN `select=t-1` on the Board in a window 1280px wide, and the request for `t-1` fails
- WHEN the Board is shown
- THEN the panel shows the error and a retry button, and the Board columns are still shown

### REQ-UI-149: Show children
WHEN the details panel of the Graph or Lanes view, on the Beads page or on the Beads tab of a milestone page, shows a bead with at least one loaded child, the panel SHALL offer the button "Show children" next to "Open page", which SHALL set `scope` to that bead's id and remove `select`, the breadcrumb of REQ-UI-106 then ending at that bead. The panel SHALL NOT offer "Show children" for a bead without children, in the List, Board and Focus views, or on the Graph and Lanes tabs of an epic page, whose scope is fixed (REQ-UI-119). A double click on a node SHALL NOT change the scope (REQ-UI-147).

#### Scenario: Show children
- GIVEN the Graph view of milestone `m2` in a window 1440px wide with `select=e1`, an epic with tasks
- WHEN the user chooses "Show children" in the panel
- THEN the URL has `scope=e1` and no `select`, the tasks of `e1` are drawn, no panel is shown and the breadcrumb reads `m2` › `e1`

#### Scenario: Bead without children
- GIVEN the Graph view with the scope `e1` and its task `e1.1`, which has no child, selected
- WHEN the panel is shown
- THEN it offers "Open page" and no "Show children"

#### Scenario: Not in the List
- GIVEN the List view in a window 1280px wide with `select=e1`
- WHEN the panel is shown
- THEN it offers no "Show children"

#### Scenario: Tab of an epic page
- GIVEN the Graph tab of epic `ex-e12` in a window 1440px wide with the track `ex-e12.3` selected, which has a child
- WHEN the panel is shown
- THEN it offers "Open page" and no "Show children"

#### Scenario: Going down on a phone
- GIVEN the Graph view of milestone `m2` in a window 390px wide
- WHEN the user taps the node of epic `e1`
- THEN the page of `e1` is shown, and its Graph tab draws the tasks of `e1`

## MODIFIED

### REQ-UI-037: Keyboard
<!-- base: f73d62342313fe9dcacf3dc3a2dd8bbeed7024b36c2b27c7424eb994808da3e5 -->
WHILE a Beads view is shown and no text field has focus, `/` SHALL move focus to the search box (REQ-UI-146); WHILE the Board or Focus view is shown and no text field has focus, the arrow keys SHALL move focus between the cards, each card itself taking the focus, and `Enter` on the focused card SHALL select it or open its bead page as REQ-UI-147 describes; WHILE the search box has focus, `Esc` SHALL clear it when it has text and otherwise leave it.

#### Scenario: Search shortcut
- GIVEN the Board is shown and no field has focus
- WHEN the user presses `/`
- THEN the search box has focus and the key is not typed into it

#### Scenario: Search shortcut in the List
- GIVEN the List view is shown and a row has focus
- WHEN the user presses `/`
- THEN the search box has focus and the key is not typed into it

#### Scenario: Move, select and open
- GIVEN the Board in a window 1280px wide with several cards and none selected
- WHEN the user presses the arrow keys, then `Enter`, then `Enter` again
- THEN focus moves from card to card, each card itself taking the focus, the first `Enter` selects the focused card and shows its details panel, and the second opens its bead page

#### Scenario: Escape
- GIVEN the search box has focus and text
- WHEN the user presses `Esc`
- THEN the text is cleared, and a second `Esc` leaves the box

### REQ-UI-046: List keyboard and roles
<!-- base: 15de9153d8995b9788481d77369c6cf5881714b7e7a49dbe9cb19ceb03ffaeaf -->
The List view SHALL expose the hierarchy with `role="tree"` and each row with `role="treeitem"`, `aria-level`, `aria-selected` and, when it has children, `aria-expanded`, and WHILE a row has focus the Up and Down arrows SHALL move focus to the previous and next shown row, Right SHALL open a closed branch and otherwise move to its first child, Left SHALL close an open branch and otherwise move to its parent, and `Enter` SHALL select the row or open its bead page as REQ-UI-147 describes.

#### Scenario: Roles
- GIVEN the List view with an open epic
- WHEN it is shown
- THEN there is a tree, the epic is a treeitem with `aria-expanded` true and its children have a greater `aria-level`

#### Scenario: Move
- GIVEN focus is on the first row
- WHEN the user presses Down, then Up
- THEN focus moves to the next shown row, then back

#### Scenario: Open and close
- GIVEN focus is on a closed epic
- WHEN the user presses Right, then Left
- THEN the branch opens and focus moves to its first child on a second Right, and Left closes it or moves to the parent

#### Scenario: Select with Enter
- GIVEN a window 1280px wide and focus on a row that is not selected
- WHEN the user presses `Enter`
- THEN the row is selected and the details panel shows it

#### Scenario: Open with Enter
- GIVEN a window 1280px wide and the row of `t-1` selected and focused
- WHEN the user presses `Enter`
- THEN the bead page of `t-1` is shown

#### Scenario: Enter on a phone
- GIVEN a window 390px wide and focus on the row of `t-1`
- WHEN the user presses `Enter`
- THEN the bead page of `t-1` is shown

### REQ-UI-051: Selection and path
<!-- base: 7122e048740adb75495136ccea9c3a0a702d4e46f32a35e379e9e9b265ffe820 -->
WHEN the Graph view (REQ-UI-106) opens with no `select` in the URL, it SHALL select nothing, whatever its scope, SHALL show the panel only while a bead is selected and the window is 1024px wide or more (REQ-UI-148), the graph then taking the full width, SHALL offer in the panel a button "Close details" that selects nothing, kept in the URL as `select=none` so that a reload keeps the panel closed, and after closing SHALL move focus to the node that was selected. WHEN the user selects a node as REQ-UI-147 describes, the view SHALL keep its id in the URL as `select` without adding a history entry, and WHILE `select` names a drawn node, the view SHALL highlight that node, all its direct and indirect blockers, all beads it blocks directly or indirectly and the arrows between them, dim every other node and arrow, and show the bead in the panel beside the graph (REQ-UI-148) with the content of the bead page and an "Open page" link as REQ-UI-045 describes.

#### Scenario: Project scope
- GIVEN the Graph view of the project in a window 1280px wide
- WHEN it is shown
- THEN no node is selected, there is no details panel and the graph takes the full width

#### Scenario: Selected at first
- GIVEN the Graph view with the scope `e-1` and `b` a child of `e-1`, and the URL has `select=b`
- WHEN it is shown
- THEN `b` is selected, its chain is highlighted and the panel shows `b`

#### Scenario: Epic
- GIVEN the Graph view with the scope `e-1` and no `select`
- WHEN it is shown
- THEN no node is selected, there is no details panel and the graph takes the full width

#### Scenario: Highlight chain
- GIVEN `a`→`b`→`c` and an unrelated `z`
- WHEN the user selects `b`
- THEN `a`, `b`, `c` and their arrows are highlighted, `z` is dimmed and the panel shows `b`

#### Scenario: No new history entry
- GIVEN the user selects a node
- WHEN the user presses the browser's back button
- THEN the previous page is shown, not the previous selection

#### Scenario: Restored
- GIVEN the URL has `select=b`
- WHEN the page loads
- THEN `b` is selected and its chain is highlighted

#### Scenario: Narrow window
- GIVEN the URL has `select=b` and a window 800px wide
- WHEN the Graph view is shown
- THEN `b` and its chain are highlighted and there is no details panel

#### Scenario: Close the panel
- GIVEN the Graph view with the scope `e-1` and its child `b` selected
- WHEN the user chooses "Close details"
- THEN the URL has `select=none`, the panel is gone, the graph takes the full width, and a reload keeps it so

### REQ-UI-053: View in graph button
<!-- base: b16b5ec1634f6dfaa448ec957b47fea05aa6926939f138a85992df63bcb19e07 -->
WHEN a bead page or a details panel shows a bead that is not an epic and has at least one child, a blocker, or a bead it blocks, it SHALL offer the primary button "View in graph" that goes, inside the console, to the Graph view of the Beads page at `/beads?project=<project>&view=graph&scope=<id>` when the bead has children, else at `/beads?project=<project>&view=graph&scope=<parent>&select=<id>` (without `scope` when the bead has no parent), and SHALL not offer it otherwise; the page of an epic SHALL offer its Graph tab (REQ-UI-119) instead of the button, and the details panel of the Graph and Lanes views SHALL NOT offer it, since the bead is already drawn there and "Show children" (REQ-UI-149) opens its children.

#### Scenario: Task with children
- GIVEN the bead page of task `t-1`, not an epic, with a child, in project `p`
- WHEN the page loads
- THEN "View in graph" links to `/beads?project=p&view=graph&scope=t-1`

#### Scenario: Task with a blocker
- GIVEN task `t-2` of epic `e-1` with one blocker, in project `p`
- WHEN its page loads
- THEN "View in graph" links to `/beads?project=p&view=graph&scope=e-1&select=t-2`

#### Scenario: Task with a blocker and no parent
- GIVEN task `t-3` without a parent and with one blocker, in project `p`
- WHEN its page loads
- THEN "View in graph" links to `/beads?project=p&view=graph&select=t-3`

#### Scenario: Epic
- GIVEN the bead page of epic `e-1` with children
- WHEN the page loads
- THEN there is no "View in graph" and the Graph tab is offered

#### Scenario: Nothing to draw
- GIVEN a task without blockers that blocks nothing and has no child
- WHEN its page loads
- THEN there is no "View in graph"

#### Scenario: Details panel
- GIVEN a task with a blocker shown in the details panel of the List view
- WHEN the panel is shown
- THEN it offers "View in graph"

#### Scenario: Graph view panel
- GIVEN the Graph view in a window 1440px wide with `select=t-1`, a task with a child
- WHEN the panel is shown
- THEN it offers "Show children" and no "View in graph"

### REQ-UI-072: Breadcrumb
<!-- base: 6a1a0b989ed433141c72abbacb1c5059dc40b819bd9e3e76f922464092d1c3af -->
WHEN a bead is shown as a page, not as the details panel of another view, the bead page SHALL show a navigation labelled "Breadcrumb" with an ordered list of: one link to the remembered place (REQ-UI-073) named for it, which is "Beads" followed by the name of its view and, when a filter is active (REQ-UI-143), ", N filters" where N counts the active filters, the title of the milestone with the same view and filter count for the Beads tab of a milestone page, the title of the milestone for its other tabs, or "My Tasks" or "Reports"; then the title of the bead's parent as a link to its page when it has one; then the title of the bead marked `aria-current="page"`. Each title SHALL be cut short to one line with the full title and the id as its `title`. Under 640px the breadcrumb SHALL show only the first link.

#### Scenario: Place and filters
- GIVEN the Beads page was last at `?project=a&view=board&status=open&q=fix`
- WHEN the bead page of `a-1` titled "Fix login" is shown
- THEN the breadcrumb reads "Beads › Board, 2 filters" then "Fix login", and the first link goes to `/beads?project=a&view=board&status=open&q=fix`

#### Scenario: Parent
- GIVEN the bead `a-2` has the parent `a-1` titled "Checkout"
- WHEN the bead page of `a-2` is shown
- THEN the breadcrumb has a link "Checkout" to `/beads/a/a-1` before the title of `a-2`

#### Scenario: No remembered place
- GIVEN no page was remembered in this tab
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads" then the title of `a-1`, and "Beads" goes to `/beads?project=a`

#### Scenario: Details panel
- GIVEN a bead shown in the details panel of the List view
- WHEN the panel is shown
- THEN it has no breadcrumb and keeps its "Open page" link

#### Scenario: From a milestone page
- GIVEN the Beads tab of milestone `m2` titled "Checkout v2" of project `a` was last at `?tab=beads&view=board&status=open`
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Checkout v2 › Board, 1 filter" then the title of `a-1`, and the first link goes to `/milestones/a/m2?tab=beads&view=board&status=open`

#### Scenario: From My Tasks
- GIVEN the My Tasks page was last at `/my-tasks?project=a`
- WHEN the user opens `a-1` from it
- THEN the breadcrumb reads "My Tasks" then the title of `a-1`, and "My Tasks" goes to `/my-tasks?project=a`

#### Scenario: Show closed and the milestone
- GIVEN the Beads page was last at `?project=a&view=list&closed=1&milestone=all&kind=technical`, and `a` has a current milestone
- WHEN the bead page of `a-1` is shown
- THEN the breadcrumb reads "Beads › List, 2 filters" then the title of `a-1`

### REQ-UI-078: Side panels scroll on their own
<!-- base: ea323dfbdcf28d425d84e34c53b2b2c95fefc28b5f7e28e4ddd6d9d4670244ca -->
WHILE the window is 1024px wide or more, the details panel of every Beads view (REQ-UI-148) and the discussion column of a bead page SHALL stay in view while the page scrolls, SHALL be no taller than the window less 3rem, SHALL scroll inside themselves when their content is taller, SHALL not pass the scroll on to the page when they reach their end, and SHALL be reachable with the keyboard with a name that says what they hold.

#### Scenario: Long bead in a panel
- GIVEN a bead whose content is taller than the window shown in the List view's panel
- WHEN the user scrolls inside the panel
- THEN the panel scrolls and the page does not

#### Scenario: Panel stays in view
- GIVEN a long list and a selected bead
- WHEN the user scrolls the page
- THEN the panel stays in view

#### Scenario: Board panel stays in view
- GIVEN a Board taller than the window and a selected bead, in a window 1440px wide
- WHEN the user scrolls the page
- THEN the panel stays in view

#### Scenario: Keyboard
- GIVEN a panel with content taller than the window
- WHEN the user presses Tab
- THEN the panel can take focus and the arrow keys scroll it

### REQ-UI-084: Responsive filter popovers and mobile sheet
<!-- base: 38bba8b3917c88e2908e2b23ae7c8a1bc380c857cb876372aa90ab4270fcaca0 -->
WHILE the window is 768px wide or more, the bead filter bar SHALL show its filters as REQ-UI-142 describes. WHILE it is narrower than 768px, the bar SHALL show the search box without the key hint of REQ-UI-146 and a button "Filters" in place of the filters, chips, "More filters" and "Clear filters", with the count "N of M" and the switch "Show closed" on the line below; the button SHALL show the number of active filters (REQ-UI-143) as a count pill, and none while no filter is active, and SHALL open a bottom sheet that lists Milestone (unless the milestone is fixed, REQ-UI-142), Status and Assignee, then the filters of "More filters" in their order (REQ-UI-145), and ends with "Clear filters" while a filter is active.

#### Scenario: Phone bar
- GIVEN the Beads page at 390px with the current milestone in effect and `status=open`
- WHEN it is shown
- THEN it shows the search box without a `/` hint and a button "Filters" with the count 1, no chip and no "More filters", and the count of beads and "Show closed" on the line below

#### Scenario: Milestone counted only when changed
- GIVEN the Beads page at 390px of a project with a current milestone, with `milestone=all&priority=1`
- WHEN it is shown
- THEN the button "Filters" shows the count 2

#### Scenario: Sheet
- GIVEN the Beads page at 390px of a project whose beads have capabilities and `sprint:<name>` labels, with `status=open`
- WHEN the user opens "Filters"
- THEN the sheet lists Milestone, Status, Assignee, Priority, Labels, Type, Kind, Capability and Sprint in that order, without "Show closed", and ends with "Clear filters"

#### Scenario: Wide window
- GIVEN a window 1024px wide
- WHEN the filter bar is shown
- THEN there is no "Filters" button and the bar is the one of REQ-UI-142

### REQ-UI-104: Beads milestone filter
<!-- base: 9ce338fe4c8b4e02f98c435c48af5fb262b0682042163fc193b742a7a28bf3e6 -->
WHEN the Beads page loads a project, the frontend SHALL request `GET /api/beads/milestones?project=<name>` and SHALL offer a "Milestone" filter in the bead filter bar (REQ-UI-144) and in its sheet (REQ-UI-084), whose menu lists "All", "No milestone", then the milestones grouped as Active (`active`), Planned (`scheduled` and `planned`, by `start`) and Closed (latest `end` first), kept in the URL as `milestone` (`all`, `none` or a milestone id). WHEN the URL has no `milestone`, the filter SHALL be the `current` milestone, or "All" when `current` is `null`, and a `milestone` that names no milestone of the project SHALL count as "All". WHILE a milestone is selected, only the beads whose `milestone` is that id SHALL match; WHILE "No milestone" is selected, only the beads whose `milestone` is `null` SHALL match. WHILE a closed milestone is selected, closed beads SHALL be fetched and shown without "Show closed". The filter SHALL apply to the List, Board, Focus and Graph views. WHILE the milestones request has not answered, the filter SHALL read "Milestone…", and IF it fails, THEN the filter's menu SHALL say "Milestones unavailable" and the page SHALL behave as with "All".

#### Scenario: Default to the current milestone
- GIVEN project `alpha` whose current milestone is `m2`, with beads under `m2` and `m3` and a bead under no milestone
- WHEN the user opens `/beads?project=alpha`
- THEN only the beads under `m2` are shown and the Milestone chip shows the title of `m2`

#### Scenario: All and No milestone
- GIVEN the same project
- WHEN the user chooses "All" and then "No milestone"
- THEN every bead is shown with `milestone=all` in the URL, then only the bead under no milestone with `milestone=none`

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed, and "Show closed" off
- WHEN the user chooses `m1`
- THEN the beads are requested with `closed=1` and the closed beads of `m1` are shown

#### Scenario: No current milestone
- GIVEN a project whose milestones are all closed
- WHEN the user opens its Beads page without `milestone`
- THEN "All" is in effect, the filter is the button "Milestone" and every open bead is shown

#### Scenario: Unknown milestone
- GIVEN the URL has `milestone=zz`, which names no milestone of the project
- WHEN the Beads page loads
- THEN every bead is shown and the filter is the button "Milestone"

#### Scenario: Milestones loading
- GIVEN `GET /api/beads/milestones` has not answered yet
- WHEN the Beads page is shown at 1440px
- THEN the Milestone filter reads "Milestone…"

#### Scenario: Milestones unavailable
- GIVEN `GET /api/beads/milestones` answers 502
- WHEN the Beads page loads and the user opens the Milestone menu
- THEN the menu says "Milestones unavailable" and every bead is shown

### REQ-UI-106: Graph view
<!-- base: aef48e9bc614c8e317a61872a3ba3186be3f562b8c1630df960320d04a553f8f -->
The Beads views SHALL offer the view Graph (`view=graph`), which SHALL draw, with the nodes, arrows, outside beads and cycle warning of REQ-UI-048 to REQ-UI-050 and REQ-UI-079, the direct children of its scope: the bead named by `scope` in the URL when it exists and has children, else the selected milestone, else the project (REQ-MILESTONE-UI-006) when "All" or "No milestone" is selected. The Graph view SHALL also serve the Graph tab of an epic page (REQ-UI-119), with the epic as its scope. It SHALL draw a node only when the node's bead or one of its descendants matches the search, the filters and "Show closed", and only the arrows between drawn nodes. It SHALL offer the switch "Only linked" of REQ-UI-081, on at first when the scope is the project and off otherwise. A node SHALL be selected and opened as REQ-UI-147 describes, opening a node with or without children opening its bead page. WHEN a node is selected, the view SHALL keep it as `select` and show its details panel as REQ-UI-148 describes, SHALL select nothing and show no details panel while `select` is absent, whatever the scope, so that the panel opens only when the user selects a node, and SHALL show and close the panel as REQ-UI-051 and REQ-UI-052 describe. The view SHALL show a breadcrumb from the milestone or project down to the scope, each item a link that sets `scope` to it, and SHALL set `scope` to a bead with children when the user chooses "Show children" in its details panel (REQ-UI-149). WHILE nothing matches, the view SHALL say "No beads match these filters".

#### Scenario: Milestone scope
- GIVEN milestone `m2` with epics `e1` and `e2`, `e2` blocked by `x` under milestone `m3`
- WHEN the Beads page shows `milestone=m2&view=graph`
- THEN `e1` and `e2` are drawn, `x` is drawn as an outside bead with an arrow to `e2`

#### Scenario: Project scope
- GIVEN milestone "All" is selected
- WHEN the Graph view is shown
- THEN the beads of the project without a parent are drawn, epics under a milestone included, and "Only linked" is on

#### Scenario: Filters apply to the nodes
- GIVEN epic `e1` with a task assigned to `bao` and epic `e2` with no bead assigned to `bao`
- WHEN the assignee filter is `bao`
- THEN `e1` is drawn and `e2` is not

#### Scenario: Shared with the other views
- GIVEN the List view with the search "pay"
- WHEN the user chooses Graph
- THEN the search "pay" still applies and no new request is made

#### Scenario: Show children and back
- GIVEN the Graph view of milestone `m2` in a window 1440px wide with epic `e1`, which has tasks, selected
- WHEN the user chooses "Show children" in the panel
- THEN the URL has `scope=e1`, the tasks of `e1` are drawn, and the breadcrumb `m2` › `e1` returns to the epics of `m2` when `m2` is chosen

#### Scenario: Open a node with children
- GIVEN the Graph view of milestone `m2` with epic `e1`, which has tasks
- WHEN the user double-clicks the node of `e1`
- THEN the bead page of `e1` is shown and the scope of the Graph view was not changed

#### Scenario: Open a leaf
- GIVEN the tasks of `e1` are drawn
- WHEN the user double-clicks task `e1.1`, which has no children
- THEN the bead page of `e1.1` is shown

#### Scenario: Details panel
- GIVEN the Graph view in a window 1280px wide
- WHEN the user selects `e1`
- THEN the URL has `select=e1` and the details panel shows `e1`

#### Scenario: Graph tab of an epic
- GIVEN the page of epic `e-1` at `/beads/p/e-1?tab=graph`
- WHEN it is shown
- THEN the Graph view is drawn with `e-1` as its scope, the tasks of `e-1` are the nodes, no node is selected and no details panel is shown

#### Scenario: Nothing matches
- GIVEN a search that matches no bead
- WHEN the Graph view is shown
- THEN it says "No beads match these filters"

#### Scenario: No panel on the project scope
- GIVEN milestone "All" is selected and the URL has no `select`, in a window 1280px wide
- WHEN the Graph view is shown
- THEN there is no details panel and the graph takes the full width

#### Scenario: No panel on opening an epic
- GIVEN the URL `/beads?project=example&milestone=all&view=graph&scope=ex-e12` without `select`, in a window 1440px wide
- WHEN the page loads
- THEN no node is selected, no details panel is shown and the canvas spans the width of the page; WHEN the user clicks the card of `ex-e12.2`, THEN the URL has `select=ex-e12.2` and the details panel shows it

### REQ-UI-140: Data as text
<!-- base: aa5bbea9407dd661e4131fb3f7b6d07e5f5a1a77cf2fa2375784d096637b2865 -->
Pills and chips SHALL be used only for controls (a filter chip, a toggle, a segmented control); on a List or Tree row, a Board or Focus card, a Graph node, a Gantt row, a table row and the line of facts of the bead page, the frontend SHALL show data as text without a border or a tint: the priority as `P<n>`, bold in the text colour for P0 and P1 and in the muted colour otherwise; the type as REQ-UI-067 describes; the kind, size, labels, capabilities and Prep, and a status or an "On time" figure, as plain words in the muted colour, or in the warning colour where a requirement gives them that colour; the comment and dependency indicators as an icon and a number; and a lane as a dot followed by its name (REQ-UI-115).
Source: `assets/2026-11-22/beads-light.png`, `assets/2026-11-22/index.html#beads`

#### Scenario: List row without chips
- GIVEN a blocked P1 bug `b-1` assigned to alice with the labels `area:backend` and `ui`, the lane `be` and 2 comments
- WHEN the List view is shown at 1440px
- THEN the row shows "bug" in the bug colour, "P1" bold, "area:backend", "ui", a muted dot and "be", and a comment icon with 2, and none of them has a border or a background

#### Scenario: Board card without chips
- GIVEN an in-progress P2 epic with `points: 8` and the kind `technical`
- WHEN its Board card is shown
- THEN it shows "P2" in the muted colour, "Technical" and "8 pt" as text, and no pill

#### Scenario: Table row
- GIVEN a blocked bead assigned to me
- WHEN the My Tasks page is shown
- THEN its row shows its state "Blocked" as text, without a border or a tint

#### Scenario: Controls keep their pills
- GIVEN the Beads page at 1440px with the status filter "open" and the priority filter P1
- WHEN it is shown
- THEN the Status filter is the chip "Status open ×" in the identity style, and "More filters" shows its count "1" in a tinted pill

### REQ-MILESTONE-UI-018: Beads tab on the milestone page
<!-- base: 4d6687be0f2f996b19f34dfbf508588e3fbeb59df2e6b5992d72d0cae2e3ff91 -->
The milestone page SHALL offer the tabs Gantt, Beads and Retro (REQ-MILESTONE-UI-019), kept in the URL as `tab` (`gantt` when absent or unknown, `beads`, `retro`), and SHALL treat `tab=graph` as `tab=beads` with `view=graph`. WHILE the Beads tab is shown, the page SHALL show the Beads views (REQ-UI-030) of the milestone's project with the milestone fixed to this one, no Milestone filter in the filter bar or its sheet (REQ-UI-142) and "Clear filters" leaving the milestone as it is (REQ-UI-143), SHALL keep their search, filters, view, selection and graph scope in the milestone page's URL with the names the Beads page uses, and SHALL fetch closed beads without "Show closed" WHILE the milestone is closed. WHEN the user changes tab, the page SHALL keep only `start` and `zoom` of the query besides `tab`.

#### Scenario: Beads tab
- GIVEN milestone `m2` of project `p` with epics `e1` and `e2` and a bead `x` under milestone `m3`
- WHEN the user opens `/milestones/p/m2?tab=beads`
- THEN the List view shows `e1` and `e2` and not `x`, and there is no Milestone filter

#### Scenario: View and filters in the URL
- GIVEN the Beads tab of `m2`
- WHEN the user chooses Board and the status "open"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board&status=open` and reloading it shows the same Board and filter

#### Scenario: Clear filters keeps the milestone
- GIVEN the Beads tab of `m2` at `/milestones/p/m2?tab=beads&view=board&status=open`
- WHEN the user chooses "Clear filters"
- THEN the URL is `/milestones/p/m2?tab=beads&view=board` and the Board shows the beads of `m2`

#### Scenario: Changing tab
- GIVEN `/milestones/p/m2?tab=beads&view=board&status=open&start=2026-11-10&zoom=2w`
- WHEN the user chooses Gantt and then Beads
- THEN the URL is `/milestones/p/m2?start=2026-11-10&zoom=2w` and then `/milestones/p/m2?tab=beads&start=2026-11-10&zoom=2w`, and the List view shows no filter

#### Scenario: Old Graph link
- GIVEN a link to `/milestones/p/m2?tab=graph`
- WHEN it is opened
- THEN the Beads tab is shown on the Graph view

#### Scenario: Closed milestone
- GIVEN closed milestone `m1` whose beads are all closed
- WHEN the user opens its Beads tab with "Show closed" off
- THEN the closed beads of `m1` are shown

## REMOVED
