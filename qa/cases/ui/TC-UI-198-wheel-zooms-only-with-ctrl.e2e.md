# TC-UI-198: Wheel zooms only with Ctrl

- **REQ:** REQ-UI-077@703ea43a
- **Priority:** medium

**Preconditions:**
- The Graph view of `ex-e12` with "Show closed" on at 1920x1080

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1`
2. Put the pointer over the canvas
3. Turn the wheel with `Ctrl` held
4. Turn the wheel down without `Ctrl`

**Expected:**
- After step 3 the scale changes
- After step 4 the scale stays the same and the page scrolls
