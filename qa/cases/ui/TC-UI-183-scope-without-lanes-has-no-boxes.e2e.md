# TC-UI-183: Scope without lanes has no boxes

- **REQ:** REQ-UI-117@d860e924
- **Priority:** medium

**Preconditions:**
- Epic `ex-e3` has tracks without a lane

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e3`

**Expected:**
- The nodes are drawn in layers, with no lane box
- The switch "Only linked" is offered
