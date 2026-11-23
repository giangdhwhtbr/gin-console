# TC-UI-099: Off inside a bead

- **REQ:** REQ-UI-081@e4288672
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** db21761d

**Preconditions:**
- Project `p` with an epic `e-1` that has an unlinked task

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph&scope=e-1`

**Expected:**
- The unlinked task is drawn
- "Only linked" is off
