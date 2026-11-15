# TC-SERVER-012: Workflow state present

- **REQ:** REQ-SERVER-005@6625fe31
- **Priority:** high

**Preconditions:**
- Project `alpha` exists
- `gin state --format json` run in `alpha` reports stage `discuss` and five gates

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `alpha` has a `workflow` with `stage` `discuss`
- `workflow.gates` has the five gates with their states
