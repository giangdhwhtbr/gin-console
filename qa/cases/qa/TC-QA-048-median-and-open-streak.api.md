# TC-QA-048: Median and open streak

- **REQ:** REQ-QA-017@ebb7bd87
- **Priority:** medium

**Preconditions:**
- `TC-UI-001` failed at 10:00 and 11:00 and passed at 13:00
- `TC-UI-003` failed at 09:00 and passed at 09:30
- `TC-BEADS-001` failed at 12:00 with `bug` `gin-console-3kd` and has not run since

**Steps:**
1. Send `GET /api/qa/trends/alpha`

**Expected:**
- `time_to_fix.overall` has `fixes` 2 and `median_seconds` 6300
- `still_failing` holds `TC-BEADS-001` since 12:00 with `bug` `gin-console-3kd`
