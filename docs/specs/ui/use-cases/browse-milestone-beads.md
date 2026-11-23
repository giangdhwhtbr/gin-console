# Browse a milestone's beads

Actor: Team member
Requirements: REQ-MILESTONE-UI-018, REQ-MILESTONE-UI-002, REQ-UI-106, REQ-UI-072, REQ-UI-073, REQ-UI-147, REQ-UI-149

## Goal

Read every bead of a milestone in the List, Board, Focus or Graph view from the milestone page, and come back to it after opening a bead.

## Preconditions

- The project has a milestone with epics, and tasks under some epics.

## Main flow
1. The team member opens the milestone page from the Milestones page and chooses the Beads tab.
2. The system lists the milestone's beads in the List view, with no Milestone filter.
3. The team member chooses the Graph view and filters by an assignee.
4. The system draws the milestone's epics that hold a bead of that assignee, with their arrows.
5. The team member selects an epic.
6. The system shows the epic in the details panel next to the graph, with "Show children".
7. The team member chooses "Show children".
8. The system draws the epic's tasks, with a breadcrumb back to the milestone.
9. The team member double-clicks a task.
10. The system shows the task's bead page, whose breadcrumb starts with the milestone id and the Graph view.
11. The team member uses the first link of the breadcrumb.
12. The system shows the milestone page's Beads tab with the Graph view and the assignee filter.

## Alternative flows
### 1a. The team member follows an old link with tab=graph
1. The system shows the Beads tab on the Graph view.

### 3a. The team member chooses Board or Focus
1. The system shows that view with the same filters, without a new request.

### 4a. No bead matches the filters
1. The system says "No beads match these filters".

### 5a. The window is narrower than 1024px
1. Tapping the epic opens the epic's page, whose Graph tab draws its tasks.
2. Use case ends.

## Postconditions

- The URL holds the tab, view, filters and graph scope, so a shared link shows the same view.
