# TC-UI-181: Gate labels on the arrows to a lane box

- **REQ:** REQ-UI-117@8f9669e9
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 6eb1ced8

**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- Track 4 of lane qa is blocked by an open merge gate waiting for track 2 of lane be and by a closed merge gate waiting for track 3 of lane fe

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- A dashed arrow runs from the card of track 2 to the left edge of the qa box, level with the card of track 4, and carries the label "Waiting for be #2"
- An arrow runs from the card of track 3 to the left edge of the qa box and carries the label "Merged fe #3"
- Both labels are, without a border, on the surface colour and in the gap between the first and the second tier
- No node is drawn for either gate
