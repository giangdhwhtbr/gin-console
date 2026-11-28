# TC-QA-051: No test runs

- **REQ:** REQ-QA-019@f6b58234
- **Priority:** medium

**Preconditions:**
- Project `beta` whose export holds no run in the last 30 days

**Steps:**
1. Open `/tests?project=beta&tab=trends`

**Expected:**
- The tab reads "No test runs in the last 30 days."
- No chart is shown
