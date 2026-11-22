# TC-MILESTONE-UI-114: Late comes first in the verdict

- **REQ:** REQ-MILESTONE-UI-024@3324d5bb
- **Priority:** medium

**Preconditions:**
- Milestone `M1` of project `P` has epic B with the warnings `unestimated` and `late`, planned to end on 12 Nov

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`

**Expected:**
- B's verdict reads "Late: should have finished 12 Nov" after the Blocked glyph drawn in the warning colour
- B's verdict is followed by "+1"
