# Review test trends

Actor: QA
Secondary actors: Developer, Lead
Trigger: QA wants to know whether test results get better, which cases are unstable, and how long failures stay open.
Requirements: REQ-QA-014, REQ-QA-015, REQ-QA-016, REQ-QA-017, REQ-QA-018, REQ-QA-019

## Goal

See the pass rate of each capability per day, the cases that flip between passed and failed without being changed, and how long failures take to pass again.

## Preconditions

- The project is configured; gin-qa with the `runs` command is installed on the console host.

## Main flow
1. QA opens the Trends tab of Tests.
2. The system reads the project's run history from gin-qa for the last 30 days and shows the pass rate per capability and day, the flaky cases, the time to fix and the cases still failing.
3. QA picks another window or one capability.
4. The system shows the trends of that window and capability and keeps them in the URL.
5. QA opens a flaky or failing case.
6. The system shows its case page.

## Alternative flows
### 2a. gin-qa is missing, too old, or fails
1. The system shows why, or the error with "Try again", on the Trends tab only.
2. Use case ends.

### 2b. The window has no passed or failed run
1. The system shows "No test runs in the last n days".
2. Resume at step 3.

## Business rules

- REQ-QA-016 defines a flaky case; REQ-QA-017 defines a failure streak and its time to fix.

## Postconditions

- Nothing changes in the project, its files or Beads.
