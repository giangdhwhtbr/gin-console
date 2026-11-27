# TC-MILESTONE-UI-125: Milestone and its epics on the Timeline

- **REQ:** REQ-MILESTONE-UI-035@9f3f2236
- **Priority:** high

**Preconditions:**
- Project `example` whose `milestone list` reports milestone `ex-m2` "Beta readiness" (active, 16 Nov to 4 Dec 2026), a `forecast.milestones` entry for `ex-m2` finishing 2027-07-02, and `forecast.epics` holding `ex-e13` "Multi-currency pricing" of `ex-m2`, planned 2026-12-11 to 2027-02-02, `remaining_days` 38, `lane` 1, with an `overflow` warning of 42 days

**Test data:**
- Today: 2026-11-26
- Zoom: Months (6 px a day)

**Steps:**
1. Open `/milestones?project=example`

**Expected:**
- The `ex-m2` row has a bar from 16 Nov to 4 Dec (19 days, 114 px wide)
- A hatched part follows that bar from 5 Dec to 2 Jul (210 days, 1260 px wide)
- The `ex-e13` row reads "Lane 1" and "38 d left" and shows a warning icon
- The bar of `ex-e13` is named "Multi-currency pricing: planned 11 Dec – 2 Feb, 38 days left, 42 days over"
