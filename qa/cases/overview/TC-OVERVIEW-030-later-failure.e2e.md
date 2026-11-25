# TC-OVERVIEW-030: Later failure

- **REQ:** REQ-OVERVIEW-010@e311d5a8
- **Priority:** high

**Preconditions:**
- The lists are shown and the next `GET /api/overview` fails

**Steps:**
1. Open `/`
2. Wait 10 seconds

**Expected:**
- The lists stay
- An alert shows the error
