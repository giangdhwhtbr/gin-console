# TC-UI-276: Dependency indicator tooltip

- **REQ:** REQ-UI-132@87ad72f4
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** af71a798

**Preconditions:**
- Project `alpha` has task `t-1` with 2 dependencies

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Rest the pointer on the dependency indicator 2 of the card of `t-1`

**Expected:**
- A tooltip says what the 2 dependencies are
- The indicator has no `title` attribute
