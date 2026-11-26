# See the project timeline

Actor: PM
Secondary actors: Team lead
Trigger: The PM wants to know when all the work of a project finishes and which milestone pushes it out.
Requirements: REQ-MILESTONE-UI-001, REQ-MILESTONE-UI-008, REQ-MILESTONE-UI-033, REQ-MILESTONE-UI-034, REQ-MILESTONE-UI-035, REQ-MILESTONE-UI-036, REQ-MILESTONE-UI-037, REQ-MILESTONE-UI-038

## Goal

See every open milestone and epic of one project on one time axis, with the project finish against the deadline.

## Preconditions

- The project is configured, uses Beads tracking, and has gin-workflow with the chained forecast (gin 3.5.3 or later).

## Main flow
1. The PM opens Milestones for a project.
2. The system reads `gin milestone list --all --json` and the closed epics from the Beads export.
3. The system shows the project finish, the deadline and the lateness in the header, and the Timeline with each milestone, its forecast overrun and its epics, then the epics outside a milestone.
4. The PM changes the zoom to Quarters to see the whole span.
5. The PM opens a late milestone or epic from its label.

## Alternative flows
### 3a. There is no open work to forecast
1. The system says "No open work to forecast" and shows no finish line.
2. Resume at step 4.

### 4a. The PM turns on "Show closed"
1. The system adds the closed milestones and their closed epics with their real dates, in the Done style.
2. Resume at step 5.

### 4b. The PM opens the List view
1. The system shows the milestone list and the forecast card as before.
2. Use case ends.

## Exception flows
### 2e. gin milestone list fails
1. The system shows the error with a Retry button.
2. The PM presses Retry.
3. Resume at step 2.

### 3e. The forecast failed
1. The system shows "Forecast unavailable: <error>" in the header and the milestone windows without forecast bars.
2. Resume at step 4.

## Business rules

- REQ-MILESTONE-UI-008 defines the forecast fields and the closed epics.
- REQ-MILESTONE-UI-035 defines the order of the rows.

## Postconditions

- Nothing changes in the project; the URL holds the project, the view, the zoom and `closed`.
