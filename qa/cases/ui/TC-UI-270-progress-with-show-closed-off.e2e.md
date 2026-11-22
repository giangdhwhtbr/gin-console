# TC-UI-270: Progress with show closed off

- **REQ:** REQ-UI-130@14444aa5
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 48d775c8

**Preconditions:**
- Project `alpha` has epic `e-1` with 5 tracks, 3 of them closed
- "Show closed" is off

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list`
2. Open `/beads?project=alpha&milestone=all&view=graph`

**Expected:**
- After step 1 the row of `e-1` shows the strand followed by "3/5"
- After step 2 the node of `e-1` shows the strand followed by "3/5"
