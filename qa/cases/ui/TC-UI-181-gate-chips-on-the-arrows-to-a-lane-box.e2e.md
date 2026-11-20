# TC-UI-181: Gate chips on the arrows to a lane box

- **REQ:** REQ-UI-117@11c49b18
- **Priority:** high

**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- Track 4 of lane qa is blocked by an open merge gate waiting for track 2 of lane be and by a closed merge gate waiting for track 3 of lane fe

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- A dashed arrow runs from the card of track 2 to the top edge of the qa box and carries "Waiting · be #2"
- An arrow runs from the card of track 3 to the top edge of the qa box and carries "Merged · fe #3"
- No node is drawn for either gate
