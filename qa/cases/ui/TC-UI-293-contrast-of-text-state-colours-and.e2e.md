# TC-UI-293: Contrast of text, state colours and control outlines

- **REQ:** REQ-UI-059@69731486
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 165a97fa

**Preconditions:**
- Project `P` reports one bead of each state (ready, in progress, blocked, done, deferred), one bug and the lane `be`
- Test data: the surfaces page, paper and sunk of the theme under test

**Steps:**
1. Set the light theme
2. Open `/beads?project=P&view=list`
3. Measure the contrast of the text colours, the state colours, the identity colour and carnelian against page, paper and sunk with `getComputedStyle`
4. Measure the contrast of the state glyph strokes against their surface, and the outline of the search input, a plain filter button (Status), a chosen chip (Status with a value) and "More filters" against the page
5. Set the dark theme
6. Repeat steps 2 to 4

**Expected:**
- In both themes text, the state colours, the identity colour and carnelian reach at least 4.5:1 against page, paper and sunk
- In both themes glyph strokes reach at least 3:1 against their surface
- In both themes the outline of the search input, of a plain filter button, of a chosen chip and of "More filters" reaches at least 3:1 against the page
- Priority is told by weight only: the text colour of `P0` and `P1` equals that of their row text, with no hue of its own
