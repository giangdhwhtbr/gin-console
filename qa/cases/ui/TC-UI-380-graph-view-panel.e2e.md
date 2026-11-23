# TC-UI-380: Graph view panel

- **REQ:** REQ-UI-053@54371a3e
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 5f359c98

**Preconditions:**
- Project `p` has the epic `e-1` with the task `t-1` titled "Task one", which has a child `t-1.1`
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph&scope=e-1&select=t-1`
2. Look at the details panel of `t-1`

**Expected:**
- The details panel shows `t-1` and offers `button "Show children"`
- There is no "View in graph" in the panel
