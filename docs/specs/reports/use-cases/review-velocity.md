# Review velocity

Actor: Team lead
Trigger: The team lead opens the Velocity tab of the Reports page.
Requirements: REQ-REPORTS-018, REQ-UI-095, REQ-MILESTONE-UI-008

## Goal

See whether the team does what it commits to and whether its days per point, and so its plans, are getting better, without any figure per member.

## Preconditions

- The project's roadmap epics carry story points and at least one milestone was kicked off with them (gin-workflow `story-points`).

## Main flow
1. The team lead opens Reports, picks a project and the Velocity tab.
2. The system loads the project's milestones list and shows the current days per point and the say/do and accuracy of the latest milestone with a commitment.
3. The system shows committed against completed points and days per point against the planned value, per milestone, oldest first, and a table of every figure.
4. The team lead reads the trend.

## Alternative flows
### 2a. No milestone has a commitment or completed points
1. The system shows "No kicked-off milestones with points yet".
2. Use case ends.

## Exception flows
### 2e. The milestones list cannot be loaded
1. The system shows the project's error and cause, with a Retry button.
2. Resume at step 4.

## Business rules

- REQ-REPORTS-018: velocity is shown per project and milestone only, never per member.
- REQ-MILESTONE-UI-008: the figures are gin's, unchanged.

## Postconditions

- The selected tab is in the URL (`tab=velocity`), so a shared link opens the same view.
