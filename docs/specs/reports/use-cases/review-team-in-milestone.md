# Review the team in a milestone

Actor: Team lead
Requirements: REQ-REPORTS-008, REQ-REPORTS-010, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-015, REQ-REPORTS-016, REQ-REPORTS-017

## Goal

Judge whether a milestone will finish by its end date and see what each member has open, in progress and closed in it.

## Preconditions

- The project is configured in gin-console and has a milestone bead with `start` and `end` dates and epics under it.

## Main flow
1. The team lead opens Reports and picks the project.
2. The system shows the Team tab with the default milestone: its line, figures, status bar, closed-per-day chart, member table and the Open bead list.
3. The team lead reads Pace against the pace needed and the On time share.
4. The team lead presses a member's row in the Team KPI table.
5. The system shows that member's figures, highlights the member in the chart, and lists the member's beads with Open, In progress, Closed and All counts.
6. The team lead picks In progress and sorts by "In progress for".
7. The system lists the member's in-progress beads, longest first, with the ones above 3 days in the warning color.

## Alternative flows
### 1a. All projects is selected
1. The system asks the team lead to pick a project and requests nothing.

### 2a. The project has no milestones
1. The system says the project has no milestones yet and offers to copy `gin-workflow milestone create`.

### 2b. The snapshot cannot be read
1. The system shows the error with a Retry button.

### 4a. The team lead picks another milestone
1. The system requests that milestone's team report, selects All members and shows its default list.

## Postconditions

- The URL holds the project, milestone, member and status, so the same view can be shared.
- Nothing in Beads changed.
