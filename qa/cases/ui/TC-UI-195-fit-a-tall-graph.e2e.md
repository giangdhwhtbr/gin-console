# TC-UI-195: Fit a tall graph

- **REQ:** REQ-UI-077@703ea43a
- **Priority:** medium

**Preconditions:**
- A graph narrower than the canvas and taller than the window, such as `ex-e12` with "Show closed" on and six more tracks without a lane, at 1920x1080 (the Graph of `ex-e12` alone fits that window)

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1`
2. Press "Fit to view"

**Expected:**
- The scale reads 100%
- The page scrolls to show the rest of the graph
