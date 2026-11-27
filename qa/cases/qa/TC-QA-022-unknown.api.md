# TC-QA-022: Unknown

- **REQ:** REQ-QA-008@9734b99b
- **Priority:** high

**Preconditions:**
- Milestone `m2` with no open P0 or P1 bug, every gate of `e1` satisfied, a `gin state` of `e2` that fails, and a console host without `gin-qa`

**Steps:**
1. Send `GET /api/qa/readiness/alpha/m2`

**Expected:**
- `cases` and `results` are `unknown`, `bugs` passes
- `gates` is `unknown` listing `e2` as `unknown`
- The verdict is `unknown`
