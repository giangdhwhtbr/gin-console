# TC-UI-266: Group by assignee back to none

- **REQ:** REQ-UI-034@2aaf45c7
- **Priority:** low

**Preconditions:**
- Project `alpha` has beads assigned to `alice` and to `bob`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=focus&group=assignee`
2. Choose Group by "None"

**Expected:**
- The ungrouped columns In flight, Blocked and Next up return
- The URL query has no `group`
