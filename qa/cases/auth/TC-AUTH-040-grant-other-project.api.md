# TC-AUTH-040: Grant other project

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** high

**Preconditions:**
- `an`'s grant of a folder of `a` from the mockup list; project `b`, which `an` may not see

**Steps:**
1. Request `/api/requirements/mockups/b/g/<grant>/files/...`

**Expected:**
- The response is 404
