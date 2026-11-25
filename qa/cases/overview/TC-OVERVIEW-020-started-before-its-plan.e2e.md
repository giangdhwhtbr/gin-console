# TC-OVERVIEW-020: Started before its plan

- **REQ:** REQ-OVERVIEW-008@9fc51ce2
- **Priority:** high

**Preconditions:**
- Project `a` has in-progress epic `e-1` with `plan_approved` `unmet` and in-progress epic `e-2` with only `implementation_complete` and `shipped` `unmet`

**Steps:**
1. Open `/`
2. Wait until the gates are read

**Expected:**
- "Gates not met (1)" lists `e-1` with `plan_approved`
- `e-2` is not listed
