# TC-UI-076: Current destination: Change page

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 0cab7e6f

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/`
2. Click the "Reports" link in the main navigation

**Expected:**
- Only the Reports link in the main navigation has `aria-current="page"`
