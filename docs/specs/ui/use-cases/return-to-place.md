# Return to place

Actor: Team member
Trigger: The user opens a bead from a list page and later goes back
Requirements: REQ-UI-072, REQ-UI-073, REQ-UI-057, REQ-UI-127, REQ-UI-063

## Goal

Come back to the same place of the list the bead was opened from.

## Preconditions

- A list page (Beads, My Tasks, Milestones, a milestone page or Reports) is shown.

## Main flow
1. The user scrolls the list page and opens a bead.
2. The console remembers the page as the place the bead was opened from, with its scroll position and the bead's id.
3. The console shows the bead page with a breadcrumb that names the place, the parent's title and the bead's title, marks the place's navigation link, and names the browser tab for the bead.
4. The user uses the browser Back button.
5. The console shows the list page, scrolls to the remembered position once its data is shown, and focuses the opened bead, marked as last opened for 2 seconds.

## Alternative flows
- 4a. The user uses the first link of the breadcrumb: the console opens the remembered place at the top of the page. Use case ends.

## Exception flows
- 2a. The browser refuses to store the position: the list page starts at the top after Back. Use case ends.
