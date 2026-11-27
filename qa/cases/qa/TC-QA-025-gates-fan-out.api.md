# TC-QA-025: Gates fan out

- **REQ:** REQ-QA-009@ae4c97e1
- **Priority:** medium

**Preconditions:**
- Milestone `m4` with ten epics and no kept gates

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m4`
2. Send it again within 60 seconds

**Expected:**
- No more than four `gin state` processes ran at a time and each epic's ran once
- The second answer started no `gin state`
