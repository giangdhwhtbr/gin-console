# TC-UI-162: Lane waiting for another lane

- **REQ:** REQ-UI-112@e448e4ef
- **Priority:** high

**Preconditions:**
- Lane `qa` has one track, open and unassigned, blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `qa` header shows State "Waiting for be", Held by "Unclaimed" and Tracks "0/1 closed"
