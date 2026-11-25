# TC-UI-070: Current destination: Bead page

- **REQ:** REQ-UI-057@f37002dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 8599af9a

**Preconditions:**
- Project `alpha` is stubbed with bead `a-1`

**Steps:**
1. Open `/beads/alpha/a-1`

**Expected:**
- Only the Beads link in the main navigation has `aria-current="page"`
