# TC-UI-184: Arrow keys move between lane boxes

- **REQ:** REQ-UI-117@8334c195
- **Priority:** medium
**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- `gin` reports track 4 of lane qa as waiting for tracks 2 and 3 through merge gates
- Track 4 is the nearest card in the tier below track 2

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Focus the card of track 2 in the be box
3. Press Arrow Down

**Expected:**
- The focus moves to the card of track 4 in the qa box
- Track 4 is selected and the details panel shows it
