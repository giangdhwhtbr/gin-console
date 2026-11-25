# Review what needs me

Actor: Team lead
Trigger: The team lead opens the console.
Requirements: REQ-OVERVIEW-001, REQ-OVERVIEW-002, REQ-OVERVIEW-003, REQ-OVERVIEW-004, REQ-OVERVIEW-005, REQ-OVERVIEW-006, REQ-OVERVIEW-007, REQ-OVERVIEW-008, REQ-OVERVIEW-009, REQ-OVERVIEW-010

## Goal

Know across every project what needs the lead now.

## Preconditions

- The team lead has entered their email on the login screen (REQ-UI-097).

## Main flow
1. The team lead opens `/`.
2. The system shows the milestones, the attention lists and the work in progress per member of every project.
3. The system requests verdicts, forecasts and gates.
4. The system adds each answer to its line or section.
5. The team lead opens a row.
6. The system shows the bead, with Overview as the first link of its breadcrumb.

## Alternative flows
### 2a. No project is configured
1. The system says no projects are configured.
2. Use case ends.

## Exception flows
### 2e. The beads of a project cannot be read
1. The system shows an alert for that project and the lists of the others.
2. Resume at step 3.

### 4e. A verdict, forecast or gate request fails
1. The system shows the error on its line.
2. Resume at step 5.

## Business rules

- REQ-OVERVIEW-002 to REQ-OVERVIEW-006 decide what is listed.
- REQ-OVERVIEW-008 decides which gates and waivers are listed.
- REQ-BEADS-023 decides when an email and a handle are one person.

## Postconditions

- Nothing in any project has changed.
