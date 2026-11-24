# TC-MILESTONE-UI-086: Forecast and lanes

- **REQ:** REQ-MILESTONE-UI-008@1d2ab3ad
- **Priority:** medium

**Preconditions:**
- Project `P` whose `milestone list` prints M1 with `lanes: 2` and a `forecast` with `deadline: 2026-12-31`, `lanes: 1`, `start: 2026-11-08`, `finish: 2026-12-23`, `overflow_days: 0`, `open_epics: 5`, `unestimated: 1`, `error: null`

**Test data:**
- None

**Steps:**
1. Request `GET /api/milestones?project=P`

**Expected:**
- The response carries M1 with `lanes: 2`
- The `forecast` is unchanged
