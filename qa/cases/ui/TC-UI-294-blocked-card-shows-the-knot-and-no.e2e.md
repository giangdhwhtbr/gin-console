# TC-UI-294: Blocked card shows the knot and no coloured edge

- **REQ:** REQ-UI-064@2505c50e
- **Priority:** medium

**Preconditions:**
- Project `P` reports a blocked task `p-1` titled "Blocked work" (open, with an open blocker `p-0`)

**Steps:**
1. Open `/beads?project=P&view=board`
2. Find the card of `p-1`

**Expected:**
- The card shows "Blocked" after the knot glyph (a full bead crossed by a short bar)
- The glyph is in the amber of the theme
- The card has no coloured left edge: its border-left colour equals its other border colours
