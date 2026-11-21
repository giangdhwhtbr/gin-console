# TC-UI-209: Graph tab of an epic

- **REQ:** REQ-UI-106@aef48e9b
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-21T05-35-36
- **Checked:** 6d4895f3

**Preconditions:**
- Project `p` has epic `e-1` with tasks `a` and `b`

**Steps:**
1. Open `/beads/p/e-1?tab=graph`

**Expected:**
- The Graph view is drawn with `e-1` as its scope
- `a` and `b` are nodes
- No node is selected
- No details panel is shown
