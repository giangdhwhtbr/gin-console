# Pick the next work

Actor: Developer
Trigger: The developer starts a session, or has finished a task.
Requirements: REQ-UI-055, REQ-UI-057, REQ-UI-063, REQ-UI-072, REQ-UI-099, REQ-UI-100, REQ-UI-101, REQ-UI-150, REQ-UI-151, REQ-UI-152, REQ-UI-153, REQ-BEADS-025

## Goal

Know which bead to work on next, and have the command to start it, without running anything from the console.

## Preconditions

- The developer has signed in with an email.
- At least one project is configured and its Beads can be read.

## Main flow
1. The developer opens My work.
2. The system loads the beads of the current project and shows the groups Next up (Assigned to me and Unclaimed), In progress, Blocked and Waiting on me, each with its count.
3. The developer opens a bead from a group.
4. The system shows the bead page with the next command and a Copy button above "View in graph".
5. The developer copies the command and runs it outside the console.

## Alternative flows
### 2a. The window is under 768px wide
1. The system shows each bead as a card.
2. Resume at step 3.

### 2b. No group holds a bead
1. The system says "No work for <email>" with a link to the Beads page.
2. Use case ends.

### 3a. The bead is blocked
1. The system shows "Blocked by" with each open blocker as a link, and no next command.
2. Use case ends.

## Exception flows
### 2e. The beads of the current project cannot be loaded
1. The system names the project and its error.
2. Use case ends.

### 4e. The bead has no next command, or an epic's workflow has not loaded
1. The system shows the header without the command.
2. Use case ends.

## Business rules
- Groups and their order: REQ-UI-150.
- Which command a bead has: REQ-BEADS-025.

## Postconditions

- Nothing in the project or Beads changed.
