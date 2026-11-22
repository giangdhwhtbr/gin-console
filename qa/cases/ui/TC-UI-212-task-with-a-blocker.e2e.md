# TC-UI-212: Task with a blocker

- **REQ:** REQ-UI-053@b16b5ec1
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9109a593

**Preconditions:**
- Project `p` has task `t-2` of epic `e-1` with one blocker

**Steps:**
1. Open `/beads/p/t-2`

**Expected:**
- The primary button "View in graph" links to `/beads?project=p&view=graph&scope=e-1&select=t-2`
