# TC-UI-161: Running lane with a lease

- **REQ:** REQ-UI-112@5621fb16
- **Priority:** high

**Preconditions:**
- Lane `be` has track 1 closed and track 2 `in_progress`, both assigned to `ann`
- Track 2 has a `claim` expiring tomorrow at 16:00

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `be` header shows State "Running", Held by `ann`, Lease "until <tomorrow> 16:00" and Tracks shows the strand with "1/2"
