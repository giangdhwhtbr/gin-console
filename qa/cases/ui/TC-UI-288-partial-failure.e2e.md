# TC-UI-288: Failure shows the error with Retry

- **REQ:** REQ-UI-093@e7ea75ab
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-23T10-34-33
- **Checked:** 1998e8f3

**Preconditions:**
- The report request answers 502 with an `error`
- The window is 900px wide, so the page shows its tab list

**Test data:**
- None

**Steps:**
1. Open `/reports?project=alpha&tab=delivery`
2. Press Retry

**Expected:**
- After step 1 the page shows the error with a Retry button
- After step 2 the report is requested again
