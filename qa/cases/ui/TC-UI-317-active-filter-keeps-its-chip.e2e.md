# TC-UI-317: Controls keep their pills

- **REQ:** REQ-UI-140@50e14546
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** d3890f4c

**Preconditions:**
- Project `P` reports open and closed beads, a P1 bead among them
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=P&view=list&status=open&priority=1&milestone=all`
2. Find the Status filter chip
3. Find the button "More filters"

**Expected:**
- The Status filter is the chip `Status open ×` in the identity style
- "More filters" shows its count "1" in a tinted pill (the identity wash background)
