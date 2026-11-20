# TC-SERVER-015: Stage of an epic in progress

- **REQ:** REQ-SERVER-006@8dcdf4d5
- **Priority:** high

**Preconditions:**
- Project `alpha` has in_progress epic `e-1` and ready epic `e-2`
- `gin state --workflow-id e-1 --format json` reports stage `execute`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `e-1` has `status` `in_progress` and `workflow.stage` `execute`
- `e-2` has `status` `open` and no `workflow`
- No `gin state` ran for `e-2`
