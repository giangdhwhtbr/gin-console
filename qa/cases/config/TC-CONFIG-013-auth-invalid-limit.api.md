# TC-CONFIG-013: Auth invalid limit

- **REQ:** REQ-CONFIG-009@4632dd85
- **Priority:** medium

**Preconditions:**
- A config with `auth: {rate_limit: {per_user: 0}}`

**Test data:**
- Other invalid values: `session_ttl: 1m`, `rate_limit.window: 30s`, `rate_limit.per_ip: 2.5`

**Steps:**
1. Start the console

**Expected:**
- The console exits with a non-zero status
- The message names `auth.rate_limit.per_user`
