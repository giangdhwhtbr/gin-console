# TC-UI-189: No lane box with dependencies

- **REQ:** REQ-UI-117@d860e924
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has lane be (tracks 1 and 2), lane fe (track 3) and tracks 7 and 8 without a lane
- `bd` reports track 7 (no lane) blocked by track 2, and track 3 blocked by track 8 (no lane)

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The "No lane" box is in the tier after the be box
- An arrow runs from the card of track 2 to the top edge of the "No lane" box
- Another arrow runs from the card of track 8 to the top edge of the fe box
