# Review test results

Actor: QA
Secondary actors: Developer
Trigger: QA wants to see which cases pass, which do not, and what the last e2e run of a case showed.
Requirements: REQ-QA-001, REQ-QA-002, REQ-QA-003, REQ-QA-004, REQ-QA-005, REQ-QA-006, REQ-QA-010, REQ-QA-011, REQ-QA-013, REQ-UI-055

## Goal

See the cases of a project by capability, type and effective result, find the failed ones with their bug, and look through the steps and screenshots of a case's latest e2e run.

## Preconditions

- The project is configured and has gin-qa cases; gin-qa is installed on the console host.

## Main flow
1. QA opens Tests.
2. The system reads the project's cases from gin-qa and shows the counts per capability and per type, and the list of cases.
3. QA activates a count, such as the failed cases of a capability.
4. The system filters the list and keeps the filters in the URL.
5. QA opens a case.
6. The system shows the case, its requirements, its bug and its latest run, step by step, with thumbnails.
7. QA opens a thumbnail and steps through the screenshots.

## Alternative flows
### 2a. gin-qa is missing, too old, or fails
1. The system shows why, or the error with "Try again".
2. Use case ends.

### 2b. The project has no case
1. The system shows "No test cases yet" with the skill to write them.
2. Use case ends.

### 6a. The run folder is not on this host, the case never ran, or the run files cannot be read
1. The system shows the reason in place of the latest run.
2. Use case ends.

## Exception flows
### 7e. A screenshot was removed or is not an image
1. The system answers 404 for it and shows no thumbnail.
2. Use case ends.

## Business rules

- REQ-QA-005 defines the latest run of a case and which screenshots may be served.

## Postconditions

- Nothing changes in the project, its files or Beads.
