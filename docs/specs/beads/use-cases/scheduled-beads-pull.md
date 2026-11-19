# Scheduled Beads pull

Actor: Scheduler
Secondary actors: Dolt remote
Trigger: `beads.pull_interval` has passed since the server started or since the last scheduled pull ended.
Requirements: REQ-BEADS-017, REQ-BEADS-016, REQ-CONFIG-006

## Goal

Keep the console close to each project's Dolt remote while nobody presses "Refresh data".

## Preconditions

- The config sets `beads.pull_interval` to at least one minute.

## Main flow
1. The scheduler wakes when the interval has passed.
2. The system pulls every project as in steps 2–4 of refresh-pulls-beads.
3. The system drops every snapshot and cached answer.
4. The next page load or Projects poll shows the pulled beads and each project's pull line.
5. The scheduler waits the interval again. Resume at step 1.

## Exception flows
### 2e. A project's pull fails
1. The system keeps `error` for that project and logs its name and error.
2. Resume at step 3.

## Business rules

- REQ-CONFIG-006: an absent or `0` interval means no scheduled pull.

## Postconditions

- The pull results of the run are kept as in refresh-pulls-beads.
