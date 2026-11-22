# TC-UI-319: Focus ring is in the identity colour

- **REQ:** REQ-UI-141@008ef200
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** c13376cb

**Preconditions:**
- Project `P` reports at least one bead

**Steps:**
1. Open `/beads?project=P&view=list`
2. Press Tab until a link has keyboard focus
3. Read the computed outline or box-shadow of the focused link

**Expected:**
- The focus ring of the link is drawn in the identity colour (amethyst) of the theme
