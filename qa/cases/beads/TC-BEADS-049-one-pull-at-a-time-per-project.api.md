# TC-BEADS-049: One pull at a time per project

- **REQ:** REQ-BEADS-016@64da543e
- **Priority:** medium

**Preconditions:**
- Project A is configured; the fake `bd dolt pull` in A takes 2 seconds and exits 0

**Steps:**
1. Send `POST /api/refresh`
2. Send a second `POST /api/refresh` without waiting for the first

**Expected:**
- Only one `bd dolt pull` ran in A
- Both refreshes answer 204
- A's `pull` is that one result
