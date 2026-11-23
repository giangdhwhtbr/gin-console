# TC-MILESTONE-UI-111: Parallel lanes and finish in the list

- **REQ:** REQ-MILESTONE-UI-001@6e63a57f
- **Priority:** medium
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 5923c786

**Preconditions:**
- Project `P` whose `milestone list` reports M1 with `lanes: 2`, `end: 2026-11-12`, `finish: 2026-11-23`, and M2 with `lanes: 1`, `end: 2026-12-04`, `finish: 2026-12-01`
- The browser clock is set to 21 Nov 2026

**Test data:**
- None

**Steps:**
1. Set the window width to 1280 px
2. Open `/milestones?project=P`

**Expected:**
- The columns are headed Status, Milestone, Period, Parallel lanes, Commitment met, Epics and Warnings
- M1 shows "2 lanes" and "Finishes 23 Nov" in the warning color (M1 is late by REQ-MILESTONE-UI-023)
- M2 shows "1 lane" and "Finishes 1 Dec" without the warning color
