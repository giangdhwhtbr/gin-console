# TC-UI-417: No indicator for a count of 0

- **REQ:** REQ-UI-066@8bb39188
- **Priority:** medium

**Preconditions:**
- Task `t-1` of project `alpha` with `comment_count` 0, `dependency_count` 0 and `image_count` 0

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The card of `t-1` shows no indicator
- No text "0 comments", "0 deps" or "0 images" appears
