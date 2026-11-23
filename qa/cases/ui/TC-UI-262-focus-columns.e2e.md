# TC-UI-262: Focus columns

- **REQ:** REQ-UI-033@51749fbd
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 17e1a3c9

**Preconditions:**
- Project `alpha` has an in-progress bead, a blocked bead, a ready P1 bead and a ready P3 bead

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=focus`

**Expected:**
- The columns In flight, Blocked and Next up each hold one bead
- The ready P3 bead is in no column
