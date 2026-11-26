# Trace a requirement

Actor: BA
Trigger: The BA wants to know whether a requirement is proven.
Requirements: REQ-REQUIREMENTS-001, REQ-REQUIREMENTS-002, REQ-REQUIREMENTS-003, REQ-REQUIREMENTS-004, REQ-REQUIREMENTS-005, REQ-REQUIREMENTS-006, REQ-REQUIREMENTS-012, REQ-REQUIREMENTS-013, REQ-REQUIREMENTS-014, REQ-REQUIREMENTS-015, REQ-REQUIREMENTS-019

## Goal

Follow a requirement from its text to its sign-off, work and tests.

## Preconditions

- The project is configured.

## Main flow
1. The BA opens the Matrix section.
2. The system shows the numbers per status and the requirements by capability.
3. The BA sets filters.
4. The system lists the matching requirements.
5. The BA selects a requirement.
6. The system shows its scenarios, sign-off, changes, beads, cases and test files.

## Alternative flows
### 2a. The project has no requirements
1. The system says why.
2. Use case ends.

### 4a. No requirement matches
1. The system says so and offers to clear the filters.
2. Resume at step 3.

## Exception flows
### 2e. gin fails
1. The system shows the error and, for an old gin, the command that updates it.
2. Use case ends.

### 6e. The scenarios fail to load
1. The system says so and shows the rest.
2. Use case ends.

## Business rules

- REQ-REQUIREMENTS-002 decides the status.
- REQ-REQUIREMENTS-003 decides the sign-off.
