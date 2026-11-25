# TC-UI-385: Next command on a ready task and its copy

- **REQ:** REQ-UI-151@b4c85eae
- **Priority:** high

**Preconditions:**
- the signed-in email `ann@x.com` (localStorage `gin-console.email`)
- Project `P`; ready task `t-1` has no assignee; the page is `/beads/P/t-1`
- The browser may read and write the clipboard

**Test data:**
- `t-1` blocks `t-2`, so the header offers "View in graph"

**Steps:**
1. Open `/beads/P/t-1`
2. Click "Copy" in the header

**Expected:**
- After step 1 the header shows "Next", the command `gin task update t-1 --claim` and a Copy button, above the "View in graph" link
- After step 2 the clipboard holds `gin task update t-1 --claim`
- The button reads "Copied" and goes back to "Copy" by itself
