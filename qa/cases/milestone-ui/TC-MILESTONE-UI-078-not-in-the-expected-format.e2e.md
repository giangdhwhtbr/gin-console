# TC-MILESTONE-UI-078: Not in the expected format

- **REQ:** REQ-MILESTONE-UI-019@0190d380
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `p` with a comment `[gin retro] m1 chi` with no `Went well:`, `Slowed us:` or `Change next:`

**Test data:**
- None

**Steps:**
1. Open `/milestones/p/m1?tab=retro`

**Expected:**
- chi's comment is shown in full with "Not in the expected format"
