# TC-BEADS-048: Timeout

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 2cb87017

**Preconditions:**
- Project A is configured; the fake `bd dolt pull` in A runs longer than 30 seconds (the timeout is shortened or the clock advanced in the test)

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects/beads`

**Expected:**
- The pull command was stopped
- A has `pull.status` `error` and `pull.error` "bd dolt pull timed out"
