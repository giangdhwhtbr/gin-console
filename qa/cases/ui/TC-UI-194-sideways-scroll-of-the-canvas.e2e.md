# TC-UI-194: Sideways scroll of the canvas

- **REQ:** REQ-UI-122@f659be50
- **Priority:** low

**Preconditions:**
- A project whose Graph view is wider than the window, such as `ex-e12` with "Show closed" on at 390x844

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1`
2. Scroll sideways over the canvas

**Expected:**
- The canvas moves sideways
- The page does not move
