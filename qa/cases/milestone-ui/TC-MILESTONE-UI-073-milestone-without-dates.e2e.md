# TC-MILESTONE-UI-073: Milestone without dates

- **REQ:** REQ-MILESTONE-UI-001@edeac124
- **Priority:** high

**Preconditions:**
- Project `P` whose `milestone list` reports M1 (active) and M4 with `start: null`, `end: null` and `error` "M4 has no start/end metadata"

**Steps:**
1. Open `/milestones?project=P`

**Expected:**
- M1 is shown normally
- M4 shows "No dates"
- M4 shows "M4 has no start/end metadata"
