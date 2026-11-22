# TC-UI-059: Epic with a prep task

- **REQ:** REQ-UI-044@f10aa6dd
- **Priority:** high

**Preconditions:**
- Epic `e-1` in project `alpha` has track `t-1` (closed), track `t-2` (open) and prep task `p-1` (open) labelled `prep` and `prep:mockup`

**Steps:**
1. Open `/beads?project=alpha&milestone=all`
2. Turn on "Show closed"
3. Click the open control of `e-1`

**Expected:**
- The row of `e-1` says "1/2 closed" with a progress bar and "Prep 0/1"
- The row of `p-1` shows a "Prep" chip
- The rows of `t-1` and `t-2` show no "Prep" chip
