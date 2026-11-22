# TC-UI-030: Team headline

- **REQ:** REQ-UI-095@1912887f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-22T04-57-11
- **Checked:** 08ea52fc

**Preconditions:**
- The team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open the Delivery tab

**Expected:**
- The Team headline reads "27 of 64 done, on pace" without a warning icon
