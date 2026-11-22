# TC-UI-318: Current place uses the identity colour

- **REQ:** REQ-UI-141@008ef200
- **Priority:** high

**Preconditions:**
- Project `P` reports a bead `ex-e3` (epic) shown in the Beads List
- The window is 1440px wide

**Steps:**
1. Open `/beads?project=P&view=list&bead=ex-e3`
2. Read the sidebar item "Beads"
3. Read the row of `ex-e3`

**Expected:**
- The "Beads" sidebar item has a 3px bar on its left edge in the identity colour (amethyst) and its icon in the identity colour
- The row of `ex-e3` has a pale identity wash as background and a 3px bar in the identity colour inside its left edge
- The other sidebar items and rows have neither
