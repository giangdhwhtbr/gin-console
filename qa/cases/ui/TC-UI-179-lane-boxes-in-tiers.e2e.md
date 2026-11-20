# TC-UI-179: Lane boxes in tiers

- **REQ:** REQ-UI-117@8334c195
- **Priority:** high
**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- `gin` reports track 4 of lane qa as waiting for tracks 2 and 3 through merge gates
- The merge gates have no parent and are not tracks of the lanes

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`
2. Turn "Show closed" on

**Expected:**
- The URL has `scope=ex-e12`
- Boxes be, fe and infra are in the first tier
- The box qa is in the second tier, followed by the dashed box "No lane" in the same tier
- No node reads "Waits for"
