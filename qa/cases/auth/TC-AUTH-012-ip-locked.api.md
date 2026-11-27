# TC-AUTH-012: IP locked

- **REQ:** REQ-AUTH-004@cb660bf4
- **Priority:** high

**Preconditions:**
- `per_ip` 20; 20 failed sign-ins from one IP for different usernames

**Steps:**
1. Post any user with the right password from that IP

**Expected:**
- The response is 429
