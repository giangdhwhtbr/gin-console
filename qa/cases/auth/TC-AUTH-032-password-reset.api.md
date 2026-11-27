# TC-AUTH-032: Password reset

- **REQ:** REQ-AUTH-011@9e38127d
- **Priority:** high

**Preconditions:**
- User `an` with password `P`

**Steps:**
1. Run `user passwd an`
2. Sign in with the new password
3. Sign in with `P`

**Expected:**
- A new password is printed
- The new password signs in
- `P` does not
