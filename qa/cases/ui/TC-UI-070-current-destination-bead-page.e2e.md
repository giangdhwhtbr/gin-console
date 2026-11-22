# TC-UI-070: Current destination: Bead page

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 3d374c6a

**Preconditions:**
- Project `alpha` is stubbed with bead `a-1`

**Steps:**
1. Open `/beads/alpha/a-1`

**Expected:**
- Only the Beads link in the main navigation has `aria-current="page"`
