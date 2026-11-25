# TC-CONFIG-006: Aging days invalid

- **REQ:** REQ-CONFIG-007@1af613a6
- **Priority:** medium

**Preconditions:**
- A config with `overview: {aging_days: 0}`

**Test data:**
- Other invalid values: `-1`, `2.5`, `'3'`, `true`, `abc`

**Steps:**
1. Start the console

**Expected:**
- The console exits with a non-zero status
- The message names `overview.aging_days`
