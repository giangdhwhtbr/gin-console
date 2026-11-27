# TC-CONFIG-011: Auth enabled without users

- **REQ:** REQ-CONFIG-009@4632dd85
- **Priority:** high

**Preconditions:**
- A config with `auth: {enabled: true}` and no users file

**Steps:**
1. Start the console

**Expected:**
- The console exits with a non-zero status
- The message names the users file
