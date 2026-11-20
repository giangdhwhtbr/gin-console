# TC-UI-181: Gate chips on the arrows to a lane box

- **REQ:** REQ-UI-117@8334c195
- **Priority:** high
**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- `gin` reports track 4 of lane qa as waiting for tracks 2 and 3 through merge gates
- The merge gate waiting for track 2 of lane be is open; the one waiting for track 3 of lane fe is closed
- Both gates block track 4

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- A dashed arrow runs from the card of track 2 to the top edge of the qa box and carries "Waiting · be #2"
- An arrow runs from the card of track 3 to the top edge of the qa box and carries "Merged · fe #3"
- No node is drawn for either gate
