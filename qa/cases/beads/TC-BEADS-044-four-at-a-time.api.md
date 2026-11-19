# TC-BEADS-044: Four at a time

- **REQ:** REQ-BEADS-016@64da543e
- **Priority:** medium

**Preconditions:**
- Six projects are configured; the fake `bd dolt pull` takes a moment in each and records how many runs overlap

**Steps:**
1. Send `POST /api/refresh`

**Expected:**
- No more than four `bd dolt pull` processes ran at the same time
- All six projects were pulled
