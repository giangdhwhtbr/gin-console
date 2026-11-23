# TC-UI-164: Lane with all tracks closed

- **REQ:** REQ-UI-112@5621fb16
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 71a453c1

**Preconditions:**
- Lane `fe` has one track, closed

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `fe` header shows State "All tracks closed" and Tracks shows the strand with "1/1"
- The `fe` header shows no Held by and no Lease
