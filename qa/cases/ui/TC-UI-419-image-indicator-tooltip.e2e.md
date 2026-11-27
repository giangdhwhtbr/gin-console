# TC-UI-419: Image indicator tooltip

- **REQ:** REQ-UI-132@a6b1922c
- **Priority:** medium

**Preconditions:**
- Task `t-1` of project `alpha` with `image_count` 2

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`
2. Rest the pointer on the image indicator 2 of the card of `t-1`

**Expected:**
- A tooltip says that it counts the screenshots of the bead that this console can show: files on the console host and attachments in the shared store
- The indicator has no `title` attribute
