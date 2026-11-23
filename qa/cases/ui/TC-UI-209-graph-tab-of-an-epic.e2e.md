# TC-UI-209: Graph tab of an epic

- **REQ:** REQ-UI-106@9683653c
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** e534d276

**Preconditions:**
- Project `p` has epic `e-1` with tasks `a` and `b`

**Steps:**
1. Open `/beads/p/e-1?tab=graph`

**Expected:**
- The Graph view is drawn with `e-1` as its scope
- `a` and `b` are nodes
- No node is selected
- No details panel is shown
