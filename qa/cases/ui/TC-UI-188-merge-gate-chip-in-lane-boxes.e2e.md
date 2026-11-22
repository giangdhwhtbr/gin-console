# TC-UI-188: Merge gate label in lane boxes

- **REQ:** REQ-UI-116@f93f8f82
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 9c853bdb

**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- Track 4 of lane qa is blocked by an open merge gate waiting for track 2 of lane be and by a closed merge gate waiting for track 3 of lane fe

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- No node reads "Waits for be #2 to merge"
- The arrow from track 2 to the qa box carries the label "Waiting for be #2"
