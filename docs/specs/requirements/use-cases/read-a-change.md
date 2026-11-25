# Read a change

Actor: BA
Trigger: The BA wants to read what a change proposes and who signed it off.
Requirements: REQ-REQUIREMENTS-007, REQ-REQUIREMENTS-008, REQ-REQUIREMENTS-010, REQ-REQUIREMENTS-016, REQ-REQUIREMENTS-017

## Goal

Read a change folder without a checkout.

## Main flow
1. The BA opens the Changes section.
2. The system lists the open and archived changes with their sign-off.
3. The BA opens a change.
4. The system shows its header and one tab per file.
5. The BA chooses a tab.
6. The system shows the text.

## Alternative flows
### 2a. The project has no changes
1. The system says so.
2. Use case ends.

## Exception flows
### 2e. The trace fails
1. The system lists the changes with the sign-off "Unknown" and the error.
2. Resume at step 3.

### 4e. The change is not found
1. The system says so and links to the Changes section.
2. Use case ends.
