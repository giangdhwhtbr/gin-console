# TC-MILESTONE-UI-068: Beads tab

- **REQ:** REQ-MILESTONE-UI-018@85c83880
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 90d8c35c

**Preconditions:**
- Project `p` with milestone `m2` that has epics `e1` and `e2`, and a bead `x` under milestone `m3`

**Steps:**
1. Open `/milestones/p/m2?tab=beads`

**Expected:**
- The List view shows `e1` and `e2` and not `x`
- There is no Milestone filter: the filter bar has no `button "Milestone"` and no chip `Milestone <title>`, and starts with the search box, `Status`, `Assignee` and `More filters`
