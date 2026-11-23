# TC-UI-286: Owner is not the assignee

- **REQ:** REQ-UI-044@5e9715e5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 86ed12e2

**Preconditions:**
- Project `alpha` has bead `t-1` with owner `lead@example.com` and no assignee
- The browser window is 1440px wide

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- The row of `t-1` shows "Unassigned"
- The row of `t-1` does not show `lead@example.com`
