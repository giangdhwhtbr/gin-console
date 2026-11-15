# TC-MILESTONE-UI-080: Retro tab failure

- **REQ:** REQ-MILESTONE-UI-019@0190d380
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `p` whose `GET /api/beads/p/m1/comments` answers 502 and then 200

**Test data:**
- None

**Steps:**
1. Open `/milestones/p/m1?tab=retro`
2. Press Retry

**Expected:**
- After step 1 the tab shows the error with a Retry button
- After step 2 the tab shows the retros
