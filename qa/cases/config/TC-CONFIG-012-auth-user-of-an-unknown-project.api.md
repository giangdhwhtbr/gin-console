# TC-CONFIG-012: Auth user of an unknown project

- **REQ:** REQ-CONFIG-009@4632dd85
- **Priority:** high

**Preconditions:**
- Auth enabled; the users file holds a user assigned to `ghost`, which is not in `projects`

**Steps:**
1. Start the console

**Expected:**
- The console exits with a non-zero status
- The message names `ghost`
