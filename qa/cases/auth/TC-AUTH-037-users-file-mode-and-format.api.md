# TC-AUTH-037: Users file mode and format

- **REQ:** REQ-AUTH-013@a5561620
- **Priority:** high

**Preconditions:**
- No users file

**Steps:**
1. Run `user add an --email an@x.io --all-projects`

**Expected:**
- The file has mode `0600`
- `an`'s `password_hash` starts with `scrypt$16384$8$1$`
