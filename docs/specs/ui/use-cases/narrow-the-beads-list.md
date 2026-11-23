# Narrow the Beads list

Actor: Team lead
Trigger: The team lead wants to see only some beads of the current project.
Requirements: REQ-UI-142, REQ-UI-143, REQ-UI-144, REQ-UI-145, REQ-UI-146, REQ-UI-084, REQ-UI-104, REQ-UI-037

## Goal

Narrow the Beads views from one line of filters, and get back to the beads of the current milestone in one step.

## Preconditions

- The project has a current milestone.
- The Beads page is shown in a window 1024px wide or more.

## Main flow
1. The team lead opens the Beads page of the project.
2. The system shows the filter bar on one line, with the chip "Milestone <title> ×" of the current milestone, and the beads of that milestone.
3. The team lead presses `/` and types a word.
4. The system moves the focus to the search box, keeps the beads that match, and offers "Clear filters".
5. The team lead clicks "Status" and chooses one or more statuses in its menu.
6. The system shows the chip "Status <values> ×" and keeps the beads in those statuses.
7. The team lead opens "More filters" and chooses a priority.
8. The system shows the count 1 on "More filters" and keeps the beads of that priority.
9. The team lead chooses "Clear filters".
10. The system removes the search and every filter, shows the chip of the current milestone again and no longer offers "Clear filters"; "Show closed", the view and the selection stay as they were.

## Alternative flows
### 2a. The project has no current milestone
1. The system shows the button "Milestone" without a chip, and every bead.
2. Resume at step 3.

### 2b. The window is narrower than 768px
1. The system shows the search box and a button "Filters" with the count of active filters; the team lead chooses the filters in its sheet, which ends with "Clear filters".
2. Resume at step 9.

### 2c. The page fixes the milestone
1. On the Beads tab of a milestone page, or the Graph or Lanes tab of an epic page, the system shows the bar without the Milestone filter, and "Clear filters" leaves the milestone as it is.
2. Resume at step 3.

### 6a. The team lead removes a chip with its "×"
1. The system removes that filter only; for Milestone it shows every bead and the button "Milestone", and offers "Clear filters".
2. Resume at step 7.

## Exception flows
### 2e. The milestones cannot be loaded
1. The system shows every bead, and the menu of the Milestone filter says "Milestones unavailable".
2. Resume at step 3.

## Business rules

- REQ-UI-143 says which filters are active and what "Clear filters" removes.
- REQ-UI-104 says which milestone is in effect.

## Postconditions

- The URL holds the search and the filters, so a shared link shows the same list.
- Nothing in the project or its Beads is changed.
