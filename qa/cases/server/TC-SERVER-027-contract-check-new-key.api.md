# TC-SERVER-027: Contract check new key

- **REQ:** REQ-SERVER-013@e810d9f2
- **Priority:** medium

**Preconditions:**
- A `gin specs trace` output with an extra key in a requirement

**Steps:**
1. Run `check-contract`

**Expected:**
- The call prints `ok` and the extra key as a note
- The exit status is 0
