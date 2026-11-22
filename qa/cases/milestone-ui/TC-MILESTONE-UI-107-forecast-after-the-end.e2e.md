# TC-MILESTONE-UI-107: Forecast after the end

- **REQ:** REQ-MILESTONE-UI-023@b9cc99e6
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 32b11b45

**Preconditions:**
- Project `P` has active milestone `m1` ending on 1 Dec 2026 with a forecast `finish` of 16 Feb 2027, and an epic `e1` in `m1`
- The browser clock is set to 21 Nov 2026

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`
3. Open `/reports?project=P&tab=team`
4. Open `/beads/P/e1`

**Expected:**
- After step 2, the row of `m1` marks it late and its finish "Finishes 16 Feb 2027" is in the warning color
- After step 3, the Team tab marks `m1` late and its status reads "Active, late"
- After step 4, the milestone card of `e1` marks `m1` late
