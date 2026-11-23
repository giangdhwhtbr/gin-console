# TC-UI-197: Fit a wide graph

- **REQ:** REQ-UI-077@b6e1715d
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** c7edfc22

**Preconditions:**
- The Graph view of `ex-e12` with "Show closed" on at 390x844; the graph is wider than the canvas

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e12&closed=1`
2. Press "Fit to view"

**Expected:**
- After step 1 the whole width of the graph is visible and the scale reads below 100%
- After step 2 the whole width of the graph is visible and the scale reads below 100%
