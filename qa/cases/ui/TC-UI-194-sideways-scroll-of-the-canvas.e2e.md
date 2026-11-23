# TC-UI-194: Sideways scroll of the canvas

- **REQ:** REQ-UI-122@b50bc21c
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 883b1b54

**Preconditions:**
- The Graph view of `ex-e12` with "Show closed" on at 390x844 is wider than the window

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1`
2. Scroll sideways over the canvas

**Expected:**
- The canvas moves sideways
- The page does not move
