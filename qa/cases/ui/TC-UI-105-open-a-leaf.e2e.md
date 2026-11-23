# TC-UI-105: Open a leaf

- **REQ:** REQ-UI-106@9683653c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 8a9cf4c7

**Preconditions:**
- Epic `e1` with task `e1.1` that has no children; the tasks of `e1` are drawn

**Steps:**
1. Open `/beads?project=p&milestone=m2&view=graph&scope=e1`
2. Double-click the node of task `e1.1`

**Expected:**
- The bead page of `e1.1` is shown
