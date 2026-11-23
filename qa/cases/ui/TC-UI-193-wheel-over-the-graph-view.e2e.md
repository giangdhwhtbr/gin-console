# TC-UI-193: Wheel over the Graph view

- **REQ:** REQ-UI-122@b50bc21c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 6729a42d

**Preconditions:**
- Epic `ex-e12` has lanes be (tracks 1 and 2), fe (track 3), infra (tracks 5 and 6) and qa (track 4), and two tracks without a lane
- The window is 1440x900, and the page is taller than the window

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1`
2. Put the pointer over a lane box
3. Turn the wheel down

**Expected:**
- The page scrolls down
- The canvas does not scroll vertically
