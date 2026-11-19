# TC-MILESTONE-UI-091: Older gin-workflow without velocity

- **REQ:** REQ-MILESTONE-UI-021@0b96b90c
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `P` whose `milestone show` output has no `velocity` key

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/P/m1`

**Expected:**
- The header shows no velocity
- The rest of the header is unchanged
