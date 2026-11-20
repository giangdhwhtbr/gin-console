# TC-UI-105: Open a leaf

- **REQ:** REQ-UI-106@19fab77c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Epic `e1` with task `e1.1` that has no children; the tasks of `e1` are drawn

**Steps:**
1. Open `/beads?project=p&milestone=m2&view=graph&scope=e1`
2. Open task `e1.1`

**Expected:**
- The bead page of `e1.1` is shown
