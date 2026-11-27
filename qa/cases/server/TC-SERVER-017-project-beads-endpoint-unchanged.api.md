# TC-SERVER-017: Project beads endpoint unchanged

- **REQ:** REQ-SERVER-006@ec9c5c6d
- **Priority:** high
- **Result:** passed
- **Run:** qa/evidence/2026-11-26T14-14-56-api
- **Checked:** 711ebabe

**Preconditions:**
- Project `alpha` has in_progress epic `e-1`

**Test data:**
- None

**Steps:**
1. Send `GET /api/projects/beads`

**Expected:**
- `e-1` has `id`, `title` and `status` and no `workflow`
- No `gin state` ran
