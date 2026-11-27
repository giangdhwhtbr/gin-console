# TC-AUTH-028: Broken users file

- **REQ:** REQ-AUTH-009@b203dbad
- **Priority:** medium

**Preconditions:**
- A signed-in user; the users file is edited into invalid YAML

**Steps:**
1. Request an API route

**Expected:**
- The last valid users still apply
- One error naming the file is logged
