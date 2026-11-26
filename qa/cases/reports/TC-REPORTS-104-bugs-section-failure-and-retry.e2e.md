# TC-REPORTS-104: Bugs section failure and retry

- **REQ:** REQ-REPORTS-044@0fa589cf
- **Priority:** medium

**Preconditions:**
- Project `alpha`; `GET /api/reports/bugs` answers 502 once, then 200 with a report

**Test data:**
- None

**Steps:**
1. Open `/reports/bugs?project=alpha&days=30`
2. Press Retry

**Expected:**
- After step 1, a loading state is shown first, then the error "The bugs report could not be loaded" with a Retry button
- After step 2, the Bugs section shows the report and the error is gone
