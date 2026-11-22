# TC-MILESTONE-UI-113: Several warnings give one verdict with a count

- **REQ:** REQ-MILESTONE-UI-024@3324d5bb
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` has epic A with the warnings `spec_due`, `open_bugs` with `count: 2` and `overflow` with `days: 2`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`
3. Rest the pointer on A's verdict

**Expected:**
- After step 2, A's verdict reads "2 working days past the end" after a dashed ring in the warning colour, followed by "+2"
- After step 3, a tooltip lists "2 working days past the end", "2 open bugs" and "Spec due before kick-off" in that order
