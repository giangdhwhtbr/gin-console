# TC-BEADS-084: No next command for a merge gate or a milestone

- **REQ:** REQ-BEADS-025@3250396f
- **Priority:** medium

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P` has a merge gate `g-1` (it waits for track 2 of plan `p`) and a milestone `m-1`

**Steps:**
1. Open `/beads/P/g-1`
2. Open `/beads/P/m-1`

**Expected:**
- The header of the merge gate shows no next command
- The header of the milestone shows no next command
