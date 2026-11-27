# TC-UI-419: Image indicator tooltip

- **REQ:** REQ-UI-132@87ad72f4
- **Priority:** medium

**Preconditions:**
- Task `t-1` of project `alpha` with `image_count` 2

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Rest the pointer on the image indicator 2 of the card of `t-1`

**Expected:**
- A tooltip says that it counts the screenshots the bead names that exist on the console host
- The indicator has no `title` attribute
