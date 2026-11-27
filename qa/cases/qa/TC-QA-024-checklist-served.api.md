# TC-QA-024: Checklist served

- **REQ:** REQ-QA-009@ae4c97e1
- **Priority:** high

**Preconditions:**
- Milestone `m2` of `alpha` with three epics

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m2`

**Expected:**
- The response is 200 with the milestone, three epics, `generated_at`, a verdict and the items `cases`, `results`, `bugs` and `gates` in that order
