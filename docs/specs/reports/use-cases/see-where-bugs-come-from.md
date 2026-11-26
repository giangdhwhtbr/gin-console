# See where bugs come from

Actor: PM
Secondary actors: QA
Trigger: The PM or the QA wants to know which work the bugs come from, which stay open, and whether the team keeps up with them.
Requirements: REQ-REPORTS-033, REQ-REPORTS-039, REQ-REPORTS-040, REQ-REPORTS-041, REQ-REPORTS-042, REQ-REPORTS-043, REQ-REPORTS-044, REQ-UI-063, REQ-UI-095, REQ-UI-129

## Goal

See, for one project, the bugs of a milestone or period by source epic and by week, and the bugs open now with their age.

## Preconditions

- At least one project is configured; its beads are exported to `.beads/issues.jsonl`.

## Main flow
1. The PM opens Reports, picks a project, and selects the Bugs section, whose headline names the number of open bugs.
2. The system finds the source epic of each bug and counts the bugs opened and closed in the scope and the bugs open now.
3. The system shows the figures, the bugs per week, the bugs by epic and the open bugs, oldest first.
4. The PM opens an epic or an open bug from its row.

## Alternative flows
### 1a. The PM picks another milestone or period
1. The system counts again for that scope; the open bugs stay the same.
2. Resume at step 3.

### 2a. A bug has no link and no parent that reach an epic
1. The system counts it under "Source unknown" and says which share of the opened bugs has no source epic.
2. Resume at step 3.

### 3a. The project has no bugs
1. The system shows "No bugs in <project>".
2. Use case ends.

### 3b. No bug was opened or closed in the scope
1. The system shows "No bugs in this scope" in place of the bugs per week, and the open bugs as usual.
2. Resume at step 4.

## Exception flows
### 2e. The export of the project cannot be read
1. The system shows the error with a Retry button in place of the report.
2. The PM presses Retry.
3. Resume at step 2.

## Business rules

- REQ-REPORTS-040 defines the source epic of a bug.
- REQ-REPORTS-041 and REQ-REPORTS-042 define the counts, the weeks and the ages.

## Postconditions

- Nothing changes in the projects; the URL holds the section, the project and the scope.
