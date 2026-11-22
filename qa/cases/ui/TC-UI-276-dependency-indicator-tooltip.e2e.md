# TC-UI-276: Dependency indicator tooltip

- **REQ:** REQ-UI-132@75ded0c7
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** df8be679

**Preconditions:**
- Project `alpha` has task `t-1` with 2 dependencies

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Rest the pointer on the dependency indicator 2 of the card of `t-1`

**Expected:**
- A tooltip says what the 2 dependencies are
- The indicator has no `title` attribute
