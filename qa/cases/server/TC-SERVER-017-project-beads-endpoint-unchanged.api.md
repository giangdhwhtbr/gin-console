# TC-SERVER-017: Project beads endpoint unchanged

- **REQ:** REQ-SERVER-006@8dcdf4d5
- **Priority:** high

**Preconditions:**
- Project `alpha` has in_progress epic `e-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `e-1` has `id`, `title` and `status` and no `workflow`
- No `gin state` ran
