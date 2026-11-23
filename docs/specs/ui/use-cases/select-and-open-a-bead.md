# Select and open a bead

Actor: Developer
Trigger: The developer wants to read a bead shown in a Beads view, or go to its page.
Requirements: REQ-UI-147, REQ-UI-148, REQ-UI-149, REQ-UI-037, REQ-UI-046, REQ-UI-051, REQ-UI-106, REQ-UI-078, REQ-UI-045

## Goal

Read a bead beside any Beads view after one click, and open its page with a second action, in the same way in the List, Board, Focus, Graph and Lanes views.

## Preconditions

- The Beads page, the Beads tab of a milestone page, or the Graph or Lanes tab of an epic page shows a view with at least one bead.
- The window is 1024px wide or more.

## Main flow
1. The developer clicks a row, card or node outside its title link and its controls.
2. The system selects the bead, writes `select=<id>` into the URL, marks the item with the identity wash and bar, and shows the bead in the details panel beside the view.
3. The developer reads the bead in the panel and clicks the same item again.
4. The system keeps the bead selected.
5. The developer double-clicks the item, presses `Enter` on it, or chooses "Open page" in the panel.
6. The system opens the bead page and remembers the view for the Back button.

## Alternative flows
### 1a. The window is narrower than 1024px
1. The system opens the bead page at once and shows no panel.
2. Use case ends.

### 1b. The developer clicks the title link of a row or card
1. The system opens the bead page.
2. Use case ends.

### 1c. The developer uses the keyboard
1. The developer moves the focus with the arrow keys and presses `Enter` on an item that is not selected.
2. Resume at step 2.

### 3a. The developer presses Escape or chooses "Close details"
1. The system clears the selection, closes the panel and moves the focus to the item.
2. Use case ends.

### 3b. The view is Graph or Lanes and the bead has children
1. The developer chooses "Show children" in the panel.
2. The system sets the scope to the bead, clears the selection, and draws its children with the breadcrumb ending at the bead.
3. Resume at step 1.

### 3c. The developer changes view
1. The system keeps the selection and shows the panel in the new view, with the note "Not in the current list" when the view does not draw the bead.
2. Resume at step 3.

## Exception flows
### 2e. The bead cannot be loaded
1. The panel shows the error with a retry button, and the view stays as it is.
2. Use case ends.

## Business rules

- REQ-UI-147 is the one rule for a click, a double click, `Enter` and Escape in every Beads view.
- REQ-UI-148 says where the panel goes and what closing it writes into the URL.

## Postconditions

- The URL holds `select`, and `scope` after "Show children", so a reload shows the same bead.
- Nothing in the project or its Beads is changed.
