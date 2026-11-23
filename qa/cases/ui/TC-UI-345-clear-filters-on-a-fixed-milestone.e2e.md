# TC-UI-345: Clear filters on a fixed milestone

- **REQ:** REQ-UI-143@b65838eb
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 41c3d0c5

**Preconditions:**
- Project `p` has milestone `m2` with beads
- Window 1440px wide

**Steps:**
1. Open `/milestones/p/m2?tab=beads&status=open`
2. Click `button "Clear filters"`

**Expected:**
- The URL is `/milestones/p/m2?tab=beads`
- The beads of `m2` are shown
