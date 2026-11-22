# TC-UI-183: Scope without lanes has no boxes

- **REQ:** REQ-UI-117@8f9669e9
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 54333fa3

**Preconditions:**
- Epic `ex-e3` has tracks without a lane

**Steps:**
1. Open `/beads?project=example&milestone=all&view=graph&scope=ex-e3`

**Expected:**
- The nodes are drawn in layers, with no lane box
- The switch "Only linked" is offered
