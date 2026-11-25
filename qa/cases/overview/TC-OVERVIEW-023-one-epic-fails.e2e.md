# TC-OVERVIEW-023: One epic fails

- **REQ:** REQ-OVERVIEW-008@9fc51ce2
- **Priority:** high

**Preconditions:**
- In-progress epic `e-3` has a workflow request that answers 502; the other epics answer

**Steps:**
1. Open `/`
2. Wait until all requests have ended

**Expected:**
- "Could not read gates" names `e-3` and the error
- The count of "Gates not met" leaves `e-3` out
