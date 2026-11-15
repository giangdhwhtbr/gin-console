# TC-UI-113: Full card

- **REQ:** REQ-UI-065@15f2bcc9
- **Priority:** medium

**Preconditions:**
- Project `alpha` has ready P1 task `t-1` of type task, assigned to `alice`, with 2 comments and 1 dependency

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The card of `t-1` shows the id and `P1`, the title link, "Ready", the type "task", a comment indicator 2, a dependency indicator 1 and `alice`
