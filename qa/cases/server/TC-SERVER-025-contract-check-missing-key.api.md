# TC-SERVER-025: Contract check missing key

- **REQ:** REQ-SERVER-013@e810d9f2
- **Priority:** medium

**Preconditions:**
- A `gin milestone list` output whose first milestone has no `id`

**Steps:**
1. Run `check-contract`

**Expected:**
- The call prints `missing: milestones[0].id`
- The exit status is 1
