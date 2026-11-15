# TC-MILESTONE-UI-068: Beads tab

- **REQ:** REQ-MILESTONE-UI-018@03e47834
- **Priority:** high

**Preconditions:**
- Project `p` with milestone `m2` that has epics `e1` and `e2`, and a bead `x` under milestone `m3`

**Steps:**
1. Open `/milestones/p/m2?tab=beads`

**Expected:**
- The List view shows `e1` and `e2` and not `x`
- There is no Milestone select
