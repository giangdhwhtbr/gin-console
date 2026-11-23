# TC-UI-162: Lane waiting for another lane

- **REQ:** REQ-UI-112@5621fb16
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 95d0cebd

**Preconditions:**
- Lane `qa` has one track, open and unassigned, blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e12`

**Expected:**
- The `qa` header shows State "Waiting for be", Held by "Unclaimed" and Tracks shows the strand with "0/1"
