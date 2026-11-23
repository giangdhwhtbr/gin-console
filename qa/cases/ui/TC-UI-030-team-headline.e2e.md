# TC-UI-030: Team headline

- **REQ:** REQ-UI-095@78603446
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T03-27-52
- **Checked:** 06926132

**Preconditions:**
- The team report of an open milestone with 27 of 64 beads closed, `pace` 3.6 and `pace_needed` 3.4, whose forecast `finish` is before its `end`
- The window is 900px wide, so the sidebar lists no report sections and the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open the Delivery tab

**Expected:**
- The Team headline reads "27 of 64 done, on pace" without a warning icon
