# TC-SERVER-016: One epic fails

- **REQ:** REQ-SERVER-006@ea632040
- **Priority:** high

**Preconditions:**
- Project `alpha` has in_progress epics `e-1` and `e-3`
- `gin state --workflow-id e-1 --format json` succeeds
- `gin state --workflow-id e-3 --format json` exits non-zero

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `e-1` has its `workflow`
- `e-3` has `workflow` `{"error": …}`
- The rest of `alpha` is unchanged
