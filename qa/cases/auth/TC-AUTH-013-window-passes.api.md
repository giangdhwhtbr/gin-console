# TC-AUTH-013: Window passes

- **REQ:** REQ-AUTH-004@cb660bf4
- **Priority:** medium

**Preconditions:**
- `an` locked by 5 failures

**Steps:**
1. Wait until the window has passed since the oldest failure
2. Post `an` with the right password

**Expected:**
- The sign-in succeeds
