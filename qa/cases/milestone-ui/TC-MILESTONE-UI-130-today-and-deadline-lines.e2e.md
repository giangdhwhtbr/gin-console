# TC-MILESTONE-UI-130: Today and deadline lines

- **REQ:** REQ-MILESTONE-UI-036@08976195
- **Priority:** high

**Preconditions:**
- Project `example` with milestone `ex-m1` (active, 5 Oct 2026 to 8 Jan 2027) and a `forecast` with `deadline` 2026-12-11 and `finish` 2027-06-30

**Test data:**
- Today: 2026-11-26
- Zoom: Months (6 px a day)
- Window width: 1280 px

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=example`

**Expected:**
- A line with "Today" stands on 26 Nov and a line with "Deadline" stands on 11 Dec, 15 days (90 px) to its right
- The Timeline is scrolled so that the Today line is 40 px to the right of the label column
