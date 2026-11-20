# TC-UI-190: Lanes in a loop

- **REQ:** REQ-UI-117@d860e924
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has lane x (track 1) and lane y (track 2)
- `bd` reports track 1 blocked by track 2 and track 2 blocked by track 1

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- Boxes x and y are in the same tier
- Both arrows run in the channel to the right of the boxes
- The cycle warning names x and y
