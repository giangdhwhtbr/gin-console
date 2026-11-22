# TC-UI-114: Bare card

- **REQ:** REQ-UI-065@ca703482
- **Priority:** low
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** e366aa8f

**Preconditions:**
- Project `alpha` has task `t-2` with owner `lead@example.com`, no assignee, no comments and no dependencies

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=board`

**Expected:**
- The last line of the card of `t-2` shows only the state and "Unassigned" in the muted color
