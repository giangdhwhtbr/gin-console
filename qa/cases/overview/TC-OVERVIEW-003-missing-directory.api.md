# TC-OVERVIEW-003: Missing directory

- **REQ:** REQ-OVERVIEW-001@ff4db4a2
- **Priority:** medium

**Preconditions:**
- A configured project whose directory does not exist

**Steps:**
1. Request `GET /api/overview`

**Expected:**
- The response is 200
- The `error` of that project says the directory does not exist
