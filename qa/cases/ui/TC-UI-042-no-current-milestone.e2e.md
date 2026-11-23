# TC-UI-042: No current milestone

- **REQ:** REQ-UI-104@8a28fc31
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 135fab36

**Preconditions:**
- Project `alpha` whose milestones are all closed, with open beads under no milestone

**Steps:**
1. Open `/beads?project=alpha`

**Expected:**
- `All` is in effect: the filter is `button "Milestone"` without a value and there is no Milestone chip
- Every open bead is shown
