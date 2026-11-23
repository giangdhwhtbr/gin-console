# TC-UI-105: Open a leaf

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 42a31bd6

**Preconditions:**
- Epic `e1` with task `e1.1` that has no children; the tasks of `e1` are drawn

**Steps:**
1. Open `/beads?project=p&milestone=m2&view=graph&scope=e1`
2. Open task `e1.1`

**Expected:**
- The bead page of `e1.1` is shown
