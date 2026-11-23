# TC-UI-070: Current destination: Bead page

- **REQ:** REQ-UI-057@e16f2d59
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** ccfc64dc

**Preconditions:**
- Project `alpha` is stubbed with bead `a-1`

**Steps:**
1. Open `/beads/alpha/a-1`

**Expected:**
- Only the Beads link in the main navigation has `aria-current="page"`
