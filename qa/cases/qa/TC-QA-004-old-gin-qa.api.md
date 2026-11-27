# TC-QA-004: Old gin-qa

- **REQ:** REQ-QA-002@a7a439ce
- **Priority:** high

**Preconditions:**
- A `gin-qa` whose export has cases without `effective_result`

**Steps:**
1. Send `GET /api/qa/cases?project=alpha`
2. Send `GET /api/qa/cases/alpha/TC-UI-001`

**Expected:**
- Both responses are 502 with the cause `outdated`
