# TC-UI-221: Wheel over the Graph tab of an epic

- **REQ:** REQ-UI-122@b50bc21c
- **Priority:** medium

**Preconditions:**
- Project `example` has epic `ex-e12` with lanes be, fe, infra and qa, and two tracks without a lane
- The window is 1440x900 and the page is taller than the window

**Steps:**
1. Open `/beads/example/ex-e12?tab=graph&closed=1`
2. Put the pointer over a lane box
3. Turn the wheel down

**Expected:**
- The page scrolls down
- The canvas has no vertical scroll bar
