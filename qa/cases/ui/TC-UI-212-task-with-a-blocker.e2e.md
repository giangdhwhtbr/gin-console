# TC-UI-212: Task with a blocker

- **REQ:** REQ-UI-053@54371a3e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 42d4411b

**Preconditions:**
- Project `p` has task `t-2` of epic `e-1` with one blocker

**Steps:**
1. Open `/beads/p/t-2`

**Expected:**
- The primary button "View in graph" links to `/beads?project=p&view=graph&scope=e-1&select=t-2`
