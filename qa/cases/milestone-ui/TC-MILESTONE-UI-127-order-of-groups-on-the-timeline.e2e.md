# TC-MILESTONE-UI-127: Order of groups on the Timeline

- **REQ:** REQ-MILESTONE-UI-035@9f3f2236
- **Priority:** medium

**Preconditions:**
- Project `example` with closed milestone `m0` "Discovery", chained milestones `m2` "Second" and `m3` "Third" in that order of `forecast.milestones` (`m3` starts before `m2`), open milestone `m4` "Fourth" outside the chain, and one forecast epic "Loose epic" without a milestone

**Test data:**
- Today: 2026-11-26

**Steps:**
1. Open `/milestones?project=example&closed=1`

**Expected:**
- The groups are, from the top: Discovery, Second, Third, Fourth and "Not in a milestone"
- "Loose epic" is the row of "Not in a milestone"
