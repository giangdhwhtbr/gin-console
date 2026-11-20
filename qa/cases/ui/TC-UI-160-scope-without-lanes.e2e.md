# TC-UI-160: Scope without lanes

- **REQ:** REQ-UI-111@d8deca93
- **Priority:** medium

**Preconditions:**
- Epic `ex-e3` of the example project has no child with a lane

**Steps:**
1. Open `/beads?project=example&view=lanes&scope=ex-e3`

**Expected:**
- The view says "Lanes show for an epic whose tracks have lanes"
- The message has a link to the Graph view
