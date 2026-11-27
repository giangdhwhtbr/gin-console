# TC-MILESTONE-UI-129: Weeks across a year end

- **REQ:** REQ-MILESTONE-UI-036@08976195
- **Priority:** medium

**Preconditions:**
- Project `example` with an open milestone from 2026-12-21 to 2027-01-15 and no other bar

**Test data:**
- Today: 2026-12-21

**Steps:**
1. Open `/milestones?project=example&zoom=weeks`

**Expected:**
- The axis header reads "21 Dec", "28 Dec", "4 Jan" and "11 Jan"
- The 6 weekend days of the axis are shaded
