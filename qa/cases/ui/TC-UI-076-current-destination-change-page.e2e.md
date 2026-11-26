# TC-UI-076: Current destination: Change page

- **REQ:** REQ-UI-057@f37002dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** 8944efb8

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/beads?project=alpha`
2. Click the "Reports" link in the main navigation

**Expected:**
- Only the Reports link in the main navigation has `aria-current="page"`
