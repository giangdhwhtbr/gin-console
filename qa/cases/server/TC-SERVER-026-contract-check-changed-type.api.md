# TC-SERVER-026: Contract check changed type

- **REQ:** REQ-SERVER-013@e810d9f2
- **Priority:** medium

**Preconditions:**
- A `gin state` output whose `stage` is a number

**Steps:**
1. Run `check-contract`

**Expected:**
- The call prints a type error naming `stage`
- The exit status is 1
