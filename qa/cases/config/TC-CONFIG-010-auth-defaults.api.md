# TC-CONFIG-010: Auth defaults

- **REQ:** REQ-CONFIG-009@4632dd85
- **Priority:** high

**Preconditions:**
- A config without an `auth` section

**Steps:**
1. Start the console

**Expected:**
- Auth is off
- The session TTL is 12 hours
- The limits are 5 per user and 20 per IP in 15 minutes
