# Filter beads by milestone

Actor: Team member
Requirements: REQ-UI-104, REQ-UI-105, REQ-UI-143, REQ-UI-144, REQ-BEADS-015

## Goal

See only the beads of the milestone the team is working in, on the Beads page and in My Tasks.

## Preconditions

- The project has a milestone bead with `start` and `end` dates and epics under it.

## Main flow
1. The team member opens the Beads page of the project.
2. The system selects the project's current milestone, shows it as the chip "Milestone <title> ×" and shows only the beads under it.
3. The team member opens My Tasks, which follows the project chosen in the switcher.
4. The system selects the same milestone and lists only the member's tasks under it.

## Alternative flows
### 2a. The project has no open milestone
1. The system selects All and shows every bead.

### 2b. The team member chooses a closed milestone
1. The system requests the closed beads and shows the milestone's beads, closed ones included.

### 2c. The team member removes the milestone chip
1. The system shows every bead and the button "Milestone" in place of the chip.
2. When the team member chooses "Clear filters", the system selects the current milestone again.

## Postconditions

- The URL holds the project and milestone, so a shared link shows the same view.
