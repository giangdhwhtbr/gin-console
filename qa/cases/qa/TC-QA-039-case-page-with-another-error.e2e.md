# TC-QA-039: Case page with another error

- **REQ:** REQ-QA-013@019c08c4
- **Priority:** medium

**Preconditions:**
- The case request answers 502 with an error and no cause

**Steps:**
1. Open `/tests/alpha/TC-UI-115`

**Expected:**
- The page shows the error and a "Try again" control, and no case content
