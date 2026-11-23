# TC-UI-259: Board pinned bead

- **REQ:** REQ-UI-031@5fa5ec1b
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** ac09f7b8

**Preconditions:**
- Project `alpha` has a pinned bead that is not ready, blocked or closed

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- After step 1 the bead is in no column
- After step 2 the List still shows the bead
