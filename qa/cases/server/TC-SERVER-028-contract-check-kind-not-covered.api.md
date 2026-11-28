# TC-SERVER-028: Contract check kind not covered

- **REQ:** REQ-SERVER-013@e810d9f2
- **Priority:** medium

**Preconditions:**
- A project with capability epics only

**Steps:**
1. Run `check-contract`

**Expected:**
- `technical` and `parity` are reported as `not covered`
- The exit status is 0
