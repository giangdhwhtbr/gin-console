# TC-UI-073: Current destination: Reports page

- **REQ:** REQ-UI-057@519df087
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 179ac7b7

**Preconditions:**
- Project `alpha` is stubbed

**Steps:**
1. Open `/reports?project=alpha`

**Expected:**
- Only the Reports link in the main navigation has `aria-current="page"`
