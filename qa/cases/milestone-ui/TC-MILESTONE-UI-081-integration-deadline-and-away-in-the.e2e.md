# TC-MILESTONE-UI-081: Integration, deadline and away in the header

- **REQ:** REQ-MILESTONE-UI-020@9d4f8585
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `p` whose `show` output has `integration: 2026-11-24`, `deadline: 2026-11-28` and `away: {"ann": ["2026-11-18..2026-11-20"], "bao": ["2026-11-25"]}`

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones/p/m1`

**Expected:**
- The header shows "Integration 24 Nov"
- The header shows "Deadline 28 Nov"
- The header shows "Away: ann 18–20 Nov, bao 25 Nov"
