# TC-BEADS-046: No remote

- **REQ:** REQ-BEADS-016@64da543e
- **Priority:** medium

**Preconditions:**
- Project A is configured; the fake `bd dolt pull` in A exits 1 with "Error: fetch from origin/main: Error 1105: no remote"

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects`

**Expected:**
- A has `pull.status` `no_remote`
