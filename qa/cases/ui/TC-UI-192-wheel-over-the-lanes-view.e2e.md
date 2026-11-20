# TC-UI-192: Wheel over the Lanes view

- **REQ:** REQ-UI-122@f659be50
- **Priority:** medium

**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- The window is 1440x900

**Steps:**
1. Open `/beads?project=example&milestone=all&view=lanes&scope=ex-e12`
2. Scroll the page to the top
3. Put the pointer over the cards
4. Turn the wheel down

**Expected:**
- The page scrolls down
- The canvas has no vertical scroll bar and its scroll position stays at the top
