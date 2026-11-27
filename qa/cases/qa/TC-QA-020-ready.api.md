# TC-QA-020: Ready

- **REQ:** REQ-QA-008@9734b99b
- **Priority:** high

**Preconditions:**
- Milestone `m1` whose cases are all `passed`, every requirement with a case, no open P0 or P1 bug in scope, and both epics with every gate `satisfied` but `plan_approved` of one `waived(spike only)`

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m1`

**Expected:**
- The four items pass and the verdict is `ready`
