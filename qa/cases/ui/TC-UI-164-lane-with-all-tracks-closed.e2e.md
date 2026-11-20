# TC-UI-164: Lane with all tracks closed

- **REQ:** REQ-UI-112@e448e4ef
- **Priority:** medium

**Preconditions:**
- Lane `fe` has one track, closed

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `fe` header shows State "All tracks closed" and Tracks "1/1 closed"
- The `fe` header shows no Held by and no Lease
