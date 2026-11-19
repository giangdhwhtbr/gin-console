# TC-UI-054: Epic with a prep task

- **REQ:** REQ-UI-028@286b7a7b
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has track `t-1` (closed), track `t-2` (open) and prep task `p-1` (closed) labelled `prep` and `prep:mockup`

**Steps:**
1. Open `/beads/alpha/e-1`

**Expected:**
- The progress bar reads 1 of 2
- "Prep 1/1" is shown next to the progress bar
- The children list shows `t-1`, `t-2` and `p-1`
- A "Prep" chip is shown on `p-1` only
