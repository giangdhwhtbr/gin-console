# TC-AUTH-014: Success resets the user

- **REQ:** REQ-AUTH-004@cb660bf4
- **Priority:** medium

**Preconditions:**
- 4 failed sign-ins as `an`

**Steps:**
1. Sign in as `an` with the right password
2. Fail 4 more times
3. Post a fifth failure

**Expected:**
- The fifth attempt is checked and answers 401, not 429
