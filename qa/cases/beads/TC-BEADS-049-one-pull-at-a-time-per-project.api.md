# TC-BEADS-049: One pull at a time per project

- **REQ:** REQ-BEADS-016@ea0e7f1e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-32-23-api
- **Checked:** 3bf611bb

**Preconditions:**
- Project A is configured; the fake `bd dolt pull` in A takes 2 seconds and exits 0

**Steps:**
1. Send `POST /api/refresh`
2. Send a second `POST /api/refresh` without waiting for the first

**Expected:**
- Only one `bd dolt pull` ran in A
- Both refreshes answer 204
- A's `pull` is that one result
