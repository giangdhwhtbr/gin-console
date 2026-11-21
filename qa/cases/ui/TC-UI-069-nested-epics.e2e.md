# TC-UI-069: Nested epics

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** medium

**Preconditions:**
- Epic `r` in project `alpha` has child epics `e-1` and `e-2`, each with tasks

**Steps:**
1. Open `/beads/alpha/r/graph`

**Expected:**
- The page of `r` is shown at `/beads/alpha/r?tab=graph`
- `e-1` and `e-2` are nodes and their tasks are not
