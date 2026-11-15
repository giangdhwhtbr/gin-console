# TC-MILESTONE-UI-082: Older gin-workflow header

- **REQ:** REQ-MILESTONE-UI-020@9d4f8585
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `p` whose `show` output has no `integration`, `deadline` or `away` key

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/p/m1`

**Expected:**
- The header shows no Integration, Deadline or Away
- The rest of the header is unchanged
