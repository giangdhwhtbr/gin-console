# TC-BEADS-046: No remote

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-46-49-api
- **Checked:** 5ef9f733

**Preconditions:**
- Project A is configured; the fake `bd dolt pull` in A exits 1 with "Error: fetch from origin/main: Error 1105: no remote"

**Steps:**
1. Send `POST /api/refresh`
2. Request `GET /api/projects/beads`

**Expected:**
- A has `pull.status` `no_remote`
