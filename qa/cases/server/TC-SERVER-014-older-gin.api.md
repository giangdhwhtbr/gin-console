# TC-SERVER-014: Older gin

- **REQ:** REQ-SERVER-005@6625fe31
- **Priority:** high

**Preconditions:**
- Project `alpha` exists
- `gin state --format json` run in `alpha` has no `workspace`, `team`, `decision`, `warnings`, `remedies` or `review_waivers`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- `workflow.workspace` of `alpha` is `null`
- `team` is `null`
- `decision` is `null`
- `warnings`, `remedies` and `review_waivers` are empty lists
