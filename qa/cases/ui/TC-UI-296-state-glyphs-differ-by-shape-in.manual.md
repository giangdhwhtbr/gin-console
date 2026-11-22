# TC-UI-296: State glyphs differ by shape in grayscale

- **REQ:** REQ-UI-064@2505c50e
- **Priority:** low

**Preconditions:**
- Project `P` reports a ready task `p-r`, an in-progress task `p-i`, a done task `p-d`, a blocked task `p-b` and a deferred task `p-f`
- "Show closed" is on, so the done task shows

**Steps:**
1. Open `/beads?project=P&view=list&closed=1`
2. Turn the display to grayscale (browser dev tools rendering emulation or the operating system colour filter)
3. Look at the glyph of each of the five rows

**Expected:**
- The ready row shows a hollow ring
- The in-progress row shows a ring with its right half filled
- The done row shows a full bead
- The blocked row shows a full bead crossed by a short bar (a knot)
- The deferred row shows a dashed ring
- The five glyphs are told apart by shape alone
