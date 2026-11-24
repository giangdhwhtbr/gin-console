# TC-REPORTS-084: Status section heading, verdict panel and five KPI figures

- **REQ:** REQ-REPORTS-028@273b3583
- **Priority:** high

**Preconditions:**
- Active milestone `m2` "Checkout v2" from 11 Nov to 2 Dec on working day 8 of 16, verdict "At risk"
- `kpis`: beads `{done: 13, scope: 35, done_week_ago: 7}`, points `{done: 0, scope: 27, at_kickoff: 24}`, pace `{pace: 2.0, pace_needed: 2.8}`, blocked `{count: 2, oldest_days: 4}`, rework `{rate: 0.31, rate_week_ago: 0.18}`

**Test data:**
- None

**Steps:**
1. Open `/reports/status?project=alpha&milestone=m2`

**Expected:**
- The heading reads "Checkout v2" and the subtitle reads "Milestone report, 11 Nov – 2 Dec. Working day 8 of 16."
- The verdict panel shows "At risk" in the warning colour on a warning wash
- The five figures read: "13 of 35" ("+6 this week"), "0 of 27" ("+3 added after kickoff"), "2.0 a day" ("needs 2.8 to end on 2 Dec"), "2" ("oldest waiting 4 days"), and "31%" ("up from 18% last week")
