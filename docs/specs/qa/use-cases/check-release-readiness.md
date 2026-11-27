# Check release readiness

Actor: Lead
Secondary actors: QA
Trigger: The lead wants to know whether a milestone can ship.
Requirements: REQ-QA-002, REQ-QA-003, REQ-QA-007, REQ-QA-008, REQ-QA-009, REQ-QA-012, REQ-MILESTONE-UI-018

## Goal

See in one place whether every requirement of a milestone has a case, every case passed since its requirement changed, no P0 or P1 bug is open, and every epic shipped, and what still stands in the way.

## Preconditions

- The project is configured and uses gin-workflow milestones, SDD specs and gin-qa cases.

## Main flow
1. The lead opens the milestone page and chooses the Readiness tab.
2. The system finds the milestone's epics, the requirements they added or modified, and the cases of those requirements.
3. The system checks each case's effective result, the open P0 and P1 bugs of the milestone's epics or of no known epic, and the gates of each epic.
4. The system shows the verdict and the four items, each with its mark and count.
5. The lead opens the list of an item that fails.
6. The system lists what stands in the way, each entry linking to its requirement, case, bug or epic.

## Alternative flows
### 3a. gin-qa, the trace or the export snapshot cannot be read
1. The system marks the items that need it as unknown with the error, and the verdict is unknown unless another item fails.
2. Resume at step 4.

### 3b. The gin state of an epic fails
1. The system lists that epic as unknown in the gates item.
2. Resume at step 4.

### 3c. The milestone changed no requirement
1. The system passes the case items with the note "No requirement changed".
2. Resume at step 4.

## Exception flows
### 2e. The milestone cannot be read
1. The system shows the error and "Try again".
2. Use case ends.

## Business rules

- REQ-QA-007 defines the epics, requirements and cases of a milestone.
- REQ-QA-008 defines the four items and the verdict.

## Postconditions

- Nothing changes in the project, its files or Beads.
