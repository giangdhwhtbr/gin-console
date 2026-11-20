# TC-UI-191: No chip inside a lane box

- **REQ:** REQ-UI-115@ef4a2116
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has lane be with tracks 1 and 2, and track 2 is `ex-e12.2`

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12`

**Expected:**
- The card of track 2 sits in the box headed "be"
- The card of track 2 has no chip with the title "Lane be"
