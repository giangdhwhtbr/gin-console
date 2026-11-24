# Review the team in a milestone

Actor: Team lead
Requirements: REQ-REPORTS-008, REQ-REPORTS-010, REQ-REPORTS-012, REQ-REPORTS-013, REQ-REPORTS-015, REQ-REPORTS-016, REQ-REPORTS-017, REQ-REPORTS-033, REQ-REPORTS-034, REQ-REPORTS-035, REQ-REPORTS-036

## Goal

Judge whether a milestone will finish by its end date, how the team delivers against its estimates over milestones, and what each member has open, in progress and closed in it.

## Preconditions

- The project is configured in gin-console.

## Main flow
1. The team lead opens the Team section of Reports.
2. The system shows the Team section for the scope in the URL, else the default milestone: its scope line, figures with points delivered and estimate accuracy, status strand, closed-per-day chart, member table, Across milestones and the Open bead list.
3. The team lead reads Pace against the pace needed, the On time share, the estimate accuracy and the trend across milestones.
4. The team lead presses a member's row in the Team KPI table.
5. The system shows that member's figures, highlights the member in the chart, and lists the member's beads with Open, In progress, Closed and All counts.
6. The team lead picks In progress and sorts by "In progress for".
7. The system lists the member's in-progress beads, longest first, with the ones above 3 days in the warning color.

## Alternative flows
### 2a. The project has no milestones
1. The system selects the last 30 days and shows the team over them, without pace, on time or estimate accuracy.
2. Resume at step 3.

### 2b. A fifth or more of the closed beads have no assignee
1. The system says how many closed beads have no assignee, so member numbers undercount, above the member table.
2. Resume at step 3.

### 4a. The team lead picks another milestone or a period
1. The system requests the team report of that scope, selects All members and shows its default list.
2. Resume at step 3.

## Exception flows
### 2e. The snapshot cannot be read
1. The system shows the error with a Retry button.
2. Use case ends.

## Postconditions

- The URL holds the section, the project, the scope, the member and the status, so the same view can be shared.
- Nothing in Beads changed.
