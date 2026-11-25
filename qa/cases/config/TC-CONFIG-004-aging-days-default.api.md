# TC-CONFIG-004: Aging days default

- **REQ:** REQ-CONFIG-007@1af613a6
- **Priority:** medium

**Preconditions:**
- A config without an `overview` section

**Steps:**
1. Start the console
2. Request `GET /api/overview`

**Expected:**
- `aging_days` is 3
