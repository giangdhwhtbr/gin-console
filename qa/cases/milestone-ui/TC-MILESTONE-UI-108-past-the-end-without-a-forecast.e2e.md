# TC-MILESTONE-UI-108: Past the end without a forecast

- **REQ:** REQ-MILESTONE-UI-023@b9cc99e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 13156c3f

**Preconditions:**
- Project `P` has active milestone `m2` ending on 20 Nov 2026 with no forecast `finish`
- The browser clock is set to 21 Nov 2026

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=P&tab=team`

**Expected:**
- The Team tab marks `m2` late and its status reads "Active, late" with a warning mark
