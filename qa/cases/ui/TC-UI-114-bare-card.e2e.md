# TC-UI-114: Bare card

- **REQ:** REQ-UI-065@15f2bcc9
- **Priority:** low

**Preconditions:**
- Project `alpha` has task `t-2` with no assignee, no comments and no dependencies

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The last line of the card of `t-2` shows only the state and the type
