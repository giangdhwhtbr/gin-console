# TC-BEADS-115: Fetch failure and timeout

- **REQ:** REQ-BEADS-033@49ff080f
- **Priority:** medium

**Preconditions:**
- Project A's `git fetch` exits 128 with "fatal: Could not read from remote repository."
- Project B's `git fetch` runs longer than 30 seconds (the fake raises the timeout of the runner)
- The scheduled pull runs, with its log captured

**Steps:**
1. Run the scheduled pull once
2. Send `GET /api/projects/beads`

**Expected:**
- A has `attachments_fetch.status` `error` with `error` "fatal: Could not read from remote repository."
- B has `attachments_fetch.status` `error` with `error` "git fetch timed out"
- The log names both A and B with their errors
