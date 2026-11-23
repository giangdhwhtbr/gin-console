# TC-UI-274: Calendar day across time zones

- **REQ:** REQ-UI-131@c08d8d6a
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 811e4b72

**Preconditions:**
- Milestone `m1` of project `alpha` has `end` 2026-12-01
- The browser time zone is America/Los_Angeles

**Steps:**
1. Open `/milestones?project=alpha`

**Expected:**
- The end of `m1` reads "1 Dec", not "30 Nov"
