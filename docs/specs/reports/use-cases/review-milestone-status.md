# Review the status of a milestone

Actor: PM
Trigger: The PM wants to know whether a milestone will finish by its end date.
Requirements: REQ-REPORTS-020, REQ-REPORTS-021, REQ-REPORTS-022, REQ-REPORTS-023, REQ-REPORTS-024, REQ-REPORTS-025, REQ-REPORTS-026, REQ-REPORTS-027, REQ-REPORTS-028, REQ-REPORTS-029, REQ-REPORTS-030, REQ-REPORTS-031, REQ-REPORTS-032, REQ-REPORTS-033, REQ-UI-095, REQ-UI-129

## Goal

Get a verdict on a milestone, with the reason, the trend since last week, the scope changes and the risks, on one screen.

## Preconditions

- The project is configured in gin-console.

## Main flow
1. The PM opens Reports.
2. The system opens the Status section for the default milestone and writes it into the URL.
3. The system shows the verdict and its sentence, the five figures with their change since last week, the burn-up, the changes since kickoff, the risks and the epic table.
4. The PM reads the verdict and the risks.
5. The PM opens an epic from the epic table or a bead from a risk line.
6. The system shows its bead page, which remembers the Status section as the place to go back to.

## Alternative flows
### 2a. The project has no milestones
1. The system selects the last 30 days and says the project has no milestones yet, with the command `gin milestone create` to copy.
2. Use case ends.

### 3a. The milestone has not started
1. The system shows the verdict "Not started" and "Starts <start>" in place of the burn-up.
2. Resume at step 4.

### 4a. The PM picks another milestone
1. The system requests the status report of that milestone.
2. Resume at step 3.

### 4b. The PM picks a period
1. The system shows the beads closed in the period, the rework rate and the blocked beads, and "Pick a milestone to see the verdict, burn-up and epics".
2. Use case ends.

## Exception flows
### 3e. The status report fails
1. The system shows the error with a Retry button.
2. The PM presses Retry.
3. Resume at step 3.

### 3f. The milestone's detail or the Milestones list fails
1. The system shows the rest of the section, "—" for the planned and forecast dates and the epic verdicts, and the verdict without the forecast.
2. Resume at step 4.

## Business rules
- Milestone history of an epic: REQ-REPORTS-021.
- Burn-up: REQ-REPORTS-022.
- Figures and their change since last week: REQ-REPORTS-023.
- Verdict: REQ-REPORTS-027.
- One scope for every section: REQ-REPORTS-033.

## Postconditions

- The URL holds the section, the project and the scope, so the same report can be shared.
- Nothing in Beads changed.
