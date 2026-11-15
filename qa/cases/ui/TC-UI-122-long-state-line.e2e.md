# TC-UI-122: Long state line

- **REQ:** REQ-UI-049@24a50bbd
- **Priority:** medium

**Preconditions:**
- Project `alpha` has an in-progress epic `e-1` without a parent with 2 of 5 tracks done and a title of 80 characters

**Steps:**
1. Open `/beads/alpha/graph`

**Expected:**
- The id, the title and the state of the node `e-1` each take one line inside the node
- "2 of 5 done" is shown in full
