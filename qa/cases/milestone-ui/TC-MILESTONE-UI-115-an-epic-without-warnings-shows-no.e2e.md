# TC-MILESTONE-UI-115: An epic without warnings shows no verdict

- **REQ:** REQ-MILESTONE-UI-024@3324d5bb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 59f80b56

**Preconditions:**
- Milestone `M1` of project `P` has epic C without warnings

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`

**Expected:**
- C's row shows no verdict
