# TC-UI-176: Merge gate node

- **REQ:** REQ-UI-116@85edbd50
- **Priority:** high

**Preconditions:**
- The merge gate `ex-g3` is closed, has no parent and waits for track 3 of lane `fe`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph`
2. Turn "Show closed" on

**Expected:**
- The gate `ex-g3` is a node with a dashed border and a merge icon
- The node reads "Waits for fe #3 to merge" and "Merged"
