# TC-UI-073: Current destination: Reports page

- **REQ:** REQ-UI-057@92e2ae1c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** edb9f00a

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/reports?project=alpha`

**Expected:**
- Only the Reports link in the main navigation has `aria-current="page"`
