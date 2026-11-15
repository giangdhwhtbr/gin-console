# TC-MILESTONE-UI-077: Retro of another milestone

- **REQ:** REQ-MILESTONE-UI-019@0190d380
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `p` with a comment `[gin retro] m2 ann` on its bead

**Test data:**
- None

**Steps:**
1. Open `/milestones/p/m1?tab=retro`

**Expected:**
- The comment of `m2` is not counted or shown
