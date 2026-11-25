# TC-OVERVIEW-024: Bounded requests

- **REQ:** REQ-OVERVIEW-008@9fc51ce2
- **Priority:** high

**Preconditions:**
- 14 epics are in progress; each workflow request stays open for a short time

**Steps:**
1. Open `/`
2. Wait until all workflow requests have ended

**Expected:**
- At most 4 workflow requests were open at any time
- All 14 were requested
