# TC-QA-021: Not run, failed and blocked

- **REQ:** REQ-QA-008@9734b99b
- **Priority:** medium

**Preconditions:**
- A milestone whose cases are `TC-1` (`not run`), `TC-2` (`failed`, bug `b-7`) and `TC-3` (`blocked`)

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m2`

**Expected:**
- `results` fails listing the three cases, `TC-2` with `b-7`
