# TC-UI-274: Calendar day across time zones

- **REQ:** REQ-UI-131@c08d8d6a
- **Priority:** medium

**Preconditions:**
- Milestone `m1` of project `alpha` has `end` 2026-12-01
- The browser time zone is America/Los_Angeles

**Steps:**
1. Open `/milestones?project=alpha`

**Expected:**
- The end of `m1` reads "1 Dec", not "30 Nov"
