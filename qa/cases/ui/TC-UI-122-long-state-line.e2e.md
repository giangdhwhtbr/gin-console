# TC-UI-122: Long state line

- **REQ:** REQ-UI-049@6d58db62
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-18T15-52-57

**Preconditions:**
- Project `alpha` has an in-progress epic `e-1` without a parent with 2 of 5 tracks done and a title of 80 characters, and epic `e-2` blocked by `e-1`, so Only linked draws `e-1`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=graph&closed=1`

**Expected:**
- The id, the title and the state of the node `e-1` each take one line inside the node
- "2 of 5 done" is shown in full
