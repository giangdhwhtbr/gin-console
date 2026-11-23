# TC-UI-165: Lane not started and lane blocked

- **REQ:** REQ-UI-112@5621fb16
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** bf86584d

**Preconditions:**
- Lane `x` has two open unassigned tracks without blockers
- Lane `y` has a first open track blocked by an open bead that is not a merge gate

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `x` header shows State "Not started"
- The `y` header shows State "Blocked"
