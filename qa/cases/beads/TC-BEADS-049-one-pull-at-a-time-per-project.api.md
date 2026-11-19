# TC-BEADS-049: One pull at a time per project

- **REQ:** REQ-BEADS-016@64da543e
- **Priority:** medium

**Preconditions:**
- Project A is configured; a pull of A is running (the fake `bd dolt pull` is held open)

**Steps:**
1. Start a second pull of A while the first is running (`POST /api/refresh`)
2. Let the fake `bd dolt pull` finish

**Expected:**
- The second pull waited for the first and took its result
- Only one `bd dolt pull` ran in A
