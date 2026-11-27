# TC-AUTH-054: Malformed grant

- **REQ:** REQ-AUTH-016@9b0a0c99
- **Priority:** medium

**Preconditions:**
- Auth is on; user `an` is signed in and allowed project `a`, with a confirmed folder `ui/2026-11-22`

**Steps:**
1. Request the grant path of `ui/2026-11-22` with the grant `abc`
2. Request it with the valid grant id and a wrong mac
3. Request it with the session token as the grant

**Expected:**
- Each response is 404
