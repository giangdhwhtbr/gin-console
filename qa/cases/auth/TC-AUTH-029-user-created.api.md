# TC-AUTH-029: User created

- **REQ:** REQ-AUTH-010@ae8b41d8
- **Priority:** high

**Preconditions:**
- Project `a` in the config; no user `an`

**Steps:**
1. Run `user add an --email an@x.io --project a`
2. Sign in as `an` with the printed password

**Expected:**
- The users file holds `an` with a `scrypt$` hash
- The password is printed once on standard output and exit code is 0
- The printed password signs in
