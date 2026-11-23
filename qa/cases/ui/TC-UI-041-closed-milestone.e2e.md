# TC-UI-041: Closed milestone

- **REQ:** REQ-UI-104@8a28fc31
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 45079245

**Preconditions:**
- Project `alpha` with closed milestone `m1` whose beads are all closed, active milestone `m2`, and `Show closed` off

**Steps:**
1. Open `/beads?project=alpha`
2. Open the Milestone chip and choose `radio "<title of m1>"` in `radiogroup "Milestone"`

**Expected:**
- The beads are requested with `closed=1`
- The closed beads of `m1` are shown
