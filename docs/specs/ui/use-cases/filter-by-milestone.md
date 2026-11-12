# Filter beads by milestone

Actor: Team member
Requirements: REQ-UI-104, REQ-UI-105, REQ-BEADS-015

## Goal

See only the beads of the milestone the team is working in, on the Beads page and in My Tasks.

## Preconditions

- The project has a milestone bead with `start` and `end` dates and epics under it.

## Main flow
1. The team member opens the Beads page of the project.
2. The system selects the project's current milestone and shows only the beads under it.
3. The team member opens My Tasks and chooses the project.
4. The system selects the same milestone and lists only the member's tasks under it.

## Alternative flows
### 2a. The project has no open milestone
1. The system selects All and shows every bead.

### 2b. The team member chooses a closed milestone
1. The system requests the closed beads and shows the milestone's beads, closed ones included.

### 3a. The team member keeps All projects
1. The system disables the Milestone select and lists the tasks of every project.

## Postconditions

- The URL holds the project and milestone, so a shared link shows the same view.
