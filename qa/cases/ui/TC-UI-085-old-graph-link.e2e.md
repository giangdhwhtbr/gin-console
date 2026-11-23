# TC-UI-085: Old Graph link

- **REQ:** REQ-UI-030@0f5a1d68
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** c968f2c8

**Preconditions:**
- Project `a` with an epic `e-1` that has tasks, and other open beads

**Steps:**
1. Open `/beads?project=a&view=graph&epic=e-1`

**Expected:**
- The Graph view is shown
- `epic` is ignored
