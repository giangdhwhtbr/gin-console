# TC-UI-269: Old assignee link with an email

- **REQ:** REQ-UI-082@5a1bd944
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 825c99e2

**Preconditions:**
- Project `alpha` has a bead assigned to `alice` and a bead assigned to `alice@example.com`

**Steps:**
1. Open `/beads?project=alpha&milestone=all&view=list&assignee=alice%40example.com`

**Expected:**
- Both beads are shown
- `alice` is selected in the "Assignee" filter
