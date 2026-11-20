# TC-UI-177: Dependencies of a track show merge gates

- **REQ:** REQ-UI-116@cc779323
- **Priority:** medium

**Preconditions:**
- Track 4 is blocked by an open merge gate waiting for track 2 of lane `be` and a closed merge gate waiting for track 3 of lane `fe`

**Steps:**
1. Open the bead page of track 4

**Expected:**
- The Dependencies read "Waits for be #2 · merge pending"
- The Dependencies read "Waits for fe #3 · merged"
