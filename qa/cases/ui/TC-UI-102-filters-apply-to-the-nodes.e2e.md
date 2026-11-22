# TC-UI-102: Filters apply to the nodes

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T16-37-01
- **Checked:** 33e16b6b

**Preconditions:**
- Epic `e1` with a task assigned to `bao`, and epic `e2` with no bead assigned to `bao`

**Steps:**
1. Open `/beads?project=p&milestone=all&view=graph&assignee=bao`

**Expected:**
- `e1` is drawn
- `e2` is not drawn
