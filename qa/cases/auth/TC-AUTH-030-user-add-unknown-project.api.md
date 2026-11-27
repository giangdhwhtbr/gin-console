# TC-AUTH-030: User add unknown project

- **REQ:** REQ-AUTH-010@ae8b41d8
- **Priority:** high

**Preconditions:**
- No project `ghost`

**Steps:**
1. Run `user add an --email an@x.io --project ghost`

**Expected:**
- It exits 1 and the error names `ghost`
- The users file is unchanged
