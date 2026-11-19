# TC-MILESTONE-UI-103: Tail title stops at the end line

- **REQ:** REQ-MILESTONE-UI-013@50a2ef46
- **Priority:** low

**Preconditions:**
- Milestone `M1` of project `P` has an epic whose bar ends 60 px before the milestone end line and whose title is longer than 60 px

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/M1`

**Expected:**
- The title after the bar ends with an ellipsis before the end line
