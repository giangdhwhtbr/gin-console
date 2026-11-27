# TC-UI-052: Relations link inside the console

- **REQ:** REQ-UI-028@5c612d02
- **Priority:** medium

**Preconditions:**
- Bead `b-2` in project `alpha` has one dependency, bead `b-1` titled `First`, with status `open`

**Steps:**
1. Open `/beads/alpha/b-2`

**Expected:**
- The dependency shows `b-1`, `First` and `open`
- The dependency links to `/beads/alpha/b-1`
