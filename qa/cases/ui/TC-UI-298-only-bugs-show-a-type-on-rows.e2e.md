# TC-UI-298: Only bugs show a type on rows

- **REQ:** REQ-UI-067@e9f2261b
- **Priority:** medium

**Preconditions:**
- Project `P` reports an epic `p-e`, a bug `p-b`, a feature `p-f` and a task `p-t`

**Steps:**
1. Open `/beads?project=P&view=list`
2. Read the row of each of the four beads

**Expected:**
- Only the row of `p-b` shows a type: the word "bug" in the carnelian of the theme
- The word "bug" has no border and no background colour
- The rows of `p-e`, `p-f` and `p-t` show no type word ("epic", "feature", "task")
- No row contains a pill
