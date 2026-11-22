# TC-UI-269: Old assignee link with an email

- **REQ:** REQ-UI-082@5a1bd944
- **Priority:** medium

**Preconditions:**
- Project `alpha` has a bead assigned to `alice` and a bead assigned to `alice@example.com`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list&assignee=alice%40example.com`

**Expected:**
- Both beads are shown
- `alice` is selected in the "Assignee" filter
