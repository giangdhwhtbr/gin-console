# TC-UI-184: Arrow keys move between lane boxes

- **REQ:** REQ-UI-117@280e2ec2
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- Track 4 of lane qa is blocked by an open merge gate waiting for track 2 of lane be and by a closed merge gate waiting for track 3 of lane fe
- An arrow leads from track 2 to track 4 through the open merge gate

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Focus the card of track 2 in the be box
3. Press Arrow Right
4. Press Enter

**Expected:**
- After step 3 the focus moves from the last card of the be box across the tiers to the card of track 4 in the qa box on the right
- After step 4 track 4 is selected and the details panel shows it
