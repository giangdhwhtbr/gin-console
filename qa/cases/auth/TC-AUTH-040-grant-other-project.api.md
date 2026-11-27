# TC-AUTH-040: Grant other project

- **REQ:** REQ-AUTH-016@d91a919b
- **Priority:** high

**Preconditions:**
- `an`'s grant; project `b`, which `an` may not see

**Steps:**
1. Request `/api/requirements/mockups/b/g/<grant>/files/...`

**Expected:**
- The response is 404
