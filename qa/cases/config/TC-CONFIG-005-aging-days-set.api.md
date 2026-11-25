# TC-CONFIG-005: Aging days set

- **REQ:** REQ-CONFIG-007@1af613a6
- **Priority:** medium

**Preconditions:**
- A config with `overview: {aging_days: 5}`

**Steps:**
1. Start the console
2. Request `GET /api/overview`

**Expected:**
- `aging_days` is 5
