# TC-UI-176: Merge gate node

- **REQ:** REQ-UI-116@cc779323
- **Priority:** high

**Preconditions:**
- An open merge gate waits for track 2 of lane `be` in epic `ex-e12`

**Steps:**
1. Open `/beads?project=example&view=graph&scope=ex-e12`

**Expected:**
- The gate is a node with a dashed border and a merge icon
- The node reads "Waits for be #2 to merge" and "Waiting"
