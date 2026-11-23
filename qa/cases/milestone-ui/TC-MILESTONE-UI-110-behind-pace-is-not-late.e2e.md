# TC-MILESTONE-UI-110: Behind pace is not late

- **REQ:** REQ-MILESTONE-UI-023@b9cc99e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** f097accb

**Preconditions:**
- Project `P` has active milestone `m5` ending on 11 Dec 2026 with a forecast `finish` of 10 Dec 2026, `pace` 2.0 and `pace_needed` 3.4
- The browser clock is set to 21 Nov 2026

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/reports?project=P&tab=team&milestone=m5`

**Expected:**
- The Team headline says "behind pace"
- Nothing on the tab marks `m5` late
