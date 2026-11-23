# TC-MILESTONE-UI-116: Rows have the same height whatever the warnings

- **REQ:** REQ-MILESTONE-UI-024@3324d5bb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** fcf674ce

**Preconditions:**
- Milestone `M1` of project `P` has epic D with 5 warnings and epic E with 1 warning

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`
3. Measure the height of the rows of D and E

**Expected:**
- The rows of D and E have the same height
