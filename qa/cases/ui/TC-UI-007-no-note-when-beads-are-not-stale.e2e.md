# TC-UI-007: No note when beads are not stale

- **REQ:** REQ-UI-103@5ebe1b9b
- **Priority:** medium

**Preconditions:**
- Project A whose `beads` has no `stale` key, or `stale: false`

**Steps:**
1. Open /beads?project=A

**Expected:**
- No "may be out of date" note is shown
