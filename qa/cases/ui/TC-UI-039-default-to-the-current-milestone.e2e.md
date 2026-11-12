# TC-UI-039: Default to the current milestone

- **REQ:** REQ-UI-104@3cd94953
- **Priority:** high

**Preconditions:**
- Project `alpha` whose current milestone is `m2`, with open beads under `m2`, open beads under planned milestone `m3`, and one open bead under no milestone

**Steps:**
1. Open `/beads?project=alpha`

**Expected:**
- Only the beads under `m2` are shown
- The Milestone select shows `m2`
