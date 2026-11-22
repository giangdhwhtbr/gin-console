# TC-UI-164: Lane with all tracks closed

- **REQ:** REQ-UI-112@5621fb16
- **Priority:** medium

**Preconditions:**
- Lane `fe` has one track, closed

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `fe` header shows State "All tracks closed" and Tracks shows the strand with "1/1"
- The `fe` header shows no Held by and no Lease
