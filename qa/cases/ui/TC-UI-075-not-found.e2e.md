# TC-UI-075: Not found

- **REQ:** REQ-UI-075@b0eb7f1a
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 4bc9ffbf

**Preconditions:**
- Project `alpha` has no bead `x-1`

**Steps:**
1. Open `/beads/alpha/x-1/graph`

**Expected:**
- The page says "Bead not found"
- The page links to the Beads page
