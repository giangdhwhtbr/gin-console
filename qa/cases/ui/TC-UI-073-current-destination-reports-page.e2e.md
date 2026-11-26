# TC-UI-073: Current destination: Reports page

- **REQ:** REQ-UI-057@f37002dd
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-25T17-32-34
- **Checked:** d33995fb

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/reports?project=alpha`

**Expected:**
- Only the Reports link in the main navigation has `aria-current="page"`
