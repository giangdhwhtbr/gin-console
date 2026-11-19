# TC-BEADS-047: Merge conflict

- **REQ:** REQ-BEADS-016@64da543e
- **Priority:** high

**Preconditions:**
- Projects A and B are configured
- The fake `bd dolt pull` in A exits 1 with "Error: merge origin/main: Error 1105: Merge conflict detected, @autocommit transaction rolled back."
- The fake `bd dolt pull` in B exits 0

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects`

**Expected:**
- A has `pull.status` `error` and `pull.error` is that line
- B has `pull.status` `ok`
