# TC-UI-416: Comment indicator

- **REQ:** REQ-UI-066@8bb39188
- **Priority:** medium

**Preconditions:**
- Task `t-1` of project `alpha` with `comment_count` 3

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The card of `t-1` shows a comment indicator with the label "3 comments" and the number 3
