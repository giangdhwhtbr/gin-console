# TC-UI-188: Merge gate chip in lane boxes

- **REQ:** REQ-UI-116@85edbd50
- **Priority:** high
**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- `gin` reports track 4 of lane qa as waiting for tracks 2 and 3 through merge gates
- An open merge gate waits for track 2 of lane be and blocks track 4

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- No node reads "Waits for be #2 to merge"
- The arrow from track 2 to the qa box carries "Waiting · be #2"
