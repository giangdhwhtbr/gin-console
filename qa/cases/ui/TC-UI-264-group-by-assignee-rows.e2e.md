# TC-UI-264: Group by assignee rows

- **REQ:** REQ-UI-034@2aaf45c7
- **Priority:** medium

**Preconditions:**
- Project `alpha` has beads assigned to `bob`, to `alice` and to nobody

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=focus`
2. Choose Group by "Assignee"

**Expected:**
- The URL query contains `group=assignee`
- The rows are `alice`, `bob` and "Unassigned", in that order
- Each row holds the columns In flight, Blocked and Next up
