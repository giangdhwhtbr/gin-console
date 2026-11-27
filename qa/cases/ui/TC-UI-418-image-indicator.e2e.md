# TC-UI-418: Image indicator

- **REQ:** REQ-UI-066@8bb39188
- **Priority:** high

**Preconditions:**
- Task `t-1` of project `alpha` with `image_count` 2

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Open `/beads?project=alpha&milestone=all&view=list`

**Expected:**
- The card of `t-1` shows an image indicator with the label "2 images" and the number 2
- The list row of `t-1` shows an image indicator with the label "2 images" and the number 2
