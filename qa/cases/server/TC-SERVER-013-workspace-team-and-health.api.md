# TC-SERVER-013: Workspace, team and health

- **REQ:** REQ-SERVER-005@6625fe31
- **Priority:** high

**Preconditions:**
- Project `alpha` exists
- `gin state --format json` run in `alpha` reports a workspace with 8 repos
- It reports `team.enabled` true with host `github`, `decision` `hold`, the warning "event log unreadable" and one review waiver

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects`

**Expected:**
- The `workflow` of `alpha` carries the 8 repos
- It carries the team, `decision` `hold`, the warning and the waiver
