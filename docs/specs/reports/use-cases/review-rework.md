# Review rework

Actor: Team lead
Secondary actors: PM
Trigger: The team lead wants to know how much finished work came back, by member and by epic.
Requirements: REQ-REPORTS-005, REQ-REPORTS-019, REQ-UI-091, REQ-UI-093

## Goal

See the share of closed beads that were reopened or had a bug found later, and where that rework sits, without any AI usage data.

## Preconditions

- At least one project is configured; its beads are exported to `.beads/issues.jsonl`.

## Main flow
1. The team lead opens Reports, picks a project and a period, and selects the Quality tab.
2. The system counts, for each closed bead of the period, its reopens from the Beads interaction log and its bugs found later from `discovered-from` dependencies.
3. The system shows the rework rate, the reopens and the bugs, then the member rows and the epic rows.
4. The team lead opens an epic with high rework from its row.

## Alternative flows
### 2a. The project has no interaction log
1. The system counts no reopens for that project and still counts its bugs.
2. Resume at step 3.

### 3a. No bead closed in the period
1. The system shows the rework rate as "—" and each table as "No data in this period".
2. Use case ends.

## Exception flows
### 2e. The project's report cannot be built
1. The system shows the error with a Retry button in place of the report.
2. The team lead presses Retry.
3. Resume at step 2.

## Business rules

- REQ-REPORTS-019 defines reopens, bugs and rework.

## Postconditions

- Nothing changes in the projects; the URL holds the project, period and `tab=quality`.
