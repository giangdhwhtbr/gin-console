# TC-BEADS-047: Merge conflict

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** e0469d31

**Preconditions:**
- Projects A and B are configured
- The fake `bd dolt pull` in A exits 1 with "Error: merge origin/main: Error 1105: Merge conflict detected, @autocommit transaction rolled back."
- The fake `bd dolt pull` in B exits 0

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects/beads`

**Expected:**
- A has `pull.status` `error` and `pull.error` is that line
- B has `pull.status` `ok`
